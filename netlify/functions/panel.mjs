// Panel de contactos del salón (equivale a panel.php). La contraseña es la variable
// PANEL_PASSWORD de Netlify. Lista los contactos y los descarga en Excel (CSV).
import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../lib/comun.mjs";

const COOKIE = "aurum_panel";
const h = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const sign = (pass, exp) => createHmac("sha256", pass).update(String(exp)).digest("hex");
function same(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); }
function logged(req, pass) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(COOKIE + "=(\\d+)\\.([a-f0-9]{64})"));
  return !!m && +m[1] > Date.now() && same(m[2], sign(pass, m[1]));
}
const page = (inner, extra = {}) => new Response(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Contactos · AURUM</title><style>
:root{--bg:#0d0b08;--ink:#f4eee2;--mut:#a79c88;--gold:#c9a45c;--brd:rgba(244,238,226,.14)}*{box-sizing:border-box;margin:0}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--ink);padding:24px;line-height:1.5}
h1{font-family:Georgia,serif;font-weight:400}h1 b{color:var(--gold);font-weight:400}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}
a{color:var(--gold)}.box{max-width:380px;margin:12vh auto;border:1px solid var(--brd);border-radius:18px;padding:28px}
input{width:100%;padding:12px;border-radius:10px;border:1px solid var(--brd);background:#14110d;color:var(--ink);font:inherit;margin:12px 0}
button{width:100%;padding:12px;border:0;border-radius:99px;font-weight:700;background:var(--gold);color:#0d0b08;cursor:pointer}
.grid{display:grid;gap:12px}.c{border:1px solid var(--brd);border-radius:14px;padding:14px 16px;overflow-wrap:anywhere}.c .m{color:var(--mut);font-size:.82rem}
.t{display:inline-block;font-size:.7rem;padding:2px 8px;border:1px solid var(--gold);border-radius:99px;color:var(--gold);margin-right:6px;text-transform:uppercase;letter-spacing:.08em}.c p{margin-top:6px;font-size:.92rem}
</style></head><body>${inner}</body></html>`, { status: extra.status || 200, headers: Object.assign({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }, extra.headers || {}) });

export default async (req) => {
  const pass = env("PANEL_PASSWORD");
  const url = new URL(req.url);
  if (!pass || pass.length < 8) return page(`<div class="box"><h1>Panel <b>AURUM</b></h1><p style="margin-top:10px;color:var(--mut)">Falta crear la contraseña del panel: en Netlify, añade la variable <b>PANEL_PASSWORD</b> (mínimo 8 caracteres) y vuelve a publicar.</p></div>`);
  if (url.searchParams.has("salir")) return new Response(null, { status: 302, headers: { Location: "/panel.php", "Set-Cookie": `${COOKIE}=; Path=/panel.php; Max-Age=0; HttpOnly; Secure; SameSite=Strict` } });
  if (req.method === "POST") {
    let p = ""; try { p = String((await req.formData()).get("p") || ""); } catch (_) {}
    await new Promise((r) => setTimeout(r, 400));
    if (same(p, pass)) {
      const exp = Date.now() + 8 * 3600 * 1000;
      return new Response(null, { status: 302, headers: { Location: "/panel.php", "Set-Cookie": `${COOKIE}=${exp}.${sign(pass, exp)}; Path=/panel.php; Max-Age=28800; HttpOnly; Secure; SameSite=Strict` } });
    }
    return page(loginForm("Contraseña incorrecta."), { status: 401 });
  }
  if (!logged(req, pass)) return page(loginForm(""));

  const store = getStore("leads");
  const { blobs } = await store.list();
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 500);
  const rows = (await Promise.all(keys.map((k) => store.get(k, { type: "json" }).catch(() => null)))).filter(Boolean);
  if (url.searchParams.has("csv")) {
    const cols = ["fecha", "tipo", "nombre", "email", "telefono", "servicio", "mensaje", "diagnostico", "tratamiento", "look", "gasto_mes_eur", "plan", "ahorro_anual_eur"];
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const csv = "﻿" + cols.join(";") + "\n" + rows.map((r) => cols.map((c) => q(r[c])).join(";")).join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="contactos-aurum.csv"', "Cache-Control": "no-store" } });
  }
  const cards = rows.map((r) => `<div class="c"><span class="t">${h(r.tipo)}</span><b>${h(r.nombre || "—")}</b> · <a href="mailto:${h(r.email)}">${h(r.email)}</a>${r.telefono ? " · " + h(r.telefono) : ""}
<div class="m">${h(new Date(r.fecha).toLocaleString("es-ES", { timeZone: "Europe/Madrid" }))}${r.servicio ? " · " + h(r.servicio) : ""}</div>
${r.mensaje ? `<p>${h(r.mensaje)}</p>` : ""}${r.tipo === "estudio" ? `<p>🧪 ${h(r.diagnostico || "—")}<br>✨ Tratamiento: ${h(r.tratamiento || "—")} · Look: ${h(r.look || "—")}<br>💶 Gasto actual: ${r.gasto_mes_eur != null ? h(r.gasto_mes_eur) + " €/mes" : "—"} · Plan: ${h(r.plan || "—")} · Ahorro estimado: ${r.ahorro_anual_eur != null ? h(r.ahorro_anual_eur) + " €/año" : "—"}</p>` : ""}</div>`).join("");
  return page(`<div class="top"><h1>Contactos <b>(${rows.length})</b></h1><div><a href="?csv=1">Descargar Excel (CSV)</a> · <a href="?salir=1">Salir</a></div></div><div class="grid">${cards || '<p style="color:var(--mut)">Aún no hay contactos.</p>'}</div>`);
};
function loginForm(err) { return `<form class="box" method="post"><h1>Panel <b>AURUM</b></h1><input type="password" name="p" placeholder="Contraseña" required autofocus><button>Entrar</button>${err ? `<p style="margin-top:10px;color:#e7a37f">${h(err)}</p>` : ""}</form>`; }

export const config = { path: "/panel.php" };
