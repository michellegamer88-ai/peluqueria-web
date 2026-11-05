/* AURUM Atelier — main.js (script clásico + IIFE; sin módulos) */
(function () {
  "use strict";

  var B = window.__BRAND__ || {};
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var eur = function (n, d) { return (Math.round(n * 100) / 100).toLocaleString("es-ES", { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 0 : d }) + " €"; };
  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn("[" + name + "]", e); } }

  /* ---------------- Splash ---------------- */
  function initSplash() {
    var done = function () { document.documentElement.classList.add("is-ready"); };
    if (document.readyState === "complete") setTimeout(done, 350);
    else window.addEventListener("load", function () { setTimeout(done, 250); });
    setTimeout(done, 1800); // red de seguridad JS
  }

  /* ---------------- Nav ---------------- */
  function initNav() {
    var nav = $("[data-nav]"), burger = $("[data-burger]"), mm = $("[data-mmenu]");
    var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 30); };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    var setMenu = function (open) {
      document.documentElement.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      mm.setAttribute("aria-hidden", open ? "false" : "true");
    };
    burger.addEventListener("click", function () { setMenu(!document.documentElement.classList.contains("menu-open")); });
    $$("a", mm).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    // enlace activo
    var links = $$(".nav-links a");
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle("is-active", l.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(function (s) { io.observe(s); });
  }

  /* ---------------- Título del hero palabra a palabra (respeta <em>) ---------------- */
  function initSplit() {
    var t = $("[data-split]"); if (!t) return;
    var i = 0;
    $$(".line", t).forEach(function (line) {
      var walk = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
              var s = document.createElement("span"); s.className = "w"; s.textContent = part;
              s.style.transitionDelay = (0.55 + i++ * 0.08) + "s"; frag.appendChild(s);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1) walk(n);
        });
      };
      walk(line);
    });
    var go = function () { t.classList.add("is-in"); };
    if (document.documentElement.classList.contains("is-ready")) go();
    else { var mo = new MutationObserver(function () { if (document.documentElement.classList.contains("is-ready")) { go(); mo.disconnect(); } }); mo.observe(document.documentElement, { attributes: true }); }
    setTimeout(go, 2600);
  }

  /* ---------------- Reveals ---------------- */
  function initReveals() {
    var els = $$(".reveal, .manifesto-fig, [data-steps]");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.05, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (e, idx) {
      var sib = e.parentElement ? $$(":scope > .reveal", e.parentElement).indexOf(e) : 0;
      if (sib > 0) e.style.transitionDelay = Math.min(sib * 0.07, 0.4) + "s";
      io.observe(e);
    });
    setTimeout(function () { els.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) e.classList.add("is-in"); }); }, 2500);
  }

  /* ---------------- Contadores ---------------- */
  function initCounters() {
    var els = $$("[data-count-to]"); if (!els.length || !("IntersectionObserver" in window)) return;
    var run = function (el) {
      var to = parseFloat(el.getAttribute("data-count-to")), dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var t0 = performance.now(), dur = 1600;
      var fmt = function (v) { return v.toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      var step = function (now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
      };
      requestAnimationFrame(step);
    };
    var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }); }, { threshold: 0.05 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------------- Tilt + halo ---------------- */
  function initTilt() {
    if (!finePointer) return;
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--hx", (x * 100) + "%"); el.style.setProperty("--hy", (y * 100) + "%");
        el.style.setProperty("--ry", ((x - .5) * 7) + "deg"); el.style.setProperty("--rx", ((.5 - y) * 7) + "deg");
      });
      el.addEventListener("pointerleave", function () { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    });
  }

  /* ---------------- Botones magnéticos ---------------- */
  function initMagnetic() {
    if (!finePointer) return;
    $$("[data-magnetic]").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * .22) + "px");
        b.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * .3) + "px");
      });
      b.addEventListener("pointerleave", function () { b.style.setProperty("--mx", "0px"); b.style.setProperty("--my", "0px"); });
    });
  }

  /* ---------------- Mesh del hero sigue al cursor ---------------- */
  function initMesh() {
    var m = $(".hero-mesh"), h = $(".hero"); if (!m || !finePointer) return;
    h.addEventListener("pointermove", function (e) {
      var r = h.getBoundingClientRect();
      m.style.setProperty("--mx", (20 + (e.clientX - r.left) / r.width * 60) + "%");
      m.style.setProperty("--my", (20 + (e.clientY - r.top) / r.height * 60) + "%");
    });
  }

  /* ---------------- GSAP: parallax del hero + showcase horizontal ---------------- */
  function initGsap() {
    var sc = $("#servicios");
    var useGsap = window.gsap && window.ScrollTrigger && window.innerWidth >= 900 && !reduced;
    if (!useGsap) { if (sc) sc.classList.add("is-native"); return; }
    gsap.registerPlugin(ScrollTrigger);

    gsap.to(".hero-bg img", { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero-inner", { y: -60, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });

    var track = $("[data-track]"), pin = $("[data-showcase]");
    if (track && pin) {
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: { trigger: pin, start: "center center", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
      });
    }
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  /* ---------------- FAQ: solo una abierta ---------------- */
  function initFaq() {
    var qs = $$(".qa");
    qs.forEach(function (d) { d.addEventListener("toggle", function () { if (d.open) qs.forEach(function (o) { if (o !== d) o.open = false; }); }); });
  }

  /* ---------------- Formulario de contacto ---------------- */
  function postJSON(url, body, timeout) {
    var ctl = ("AbortController" in window) ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, timeout || 30000) : null;
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined, credentials: "same-origin" })
      .then(function (r) { if (t) clearTimeout(t); return r.json(); });
  }
  function postForm(url, fd, timeout) {
    var ctl = ("AbortController" in window) ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, timeout || 60000) : null;
    return fetch(url, { method: "POST", body: fd, signal: ctl ? ctl.signal : undefined, credentials: "same-origin" })
      .then(function (r) { if (t) clearTimeout(t); return r.json(); });
  }
  var LEAD_ERR = { email: "Revisa tu email, parece que falta algo.", consent: "Necesitamos tu permiso para guardar los datos.", rate_min: "Has enviado varias veces seguidas; espera un minuto.", rate_day: "Hoy ya hemos recibido varios envíos desde aquí. Llámanos o escríbenos por WhatsApp." };

  function initContact() {
    var f = $("[data-cform]"); if (!f) return;
    var err = $("[data-cerr]", f);
    f.addEventListener("submit", function (e) {
      e.preventDefault(); err.hidden = true;
      var nombre = f.nombre.value.trim(), email = f.email.value.trim();
      $$(".fl", f).forEach(function (l) { l.classList.remove("err"); });
      if (!nombre) { f.nombre.parentNode.classList.add("err"); err.textContent = "Dinos tu nombre, por favor."; err.hidden = false; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { f.email.parentNode.classList.add("err"); err.textContent = "Revisa tu email."; err.hidden = false; return; }
      if (!f.consent.checked) { err.textContent = "Marca la casilla de privacidad para poder responderte."; err.hidden = false; return; }
      f.classList.add("is-sending");
      postJSON("lead.php", { tipo: "contacto", nombre: nombre, email: email, telefono: f.telefono.value, servicio: f.servicio.value, mensaje: f.mensaje.value, consent: true, web: f.web.value }, 20000)
        .then(function (r) {
          f.classList.remove("is-sending");
          if (r && r.ok) { $(".cdone", f).hidden = false; }
          else { err.textContent = (r && LEAD_ERR[r.reason]) || "No hemos podido enviarlo. Llámanos al " + (B.phone || "salón") + " y te atendemos."; err.hidden = false; }
        })
        .catch(function () { f.classList.remove("is-sending"); err.textContent = "No hay conexión ahora mismo. Llámanos al " + (B.phone || "salón") + " o inténtalo en un momento."; err.hidden = false; });
    });
  }

  /* ---------------- Asistente Ámbar ---------------- */
  function initChat() {
    var root = $("[data-chat]"); if (!root) return;
    var fab = $("[data-chatfab]", root), panel = $("[data-chatpanel]", root), body = $("[data-chatbody]", root);
    var form = $("[data-chatform]", root), input = form.m, sugs = $("[data-chatsugs]", root);
    var history = [], busy = false;
    var open = function (v) {
      root.classList.toggle("is-open", v); if (v) root.classList.add("was-opened");
      fab.setAttribute("aria-expanded", v ? "true" : "false"); panel.setAttribute("aria-hidden", v ? "false" : "true");
      if (v && finePointer) setTimeout(function () { input.focus(); }, 300);
    };
    fab.addEventListener("click", function () { open(!root.classList.contains("is-open")); });
    $("[data-chatclose]", root).addEventListener("click", function () { open(false); });
    $$("[data-openchat]").forEach(function (b) { b.addEventListener("click", function () { open(true); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("is-open")) open(false); });

    var add = function (text, who, cta) {
      var d = document.createElement("div"); d.className = "msg " + who; d.textContent = text;
      if (cta) { var a = document.createElement("a"); a.href = "#contacto"; a.className = "msg-cta"; a.textContent = "Ir al formulario de contacto →"; a.addEventListener("click", function () { open(false); }); d.appendChild(document.createElement("br")); d.appendChild(a); }
      body.appendChild(d); body.scrollTop = body.scrollHeight; return d;
    };
    var send = function (text) {
      text = (text || "").trim(); if (!text || busy) return;
      busy = true; add(text, "me"); input.value = ""; sugs.style.display = "none";
      var typing = document.createElement("div"); typing.className = "msg bot typing"; typing.innerHTML = "<i></i><i></i><i></i>"; body.appendChild(typing); body.scrollTop = body.scrollHeight;
      postJSON("asistente-ia.php", { message: text, history: history.slice(-8) }, 35000)
        .then(function (r) {
          typing.remove();
          var reply = (r && r.reply) || "Ahora mismo no puedo responder. Escríbenos por el formulario y te ayudamos.";
          add(reply, "bot", !!(r && r.fallback) || !r || !r.reply);
          if (r && r.reply && !r.fallback) { history.push({ role: "user", text: text }); history.push({ role: "model", text: reply }); }
        })
        .catch(function () { typing.remove(); add("Ahora mismo no tengo conexión. Escríbenos por el formulario o llámanos al " + (B.phone || "salón") + ".", "bot", true); })
        .then(function () { busy = false; });
    };
    form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });
    $$("button", sugs).forEach(function (b) { b.addEventListener("click", function () { send(b.textContent); }); });
  }

  /* =====================================================================
     ESTUDIO CAPILAR IA
     ===================================================================== */
  var LOOK_DEFAULT = { longitud: "medio", textura: "ondulado", color: "#4A3222", flequillo: false, barba: false };

  function shade(hex, amt) {
    var h = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!h) return hex;
    var n = parseInt(h[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)))); };
    return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  // Ilustración del look (siempre disponible, sin IA de imágenes)
  function lookSVG(o) {
    o = Object.assign({}, LOOK_DEFAULT, o || {});
    var c = /^#[0-9a-f]{6}$/i.test(o.color || "") ? o.color : LOOK_DEFAULT.color;
    var len = { "muy corto": 0, "corto": 1, "medio": 2, "largo": 3, "muy largo": 3 }[o.longitud]; if (len == null) len = 2;
    var tex = o.textura === "rizado" ? 2 : (o.textura === "ondulado" ? 1 : 0);
    var id = "lk" + Math.random().toString(36).slice(2, 7);
    var endY = [0, 0, 178, 232][len];
    var back = len >= 2 ? '<path d="M100 34C142 34 154 66 151 108L' + (154 + tex * 2) + ' ' + endY + 'C152 ' + (endY + 10) + ' 132 ' + (endY + 14) + ' 122 ' + (endY - 4) + 'L118 128H82L78 ' + (endY - 4) + 'C68 ' + (endY + 14) + ' 48 ' + (endY + 10) + ' ' + (46 - tex * 2) + ' ' + endY + 'L49 108C46 66 58 34 100 34Z" fill="url(#' + id + 'h)" filter="url(#' + id + 'f)"/>' : "";
    var cap = len === 0
      ? '<path d="M65 104C62 66 82 52 100 52C120 52 139 66 135 104C130 82 117 72 100 72C83 72 70 82 65 104Z" fill="url(#' + id + 'h)" filter="url(#' + id + 'f)"/>'
      : '<path d="M60 108C54 58 82 36 104 36C132 36 148 60 140 108C134 84 118 72 98 74C82 76 68 88 60 108Z" fill="url(#' + id + 'h)" filter="url(#' + id + 'f)"/>';
    var fringe = o.flequillo ? '<path d="M64 98C70 70 128 66 136 96C124 86 116 92 106 86C96 93 86 86 78 92C72 90 68 94 64 98Z" fill="url(#' + id + 'h)" filter="url(#' + id + 'f)"/>' : "";
    var beard = o.barba ? '<path d="M70 124C72 160 88 170 100 170C112 170 128 160 130 124C126 142 116 150 100 150C84 150 74 142 70 124Z" fill="' + shade(c, -0.15) + '" opacity=".92"/>' : "";
    var strands = "";
    for (var i = 0; i < 6; i++) {
      var x = 72 + i * 11;
      strands += '<path d="M' + x + ' ' + (len === 0 ? 60 : 46) + 'Q' + (x + 8) + ' ' + (len >= 2 ? 110 : 70) + ' ' + (x - 4 + i) + ' ' + (len >= 2 ? Math.min(endY - 10, 170) : 92) + '" stroke="' + shade(c, 0.45) + '" stroke-width=".9" fill="none" opacity=".55"/>';
    }
    return '<svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustración del look sugerido">' +
      '<defs><radialGradient id="' + id + 'bg" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#2E251B"/><stop offset="1" stop-color="#120F0B"/></radialGradient>' +
      '<linearGradient id="' + id + 'h" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="' + shade(c, 0.28) + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + shade(c, -0.35) + '"/></linearGradient>' +
      '<linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAD8C2"/><stop offset="1" stop-color="#C9AE92"/></linearGradient>' +
      '<filter id="' + id + 'f" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="' + (tex === 2 ? ".09" : ".035") + '" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="' + [1.5, 7, 13][tex] + '"/></filter></defs>' +
      '<rect width="200" height="250" fill="url(#' + id + 'bg)"/>' +
      '<circle cx="100" cy="110" r="88" fill="none" stroke="#C9A45C" stroke-opacity=".18"/>' +
      back +
      '<path d="M86 150V176C70 182 40 190 28 250H172C160 190 130 182 114 176V150Z" fill="url(#' + id + 's)"/>' +
      '<path d="M28 250C40 196 66 186 86 180L100 196L114 180C134 186 160 196 172 250Z" fill="#17130E" stroke="#C9A45C" stroke-opacity=".45"/>' +
      '<ellipse cx="100" cy="112" rx="34" ry="44" fill="url(#' + id + 's)"/>' +
      '<path d="M84 108Q89 105 94 108M106 108Q111 105 116 108" stroke="#6B5444" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M100 114Q97 126 101 129" stroke="#A98C74" stroke-width="1.2" fill="none"/>' +
      '<path d="M92 138Q100 142 108 138" stroke="#9C6B5B" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      beard + cap + fringe + strands +
      '</svg>';
  }

  function initEstudio() {
    var tool = $("[data-tool]"); if (!tool) return;
    var T = B.tratamientos || {}, P = B.planes || {};
    var S = { file: null, isImage: false, data: null, manual: false, previewUrl: "" };
    var label = $("[data-tool-label]", tool), dots = $$(".tool-dots i", tool);
    var labels = ["Tu foto", "Analizando", "Diagnóstico", "Tu look", "Tu estudio"];

    function go(n) {
      $$(".tool-step", tool).forEach(function (s) { s.classList.toggle("is-active", s.getAttribute("data-step") === String(n)); });
      dots.forEach(function (d, i) { d.classList.toggle("on", i < n); });
      label.textContent = "Paso " + n + " de 5 · " + labels[n - 1];
      var r = tool.getBoundingClientRect();
      if (r.top < 70 || r.top > innerHeight * 0.6) window.scrollTo({ top: window.scrollY + r.top - 90, behavior: reduced ? "auto" : "smooth" });
    }

    // --- Paso 1: subir archivo ---
    var drop = $("[data-drop]", tool), input = $("[data-file]", tool);
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
    input.addEventListener("change", function () { if (input.files[0]) handle(input.files[0]); input.value = ""; });
    $("[data-manual]", tool).addEventListener("click", function () { S.manual = true; S.file = null; S.isImage = false; S.data = null; showDiag(); go(3); });

    // Reducimos fotos grandes antes de enviarlas (más rápido y dentro de los límites)
    function shrink(file) {
      return new Promise(function (res) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return res(file);
        createImageBitmap(file).then(function (bmp) {
          var max = 1600, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
          if (k === 1 && file.size < 2.5e6) return res(file);
          var cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
          cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
          cv.toBlob(function (b) { res(b ? new File([b], "foto.jpg", { type: "image/jpeg" }) : file); }, "image/jpeg", 0.88);
        }).catch(function () { res(file); });
      });
    }

    var REASONS = {
      sin_clave: "El análisis con IA se está terminando de configurar. Mientras, puedes hacer tu estudio a mano: te llevo al siguiente paso.",
      tamano: "Ese archivo pesa demasiado (máximo 10 MB). Prueba con otra foto o una captura.",
      tipo: "Ese formato no lo puedo leer. Sube una foto (JPG, PNG, WEBP, HEIC) o un PDF.",
      rate_min: "Has hecho varios estudios seguidos. Espera un minuto o continúa a mano.",
      rate_day: "Hoy ya has hecho muchos estudios. Puedes continuar a mano.",
      rate_global: "El estudio está muy solicitado ahora mismo. Continúa a mano y lo afinamos en el salón.",
      ia: "No he podido leer bien la imagen. Prueba con otra foto con más luz, o continúa a mano.",
      otro: "No veo cabello ni un ticket de peluquería en esa imagen. Prueba con otra foto o continúa a mano."
    };

    function handle(file) {
      if (file.size > 10 * 1024 * 1024) return alertBox(REASONS.tamano, false);
      S.manual = false; S.data = null;
      S.isImage = /^image\//.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      var prev = $("[data-preview]", tool), pdf = $("[data-pdf]", tool);
      if (S.previewUrl) URL.revokeObjectURL(S.previewUrl);
      if (S.isImage) { S.previewUrl = URL.createObjectURL(file); prev.src = S.previewUrl; prev.hidden = false; pdf.hidden = true; prev.onerror = function () { prev.hidden = true; pdf.hidden = false; $("span", pdf).textContent = "FOTO"; }; }
      else { prev.hidden = true; pdf.hidden = false; $("span", pdf).textContent = "PDF"; }
      go(2);
      var logs = $$("[data-scanlog] li", tool), li = 0;
      logs.forEach(function (l) { l.className = ""; });
      var tick = setInterval(function () { if (li > 0) logs[li - 1].className = "done"; if (li < logs.length) logs[li].className = "on"; li = Math.min(li + 1, logs.length); }, 1100);
      var t0 = Date.now();
      shrink(file).then(function (f2) {
        S.file = f2;
        var fd = new FormData(); fd.append("archivo", f2, f2.name || "archivo");
        return postForm("lector-capilar.php", fd, 70000);
      }).then(function (r) {
        var wait = Math.max(0, 3400 - (Date.now() - t0));
        setTimeout(function () {
          clearInterval(tick);
          if (r && r.ok && r.data) {
            if (r.data.tipo_entrada === "otro") return alertBox(REASONS.otro, true);
            S.data = r.data; S.isImage = S.isImage && r.data.tipo_entrada === "foto_cabello";
            logs.forEach(function (l) { l.className = "done"; });
            setTimeout(function () { showDiag(); go(3); }, 400);
          } else {
            alertBox(REASONS[(r && r.reason) || "ia"] || REASONS.ia, true, r && r.reason === "sin_clave");
          }
        }, wait);
      }).catch(function () { clearInterval(tick); alertBox("No he podido conectar con el análisis. Puedes continuar a mano y lo afinamos en el salón.", true); });
    }

    function alertBox(msg, offerManual, auto) {
      go(1);
      var old = $(".tool-alert", tool); if (old) old.remove();
      var d = document.createElement("div"); d.className = "diag-obs tool-alert"; d.style.marginBottom = "14px"; d.textContent = msg;
      $("[data-step='1']", tool).insertBefore(d, drop);
      if (auto) setTimeout(function () { d.remove(); S.manual = true; S.data = null; showDiag(); go(3); }, 2600);
    }

    // --- Paso 3: diagnóstico ---
    function recFromManual(m) {
      var t = m.estado === "decolorado" ? "reconstruccion" : m.estado === "muy" ? "reconstruccion" : m.estado === "seco" ? "hidratacion" : m.estado === "caida" ? "anticaida" : "mantenimiento";
      var score = { sano: 8, seco: 6, muy: 4, decolorado: 4, caida: 6 }[m.estado] || 7;
      return { score: score, tratamiento: t, look: { longitud: m.longitud, textura: m.textura, color: "#4A3222", flequillo: false, barba: m.barba } };
    }
    function getRec() {
      if (S.manual || !S.data) {
        var m = S.m || { longitud: "medio", textura: "ondulado", estado: "seco", barba: false };
        var r = recFromManual(m);
        var tn = (T[r.tratamiento] || {}).nombre || "Mantenimiento";
        var names = { "muy corto": "Buzz cut pulido", corto: "Corto texturizado", medio: "Bob con movimiento", largo: "Capas largas con brillo" };
        return { score: r.score, tratamiento: r.tratamiento, tratNombre: tn, motivo: "Recomendación general según lo que nos has contado; la confirmamos en el salón.", lookName: names[m.longitud] || "Look AURUM", lookDesc: "Un " + (names[m.longitud] || "corte").toLowerCase() + " que respeta tu textura " + m.textura + " y aporta brillo y forma.", look: r.look, diagTxt: "Estudio manual · " + m.longitud + ", " + m.textura };
      }
      var d = S.data.diagnostico || {}, rc = S.data.recomendacion || {};
      var tr = rc.tratamiento || "mantenimiento";
      return {
        score: d.estado_puntuacion, tratamiento: tr, tratNombre: rc.tratamiento_nombre || (T[tr] || {}).nombre || "Mantenimiento",
        motivo: rc.motivo || "", lookName: rc.look_sugerido || "Tu look AURUM", lookDesc: rc.descripcion_look || "",
        look: { longitud: rc.longitud_sugerida || d.longitud || "medio", textura: rc.textura_sugerida || (d.tipo_cabello === "afro" ? "rizado" : d.tipo_cabello) || "ondulado", color: rc.color_sugerido_hex || d.color_hex || LOOK_DEFAULT.color, flequillo: !!rc.flequillo, barba: !!d.barba },
        diagTxt: [d.tipo_cabello, d.grosor, d.longitud, d.color_actual, d.estado_puntuacion ? ("estado " + d.estado_puntuacion + "/10") : null].filter(Boolean).join(", ") + ((d.danos || []).length ? " · " + d.danos.join(", ") : "")
      };
    }

    function chip(k, v, extra) { return '<span class="chip ' + (extra || "") + '">' + esc(k) + ' <b>' + (v == null || v === "" ? "—" : esc(v)) + '</b></span>'; }

    function showDiag() {
      var box = $("[data-diag]", tool), html = "";
      var gaugeSvg = function (score) {
        var off = 251 - 251 * ((score || 0) / 10);
        return '<div class="gauge"><svg viewBox="0 0 90 90"><defs><linearGradient id="goldg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3DFA8"/><stop offset="1" stop-color="#9C7A3C"/></linearGradient></defs><circle class="g-bg" cx="45" cy="45" r="40"/><circle class="g-fg" cx="45" cy="45" r="40" data-off="' + off + '"/></svg><b>' + (score ? score : "—") + '<small>/ 10</small></b></div>';
      };
      if (S.manual || !S.data) {
        var m = S.m || { longitud: "medio", textura: "ondulado", estado: "seco", barba: false };
        S.m = m;
        html = '<div class="diag-head">' + gaugeSvg(recFromManual(m).score) + '<div><span class="kicker">Estudio manual</span><h4>Cuéntanos cómo es tu pelo</h4><p>Sin foto también funciona: lo afinamos gratis en el salón.</p></div></div>' +
          '<div class="spend-grid manual-grid" data-manualgrid>' +
          '<label>Largo<select name="longitud"><option value="muy corto">Muy corto</option><option value="corto">Corto</option><option value="medio">Medio</option><option value="largo">Largo</option></select></label>' +
          '<label>Textura<select name="textura"><option value="liso">Liso</option><option value="ondulado">Ondulado</option><option value="rizado">Rizado</option></select></label>' +
          '<label>¿Cómo lo notas?<select name="estado"><option value="sano">Sano y con brillo</option><option value="seco">Algo seco / frizz</option><option value="muy">Muy dañado / puntas abiertas</option><option value="decolorado">Decolorado o con mechas</option><option value="caida">Noto más caída</option></select></label>' +
          '<label>¿Llevas barba?<select name="barba"><option value="0">No</option><option value="1">Sí</option></select></label></div>';
        box.innerHTML = html;
        var g = $("[data-manualgrid]", box);
        g.longitud.value = m.longitud; g.textura.value = m.textura; g.estado.value = m.estado; g.barba.value = m.barba ? "1" : "0";
        $$("select", g).forEach(function (s) { s.addEventListener("change", function () { S.m = { longitud: g.longitud.value, textura: g.textura.value, estado: g.estado.value, barba: g.barba.value === "1" }; var gs = $(".gauge", box); var sc = recFromManual(S.m).score; $(".g-fg", gs).style.strokeDashoffset = 251 - 251 * sc / 10; $("b", gs).firstChild.nodeValue = sc; }); });
        $("[data-spendsrc]", tool).textContent = "Ajusta los valores a tu rutina real.";
        $("[data-spendsrc]", tool).classList.remove("from-doc");
      } else {
        var d = S.data.diagnostico || {}, rec = getRec(), isDoc = S.data.tipo_entrada === "documento_gasto";
        html = '<div class="diag-head">' + gaugeSvg(d.estado_puntuacion) + '<div><span class="kicker">' + (isDoc ? "Leído de tu documento" : "Diagnóstico IA orientativo") + '</span><h4>' + esc(isDoc && !d.tipo_cabello ? "Hemos leído tu ticket" : (d.estado_puntuacion >= 8 ? "Tu cabello está en buena forma" : d.estado_puntuacion >= 5 ? "Tu cabello pide un extra de cuidado" : d.estado_puntuacion ? "Tu cabello necesita un rescate" : "Tu diagnóstico")) + '</h4><p>Estado general estimado del cabello.</p></div></div>';
        html += '<div class="chips">' + chip("Tipo", d.tipo_cabello) + chip("Grosor", d.grosor) + chip("Largo", d.longitud) +
          '<span class="chip">' + (d.color_hex ? '<i class="swatch" style="background:' + esc(d.color_hex) + '"></i>' : "") + 'Color <b>' + esc(d.color_actual || "—") + '</b></span>' +
          (d.tenido === true ? chip("Teñido", "sí") : "") + (d.barba === true ? chip("Barba", "sí") : "") +
          (d.danos || []).map(function (x) { return '<span class="chip warn">' + esc(x) + '</span>'; }).join("") + '</div>';
        if (d.observaciones) html += '<p class="diag-obs">' + esc(d.observaciones) + '</p>';
        html += '<div class="diag-rec">Recomendación: <b>' + esc(rec.tratNombre) + '</b>' + (rec.motivo ? " — " + esc(rec.motivo) : "") + '</div>';
        box.innerHTML = html;
        prefillSpend();
      }
      requestAnimationFrame(function () { setTimeout(function () { $$(".g-fg", box).forEach(function (c) { c.style.strokeDashoffset = c.getAttribute("data-off"); }); }, 80); });
      calcTotal();
    }

    // Prellenar el gasto con lo leído del ticket (nunca inventado: solo importes escritos)
    function prefillSpend() {
      var f = $("[data-spend]", tool), src = $("[data-spendsrc]", tool), g = (S.data && S.data.gasto) || {};
      src.classList.remove("from-doc");
      if (g.gasto_total_eur == null) { src.textContent = S.data && S.data.tipo_entrada === "foto_cabello" ? "Tu foto no dice cuánto gastas: ajusta estos valores a tu rutina real." : "No hemos encontrado importes claros. Ajusta los valores a tu rutina."; return; }
      var div = g.periodo === "anual" ? 12 : 1;
      var prod = 0, trat = 0, rest = 0, all = true;
      (g.conceptos || []).forEach(function (c) {
        if (c.importe_eur == null) { all = false; return; }
        var t = c.concepto.toLowerCase();
        if (/champ|mascarilla|aceite|s[ée]rum|producto|laca|cera|spray|acondicionador|crema|t[óo]nico/.test(t)) prod += c.importe_eur;
        else if (/tratamiento|keratina|hidrataci|reconstrucc|botox|plex|anticaida|ritual/.test(t)) trat += c.importe_eur;
        else rest += c.importe_eur;
      });
      if (!all || !(g.conceptos || []).length || Math.abs(prod + trat + rest - g.gasto_total_eur) > 1) { prod = 0; trat = 0; rest = g.gasto_total_eur; }
      f.precio.value = Math.round(rest / div * 100) / 100;
      f.productos.value = Math.round(prod / div * 100) / 100;
      f.tratamientos.value = Math.round(trat / div * 100) / 100;
      if (g.periodo === "mensual" || g.periodo === "anual") f.visitas.value = "1";
      src.textContent = "✦ Leído de tu " + (g.establecimiento ? "ticket de " + g.establecimiento : "documento") + ": " + eur(g.gasto_total_eur, 2) + (g.periodo ? " (" + g.periodo + ")" : "") + ". Revísalo y ajústalo si hace falta.";
      src.classList.add("from-doc");
    }

    var spend = $("[data-spend]", tool);
    function num(v) { v = parseFloat(String(v).replace(",", ".")); return isFinite(v) && v >= 0 ? Math.min(v, 9999) : 0; }
    function readSpend() { return { V: num(spend.visitas.value), Pv: num(spend.precio.value), R: num(spend.productos.value), Tt: num(spend.tratamientos.value) }; }
    function calcTotal() { var s = readSpend(); $("[data-total]", tool).textContent = eur(s.V * s.Pv + s.R + s.Tt, 2); }
    spend.addEventListener("input", calcTotal); spend.addEventListener("change", calcTotal);
    spend.addEventListener("submit", function (e) { e.preventDefault(); showLook(); go(4); });

    // --- Paso 4: look ---
    function showLook() {
      var rec = getRec(), vis = $("[data-lookvisual]", tool);
      $("[data-lookname]", tool).textContent = rec.lookName;
      $("[data-lookdesc]", tool).textContent = rec.lookDesc || "";
      var svg = function (badge) { vis.innerHTML = lookSVG(rec.look) + '<span class="look-badge">' + (badge || "Ilustración orientativa") + '</span>'; S.lookHTML = vis.innerHTML; };
      if (S.isImage && S.file && !S.manual) {
        vis.innerHTML = '<div class="look-loading"><span></span>Dibujando tu look con IA…</div>';
        var desc = [rec.lookName, rec.lookDesc, "length: " + rec.look.longitud, "texture: " + rec.look.textura, rec.look.color ? "hair color " + rec.look.color : "", rec.look.flequillo ? "with bangs" : ""].filter(Boolean).join(". ");
        var fd = new FormData(); fd.append("foto", S.file, S.file.name || "foto.jpg"); fd.append("descripcion", desc);
        postForm("look.php", fd, 95000).then(function (r) {
          if (r && r.ok && r.image) { var im = new Image(); im.alt = "Tu look sugerido, generado con IA"; im.onload = function () { vis.innerHTML = ""; vis.appendChild(im); vis.insertAdjacentHTML("beforeend", '<span class="look-badge">Generado con IA · orientativo</span>'); S.lookHTML = vis.innerHTML; }; im.onerror = function () { svg(); }; im.src = r.image; }
          else svg();
        }).catch(function () { svg(); });
      } else svg();
    }

    // --- Email gate ---
    var gate = $("[data-gate]", tool), gerr = $("[data-gateerr]", tool);
    gate.addEventListener("submit", function (e) {
      e.preventDefault(); gerr.hidden = true;
      var email = gate.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { gerr.textContent = "Escribe un email válido para enviarte tu estudio."; gerr.hidden = false; return; }
      if (!gate.consent.checked) { gerr.textContent = "Marca la casilla para que podamos guardar tu estudio."; gerr.hidden = false; return; }
      var st = study(), btn = $("button[type=submit]", gate);
      btn.disabled = true; btn.textContent = "Preparando tu estudio…";
      postJSON("lead.php", { tipo: "estudio", nombre: gate.nombre.value, email: email, consent: true, web: gate.web.value,
        estudio: { diagnostico: st.rec.diagTxt, tratamiento: st.rec.tratNombre, look: st.rec.lookName, gastoMes: st.actual, plan: st.plan.nombre, ahorroAnual: Math.round(st.ahorroMes * 12) } }, 20000)
        .then(function (r) {
          if (r && r.ok) { renderStudy(st, gate.nombre.value.trim()); go(5); }
          else if (r && (r.reason === "email" || r.reason === "consent")) { gerr.textContent = LEAD_ERR[r.reason]; gerr.hidden = false; }
          else { renderStudy(st, gate.nombre.value.trim(), true); go(5); } // no bloqueamos al visitante si falla el guardado
        })
        .catch(function () { renderStudy(st, gate.nombre.value.trim(), true); go(5); })
        .then(function () { btn.disabled = false; btn.textContent = "Ver mi estudio personalizado"; });
    });

    // --- Cálculo del estudio (aritmética transparente) ---
    function study() {
      var rec = getRec(), s = readSpend(), tr = T[rec.tratamiento] || { nombre: rec.tratNombre, precio: 25, porMes: 0 };
      var score = rec.score || 7, key;
      if (rec.tratamiento === "reconstruccion" || rec.tratamiento === "keratina" || score <= 4) key = "reconstruccion";
      else if (rec.tratamiento === "hidratacion" || rec.tratamiento === "anticaida" || rec.tratamiento === "color" || score <= 7) key = "ritual";
      else key = "esencial";
      var plan = P[key] || { nombre: "Club", cuota: 59, incluye: 1, dto: 0.15 };
      var sesiones = rec.tratamiento === "keratina" ? tr.porMes : Math.max(tr.porMes, 0);
      if (rec.tratamiento !== "keratina") sesiones = Math.min(sesiones, plan.incluye) || 0;
      var tratMes = tr.precio * sesiones;                         // tratamiento recomendado, por libre
      var actual = s.V * s.Pv + s.R + s.Tt;                       // lo que gastas hoy
      var porLibre = s.V * s.Pv + s.R + Math.max(s.Tt, tratMes);  // hoy + tratamiento recomendado
      var tratEnPlan = rec.tratamiento === "keratina" ? tratMes * (1 - plan.dto) : 0; // keratina: con descuento, no incluida
      var club = plan.cuota + Math.max(0, s.V - 1) * s.Pv * (1 - plan.dto) + s.R * (1 - plan.dto) + Math.max(0, s.Tt - tratMes) + tratEnPlan;
      var ahorroMes = porLibre - club;
      var ahorroTrat = tratMes > 0 ? (rec.tratamiento === "keratina" ? tratMes * plan.dto : tratMes) : 0;
      return { rec: rec, s: s, tr: tr, plan: plan, sesiones: sesiones, tratMes: tratMes, actual: actual, porLibre: porLibre, club: club, ahorroMes: ahorroMes, ahorroTrat: ahorroTrat, score: score, target: Math.min(10, score + (key === "reconstruccion" ? 3 : key === "ritual" ? 2 : 1)) };
    }

    function renderStudy(st, nombre, notSaved) {
      var box = $("[data-study]", tool), pos = st.ahorroMes > 0.5, max = Math.max(st.porLibre, st.club, 1);
      var weeks = ""; for (var i = 0; i < 12; i++) { var v = st.score + (st.target - st.score) * (1 - Math.pow(1 - (i + 1) / 12, 2)); weeks += '<i data-h="' + (v / 10 * 100) + '"></i>'; }
      box.innerHTML =
        '<div class="study-hero"><span class="kicker">' + (nombre ? esc(nombre) + ", este" : "Este") + ' es tu estudio AURUM</span>' +
        (pos ? '<div class="study-big" data-countup="' + Math.round(st.ahorroMes * 12) + '">0 €</div><p>de <b>ahorro estimado al año</b> con el plan <b>' + esc(st.plan.nombre) + '</b> frente a hacer tu rutina + el tratamiento recomendado por libre.</p>'
             : '<div class="study-big">' + esc(st.plan.nombre) + '</div><p>Con tu rutina actual el Club no te ahorra dinero: te sale mejor pagar por servicio. Te contamos igualmente qué tratamiento necesita tu pelo y cuánto cuesta.</p>') +
        '</div>' +
        '<div class="study-grid">' +
          '<div class="study-card"><h5>Gasto mensual comparado</h5><div class="bars">' +
            '<div class="bar"><span>Por libre</span><i data-w="' + (st.porLibre / max * 100) + '"></i><span>' + eur(st.porLibre) + '</span></div>' +
            '<div class="bar gold"><span>Club ' + esc(st.plan.nombre) + '</span><i data-w="' + (st.club / max * 100) + '"></i><span>' + eur(st.club) + '</span></div>' +
          '</div><p class="demo-note" style="margin:10px 0 0">Hoy declaras ' + eur(st.actual, 2) + '/mes.</p></div>' +
          '<div class="study-card"><h5>Tratamiento recomendado</h5><div class="v">' + esc(st.rec.tratNombre) + '</div><p class="demo-note" style="margin:8px 0 0">' +
            (st.tratMes > 0 ? "Por libre: " + eur(st.tratMes) + "/mes. " + (st.rec.tratamiento === "keratina" ? "En el plan, con un " + Math.round(st.plan.dto * 100) + " % de descuento: ahorras " + eur(st.ahorroTrat) + "/mes." : "En el plan va incluido: ahorras " + eur(st.ahorroTrat) + "/mes en el tratamiento.") : "Tu pelo está bien: basta con mantenimiento y un buen corte.") + '</p></div>' +
          '<div class="study-card"><h5>Evolución estimada · 12 semanas</h5><div class="v">' + st.score + ' → ' + st.target + ' <small>/ 10</small></div><div class="timeline">' + weeks + '</div></div>' +
          '<div class="study-card wide"><h5>Tu look</h5><div class="study-look"><div class="look-visual">' + (S.lookHTML || lookSVG(st.rec.look)) + '</div><div><div class="v" style="font-size:1.15rem">' + esc(st.rec.lookName) + '</div><p class="demo-note" style="margin:6px 0 0">' + esc(st.rec.lookDesc || "") + '</p></div></div></div>' +
        '</div>' +
        '<ul class="study-assump"><li>Plan ' + esc(st.plan.nombre) + ': ' + esc(st.plan.texto || "") + ' (' + eur(st.plan.cuota) + '/mes, sin permanencia).</li><li>Visitas extra y productos con el descuento del plan; precios orientativos «desde».</li><li>Calculado con los datos que has indicado' + (S.data && S.data.gasto && S.data.gasto.gasto_total_eur != null ? " y los importes leídos de tu documento" : "") + '.</li></ul>' +
        '<p class="study-disclaimer">⚠ Estimación orientativa: no es un presupuesto ni un diagnóstico médico. El precio final y el tratamiento se confirman gratis en tu primera visita.' + (notSaved ? " (No hemos podido guardar tu email ahora; si quieres que te contactemos, usa el formulario.)" : " Te enviaremos una copia y te contactaremos para tu cita.") + '</p>' +
        '<div class="study-actions"><a href="#contacto" class="btn btn-gold" data-booknow>Reservar con este estudio</a><button type="button" class="btn btn-line" data-restart>Hacer otro estudio</button></div>';
      setTimeout(function () {
        $$("[data-w]", box).forEach(function (b) { b.style.setProperty("--w", b.getAttribute("data-w") + "%"); });
        $$(".timeline i", box).forEach(function (b, i) { setTimeout(function () { b.style.height = b.getAttribute("data-h") + "%"; }, i * 60); });
        var cu = $("[data-countup]", box);
        if (cu) { var to = +cu.getAttribute("data-countup"), t0 = performance.now(); (function step(n) { var p = Math.min(1, (n - t0) / 1500); cu.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString("es-ES") + " €"; if (p < 1) requestAnimationFrame(step); })(t0); }
      }, 120);
      $("[data-restart]", box).addEventListener("click", function () { S = { file: null, isImage: false, data: null, manual: false, previewUrl: "" }; var a = $(".tool-alert", tool); if (a) a.remove(); go(1); });
      $("[data-booknow]", box).addEventListener("click", function () {
        var f = $("[data-cform]"); if (!f) return;
        if (gate.nombre.value) f.nombre.value = gate.nombre.value;
        f.email.value = gate.email.value;
        f.servicio.value = st.plan.nombre ? "Club AURUM" : "Tratamiento";
        f.mensaje.value = "Vengo del estudio capilar: " + st.rec.tratNombre + " · look «" + st.rec.lookName + "» · plan " + st.plan.nombre + ".";
      });
    }
  }

  function boot() {
    document.documentElement.classList.remove("no-js");
    safe(initSplash, "splash");
    safe(initNav, "nav");
    safe(initSplit, "split");
    safe(initReveals, "reveals");
    safe(initCounters, "counters");
    safe(initTilt, "tilt");
    safe(initMagnetic, "magnetic");
    safe(initMesh, "mesh");
    safe(initFaq, "faq");
    safe(initContact, "contact");
    safe(initChat, "chat");
    safe(initEstudio, "estudio");
    safe(initGsap, "gsap");
    var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
