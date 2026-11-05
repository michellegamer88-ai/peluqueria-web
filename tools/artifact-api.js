/* Conexión de la DEMO publicada en claude.ai: la IA la pone Claude (capacidad "sample")
   y los contactos se guardan en la base de datos de la página ("db").
   La web del salón no usa este archivo: allí trabaja con los .php y Gemini. */
(function () {
  "use strict";
  var KB = window.__AURUM_KB__ || "";
  var INSTR = window.__AURUM_LECTOR__ || "";
  var use = function (n) { return (window.claude && window.claude.use) ? window.claude.use(n).catch(function () { return null; }) : Promise.resolve(null); };

  function aiErr(e) {
    var c = e && e.code;
    if (c === "rate_limited") return "rate_min";
    if (c === "not_granted" || c === "images_unavailable" || c === "unavailable") return "no_ia";
    return "ia";
  }

  // PDF -> imagen de la primera página (pdf.js se carga solo si hace falta)
  var pdfReady = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function pdfToImage(file) {
    if (!pdfReady) {
      var base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
      pdfReady = loadScript(base + "pdf.min.js").then(function () { return loadScript(base + "pdf.worker.min.js"); });
    }
    return pdfReady.then(function () { return file.arrayBuffer(); }).then(function (buf) {
      return window.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (pdf) { return pdf.getPage(1); }).then(function (page) {
      var vp0 = page.getViewport({ scale: 1 }), k = Math.min(2, 1600 / Math.max(vp0.width, vp0.height)), vp = page.getViewport({ scale: k });
      var cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      return page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise.then(function () {
        return new Promise(function (res) { cv.toBlob(res, "image/jpeg", 0.9); });
      });
    });
  }

  // Validación: lo que no encaja se queda en null (nunca inventamos)
  function en(v, ok) { v = typeof v === "string" ? v.trim().toLowerCase() : null; return ok.indexOf(v) >= 0 ? v : null; }
  function txt(v, m) { return (typeof v === "string" && v.trim()) ? v.trim().slice(0, m || 160) : null; }
  function hex(v) { return (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim())) ? v.trim().toUpperCase() : null; }
  function bol(v) { return typeof v === "boolean" ? v : null; }
  function num(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return v >= 0 && isFinite(v) ? Math.round(v * 100) / 100 : null;
    var s = String(v).replace(/[\s€]|EUR/g, "");
    s = (s.indexOf(",") >= 0 && s.indexOf(".") < 0) ? s.replace(",", ".") : s.replace(/,/g, "");
    var n = parseFloat(s); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  }
  function normalize(p) {
    var dg = p.diagnostico || {}, gs = p.gasto || {}, rc = p.recomendacion || {};
    var sc = dg.estado_puntuacion; sc = (typeof sc === "number" && sc >= 1 && sc <= 10) ? Math.round(sc) : null;
    var tipo = en(p.tipo_entrada, ["foto_cabello", "documento_gasto", "otro"]) || "otro";
    var out = {
      tipo_entrada: tipo,
      diagnostico: {
        tipo_cabello: en(dg.tipo_cabello, ["liso", "ondulado", "rizado", "afro"]), grosor: en(dg.grosor, ["fino", "medio", "grueso"]),
        longitud: en(dg.longitud, ["muy corto", "corto", "medio", "largo", "muy largo"]), color_actual: txt(dg.color_actual, 40), color_hex: hex(dg.color_hex),
        tenido: bol(dg["teñido"] != null ? dg["teñido"] : dg.tenido), estado_puntuacion: sc,
        danos: (Array.isArray(dg.danos) ? dg.danos : []).map(function (d) { return txt(d, 40); }).filter(Boolean).slice(0, 6),
        barba: bol(dg.barba), observaciones: txt(dg.observaciones, 220)
      },
      gasto: {
        gasto_total_eur: num(gs.gasto_total_eur), periodo: en(gs.periodo, ["visita", "mensual", "anual", "otro"]),
        conceptos: (Array.isArray(gs.conceptos) ? gs.conceptos : []).filter(function (c) { return c && txt(c.concepto, 60); }).slice(0, 12).map(function (c) { return { concepto: txt(c.concepto, 60), importe_eur: num(c.importe_eur) }; }),
        establecimiento: txt(gs.establecimiento, 60), fecha: txt(gs.fecha, 30)
      },
      recomendacion: {
        tratamiento: en(rc.tratamiento, ["hidratacion", "reconstruccion", "keratina", "anticaida", "color", "mantenimiento"]) || "mantenimiento",
        tratamiento_nombre: txt(rc.tratamiento_nombre, 60), motivo: txt(rc.motivo, 220), look_sugerido: txt(rc.look_sugerido, 60), descripcion_look: txt(rc.descripcion_look, 280),
        longitud_sugerida: en(rc.longitud_sugerida, ["muy corto", "corto", "medio", "largo"]), textura_sugerida: en(rc.textura_sugerida, ["liso", "ondulado", "rizado"]),
        color_sugerido_hex: hex(rc.color_sugerido_hex), flequillo: bol(rc.flequillo)
      }
    };
    if (tipo === "foto_cabello") out.gasto = { gasto_total_eur: null, periodo: null, conceptos: [], establecimiento: null, fecha: null };
    return out;
  }

  var dbP = null;
  function getDb() { if (!dbP) dbP = use("db"); return dbP; }

  window.__AURUM_API__ = {
    notSavedText: "(En esta demostración tu email no se guarda; en la web del salón quedaría en su panel de contactos.)",

    chat: function (body) {
      return use("sample").then(function (sample) {
        if (!sample) return { reply: "En esta vista no puedo responder. En la web del salón contesto al momento; mientras, escríbenos desde el formulario de contacto.", fallback: true };
        var conv = (body.history || []).map(function (h) { return (h.role === "model" ? "Ámbar: " : "Visitante: ") + h.text; }).join("\n");
        var prompt = KB + "\n\n# CONVERSACIÓN\n" + (conv ? conv + "\n" : "") + "Visitante: " + body.message +
          "\n\nEscribe SOLO la siguiente respuesta de Ámbar (sin el prefijo «Ámbar:»), en texto plano, 2 a 5 frases.";
        return sample(prompt, { modelTier: "quick", cache: false }).then(function (r) {
          return { reply: (r.text || "").replace(/^\s*Ámbar:\s*/i, "").trim() };
        }).catch(function (e) {
          return { reply: e && e.code === "rate_limited" ? "Vas muy rápido 🙂 Dame unos segundos y vuelve a preguntarme." : "Ahora mismo no puedo responder. Escríbenos desde el formulario de contacto y te ayudamos.", fallback: true };
        });
      });
    },

    analyze: function (fd, file) {
      return use("sample").then(function (sample) {
        if (!sample) return { ok: false, reason: "no_ia" };
        return sample.limits().catch(function () { return null; }).then(function (lim) {
          if (!lim || !lim.images) return { ok: false, reason: "no_ia" };
          var isPdf = /pdf/i.test(file.type) || /\.pdf$/i.test(file.name || "");
          var imgP = isPdf ? pdfToImage(file) : Promise.resolve(file);
          return imgP.then(function (img) {
            if (!img) return { ok: false, reason: "ia" };
            if (lim.images.mediaTypes && lim.images.mediaTypes.indexOf(img.type) < 0) return { ok: false, reason: "tipo" };
            return sample.json(INSTR + "\n\nLa imagen adjunta es " + (isPdf ? "la primera página de un PDF subido por el visitante." : "la foto o captura que ha subido el visitante.") + " Responde solo con el JSON.", { images: [img], modelTier: "default" })
              .then(function (p) { return (p && typeof p === "object") ? { ok: true, data: normalize(p) } : { ok: false, reason: "ia" }; })
              .catch(function (e) { return { ok: false, reason: aiErr(e) }; });
          }).catch(function () { return { ok: false, reason: isPdf ? "tipo" : "ia" }; });
        });
      });
    },

    // La IA de esta vista no dibuja imágenes: la web usa la ilustración del look
    look: function () { return Promise.resolve({ ok: false, reason: "no_image_model" }); },

    lead: function (body) {
      return getDb().then(function (db) {
        if (!db) return { ok: false, reason: "demo" };
        if (body.web) return { ok: true };
        var e = body.estudio || {};
        var row = {
          fecha: new Date().toISOString(), tipo: body.tipo === "estudio" ? "estudio" : "contacto",
          nombre: String(body.nombre || "").slice(0, 80), email: String(body.email || "").slice(0, 160),
          telefono: String(body.telefono || "").replace(/[^0-9+\s]/g, "").slice(0, 24), servicio: String(body.servicio || "").slice(0, 80),
          mensaje: String(body.mensaje || "").slice(0, 800), diagnostico: String(e.diagnostico || "").slice(0, 300),
          tratamiento: String(e.tratamiento || "").slice(0, 80), look: String(e.look || "").slice(0, 120),
          gastoMes: typeof e.gastoMes === "number" ? Math.round(e.gastoMes * 100) / 100 : null,
          plan: String(e.plan || "").slice(0, 40), ahorroAnual: typeof e.ahorroAnual === "number" ? e.ahorroAnual : null
        };
        return db.collection("leads").add(row).then(function () { return { ok: true }; }).catch(function () { return { ok: false, reason: "demo" }; });
      });
    }
  };

  // Panel de contactos (solo lo ve quien puede editar la demo)
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function initPanel() {
    Promise.all([use("user"), getDb()]).then(function (r) {
      var user = r[0], db = r[1]; if (!user || !db) return;
      return user.canEdit().then(function (can) {
        if (!can) return;
        var sec = h("section", "section demo-panel"); sec.id = "contactos-demo";
        var wrap = h("div", "wrap"); sec.appendChild(wrap);
        wrap.appendChild(h("div", "eyebrow", "Solo para ti · panel del salón"));
        wrap.appendChild(h("h2", "display", "Contactos recibidos"));
        var note = h("p", "lead", "Así le llegan al salón los emails y estudios que dejan sus clientes. Solo lo ve quien puede editar esta demo.");
        var list = h("div", "dp-list"); var empty = h("p", "muted", "Cargando contactos…");
        wrap.appendChild(note); wrap.appendChild(empty); wrap.appendChild(list);
        document.querySelector(".footer").before(sec);
        var timer = setTimeout(function () { empty.textContent = "Los contactos tardan en cargar; vuelve a mirar en un momento."; }, 10000);
        db.collection("leads").orderBy("fecha", "desc").limit(50).onSnapshot(function (snap) {
          if (!snap.fromCache) clearTimeout(timer);
          list.textContent = "";
          empty.hidden = snap.docs.length > 0; empty.textContent = "Aún no hay contactos. Haz un estudio o envía el formulario para ver cómo llega.";
          snap.docs.forEach(function (d) {
            var x = d.data() || {}, c = h("article", "dp-card");
            var top = h("div", "dp-top"); top.appendChild(h("span", "demo-tag", x.tipo || "")); top.appendChild(h("b", null, x.nombre || "—")); top.appendChild(h("span", "muted", " · " + (x.email || "")));
            c.appendChild(top);
            c.appendChild(h("p", "dp-meta", new Date(x.fecha || Date.now()).toLocaleString("es-ES") + (x.servicio ? " · " + x.servicio : "")));
            if (x.mensaje) c.appendChild(h("p", null, x.mensaje));
            if (x.tipo === "estudio") c.appendChild(h("p", null, "Tratamiento: " + (x.tratamiento || "—") + " · Look: " + (x.look || "—") + " · Gasto: " + (x.gastoMes != null ? x.gastoMes + " €/mes" : "—") + " · Plan: " + (x.plan || "—") + " · Ahorro estimado: " + (x.ahorroAnual != null ? x.ahorroAnual + " €/año" : "—")));
            list.appendChild(c);
          });
        }, function () { clearTimeout(timer); empty.hidden = false; empty.textContent = "No se pueden leer los contactos ahora mismo."; });
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPanel); else initPanel();
})();
