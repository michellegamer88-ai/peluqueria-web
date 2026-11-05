// Guarda los contactos (estudio y formulario) en el almacén privado de Netlify (equivale a lead.php).
// Solo el dueño los ve, en /panel.php con su contraseña.
import { getStore } from "@netlify/blobs";
import { guard, json, rate, clientIp } from "../lib/comun.mjs";

const s = (v, max = 120) => (typeof v === "string" || typeof v === "number" ? String(v) : "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

export default async (req, context) => {
  const g = guard(req); if (g) return g;
  let b = {}; try { b = await req.json(); } catch (_) {}
  if (s(b.web)) return json({ ok: true }); // campo trampa anti-bots
  const email = s(b.email, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ ok: false, reason: "email" });
  if (!b.consent) return json({ ok: false, reason: "consent" });
  const r = await rate("lead", clientIp(req, context), 5, 40, 0);
  if (r) return json({ ok: false, reason: r });
  const e = (b.estudio && typeof b.estudio === "object") ? b.estudio : {};
  const fecha = new Date().toISOString();
  const row = {
    fecha, tipo: b.tipo === "estudio" ? "estudio" : "contacto",
    nombre: s(b.nombre, 80), email, telefono: s(b.telefono, 24).replace(/[^0-9+\s]/g, ""),
    servicio: s(b.servicio, 80), mensaje: s(b.mensaje, 800),
    diagnostico: s(e.diagnostico, 300), tratamiento: s(e.tratamiento, 80), look: s(e.look, 120),
    gasto_mes_eur: typeof e.gastoMes === "number" ? Math.round(e.gastoMes * 100) / 100 : null,
    plan: s(e.plan, 40), ahorro_anual_eur: typeof e.ahorroAnual === "number" ? Math.round(e.ahorroAnual) : null,
  };
  try {
    await getStore("leads").setJSON(fecha.replace(/[:.]/g, "-") + "-" + crypto.randomUUID().slice(0, 8), row);
  } catch (err) {
    console.error("[aurum-lead]", err && err.message);
    return json({ ok: false, reason: "guardar" });
  }
  return json({ ok: true });
};

export const config = { path: "/lead.php" };
