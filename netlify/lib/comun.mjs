// Utilidades compartidas por las funciones de Netlify (sirve tanto en las funciones
// normales como en las "edge"). La clave de Gemini vive en las variables de entorno
// de Netlify (GEMINI_API_KEY) y nunca llega al navegador.
import { getStore } from "@netlify/blobs";

export function env(k) {
  try { if (globalThis.Netlify && globalThis.Netlify.env) { const v = globalThis.Netlify.env.get(k); if (v) return v; } } catch (_) {}
  try { if (typeof process !== "undefined" && process.env) return process.env[k] || ""; } catch (_) {}
  return "";
}

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

// Respuesta que se abre al instante y se mantiene viva con espacios mientras la IA
// trabaja (JSON admite espacios delante), para no cortar las peticiones largas.
export function slowJSON(work) {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctl) {
      ctl.enqueue(enc.encode(" "));
      const t = setInterval(() => { try { ctl.enqueue(enc.encode(" ")); } catch (_) {} }, 4000);
      let out;
      try { out = await work(); } catch (e) { console.error("[aurum]", e && e.message); out = { ok: false, reason: "ia" }; }
      clearInterval(t);
      ctl.enqueue(enc.encode(JSON.stringify(out)));
      ctl.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

// Solo POST y solo desde la propia web (evita que otras webs gasten la cuota)
export function guard(req) {
  if (req.method !== "POST") return json({ ok: false, reason: "method" }, 405);
  const host = (req.headers.get("x-forwarded-host") || new URL(req.url).host).split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  const src = req.headers.get("origin") || req.headers.get("referer") || "";
  if (src) {
    let h = ""; try { h = new URL(src).hostname.toLowerCase(); } catch (_) {}
    if (!h || h !== host) return json({ ok: false, reason: "origin" }, 403);
  }
  return null;
}

async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Límites: por IP y minuto (en memoria), por IP y día y tope global diario (guardados).
const memo = new Map();
export async function rate(prefix, ip, perMin, perDay, globalDay) {
  const now = Date.now(), k = prefix + ":" + ip;
  const arr = (memo.get(k) || []).filter((t) => t > now - 60000);
  if (arr.length >= perMin) return "rate_min";
  arr.push(now); memo.set(k, arr);
  if (memo.size > 5000) memo.clear();
  try {
    const store = getStore("limites");
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const ipKey = `${prefix}/${day}/${await sha(ip || "0")}`, gKey = `${prefix}/${day}/_global`;
    const [a, g] = await Promise.all([store.get(ipKey, { type: "json" }), store.get(gKey, { type: "json" })]);
    const n = (a && a.n) || 0, gn = (g && g.n) || 0;
    if (perDay && n >= perDay) return "rate_day";
    if (globalDay && gn >= globalDay) return "rate_global";
    await Promise.all([store.setJSON(ipKey, { n: n + 1 }), store.setJSON(gKey, { n: gn + 1 })]);
  } catch (e) { console.error("[aurum-rate]", e && e.message); }
  return "";
}

export function clientIp(req, context) {
  return (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "0.0.0.0";
}

export async function gemini(model, payload, timeoutMs = 60000) {
  const key = env("GEMINI_API_KEY");
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(payload), signal: ctl.signal,
    });
    const txt = await r.text();
    if (!r.ok) return [null, `${model} http ${r.status} ${txt.slice(0, 200)}`];
    try { return [JSON.parse(txt), ""]; } catch (_) { return [null, `${model} json inválido`]; }
  } catch (e) { return [null, `${model} ${e && e.message}`]; } finally { clearTimeout(t); }
}

export function textOf(d) {
  return ((d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [])
    .filter((p) => typeof p.text === "string" && !p.thought).map((p) => p.text).join("").trim();
}

export function extractJson(s) {
  s = String(s || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try { const v = JSON.parse(s.slice(a, b + 1)); return v && typeof v === "object" ? v : null; } catch (_) { return null; }
}

export function toBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// Tipo real del archivo por sus primeros bytes (no nos fiamos de la extensión)
export function sniff(b) {
  const h = (i, arr) => arr.every((v, j) => b[i + j] === v);
  if (h(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (h(0, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (h(0, [0x52, 0x49, 0x46, 0x46]) && h(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  if (h(0, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (h(4, [0x66, 0x74, 0x79, 0x70])) { const brand = String.fromCharCode(...b.subarray(8, 12)); if (/^(heic|heix|hevc|mif1|msf1|heim|heis)/.test(brand)) return "image/heic"; }
  return "";
}

export async function readUpload(req, field, maxBytes, allowPdf) {
  let fd; try { fd = await req.formData(); } catch (_) { return { reason: "subida" }; }
  const f = fd.get(field);
  if (!f || typeof f === "string") return { reason: "sin_archivo" };
  if (!f.size || f.size > maxBytes) return { reason: "tamano" };
  const bytes = new Uint8Array(await f.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime || (mime === "application/pdf" && !allowPdf)) return { reason: "tipo" };
  return { mime, bytes, fd };
}

// ---- Validación del diagnóstico: lo que no encaja se queda en null (nunca inventamos) ----
const en = (v, ok) => { v = typeof v === "string" ? v.trim().toLowerCase() : null; return ok.includes(v) ? v : null; };
const txt = (v, m = 160) => (typeof v === "string" && v.trim()) ? v.trim().slice(0, m) : null;
const hex = (v) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim())) ? v.trim().toUpperCase() : null;
const bol = (v) => typeof v === "boolean" ? v : null;
function num(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v >= 0 && isFinite(v) ? Math.round(v * 100) / 100 : null;
  let s = String(v).replace(/[\s€]|EUR/g, "");
  s = (s.includes(",") && !s.includes(".")) ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = parseFloat(s); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
export function normalize(p) {
  const dg = p.diagnostico || {}, gs = p.gasto || {}, rc = p.recomendacion || {};
  let sc = dg.estado_puntuacion; sc = (typeof sc === "number" && sc >= 1 && sc <= 10) ? Math.round(sc) : null;
  const tipo = en(p.tipo_entrada, ["foto_cabello", "documento_gasto", "otro"]) || "otro";
  const out = {
    tipo_entrada: tipo,
    diagnostico: {
      tipo_cabello: en(dg.tipo_cabello, ["liso", "ondulado", "rizado", "afro"]), grosor: en(dg.grosor, ["fino", "medio", "grueso"]),
      longitud: en(dg.longitud, ["muy corto", "corto", "medio", "largo", "muy largo"]), color_actual: txt(dg.color_actual, 40), color_hex: hex(dg.color_hex),
      tenido: bol(dg["teñido"] != null ? dg["teñido"] : dg.tenido), estado_puntuacion: sc,
      danos: (Array.isArray(dg.danos) ? dg.danos : []).map((d) => txt(d, 40)).filter(Boolean).slice(0, 6),
      barba: bol(dg.barba), observaciones: txt(dg.observaciones, 220),
    },
    gasto: {
      gasto_total_eur: num(gs.gasto_total_eur), periodo: en(gs.periodo, ["visita", "mensual", "anual", "otro"]),
      conceptos: (Array.isArray(gs.conceptos) ? gs.conceptos : []).filter((c) => c && txt(c.concepto, 60)).slice(0, 12).map((c) => ({ concepto: txt(c.concepto, 60), importe_eur: num(c.importe_eur) })),
      establecimiento: txt(gs.establecimiento, 60), fecha: txt(gs.fecha, 30),
    },
    recomendacion: {
      tratamiento: en(rc.tratamiento, ["hidratacion", "reconstruccion", "keratina", "anticaida", "color", "mantenimiento"]) || "mantenimiento",
      tratamiento_nombre: txt(rc.tratamiento_nombre, 60), motivo: txt(rc.motivo, 220), look_sugerido: txt(rc.look_sugerido, 60), descripcion_look: txt(rc.descripcion_look, 280),
      longitud_sugerida: en(rc.longitud_sugerida, ["muy corto", "corto", "medio", "largo"]), textura_sugerida: en(rc.textura_sugerida, ["liso", "ondulado", "rizado"]),
      color_sugerido_hex: hex(rc.color_sugerido_hex), flequillo: bol(rc.flequillo),
    },
  };
  if (tipo === "foto_cabello") out.gasto = { gasto_total_eur: null, periodo: null, conceptos: [], establecimiento: null, fecha: null };
  return out;
}
