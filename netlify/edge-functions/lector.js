// Lector del estudio capilar: foto del pelo o ticket (foto/PDF) -> JSON (equivale a lector-capilar.php)
// La foto no se guarda: se envía a la IA y se descarta.
import { guard, json, rate, clientIp, env, gemini, textOf, extractJson, toBase64, readUpload, normalize, slowJSON } from "../lib/comun.mjs";
import { LECTOR } from "../lib/textos.mjs";

export default async (req, context) => {
  const g = guard(req); if (g) return g;
  const up = await readUpload(req, "archivo", 6 * 1024 * 1024, true);
  if (up.reason) return json({ ok: false, reason: up.reason });
  if (!env("GEMINI_API_KEY")) return json({ ok: false, reason: "sin_clave" });
  const r = await rate("lector", clientIp(req, context), 6, 30, 400);
  if (r) return json({ ok: false, reason: r });
  const payload = {
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: up.mime, data: toBase64(up.bytes) } }, { text: LECTOR }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 6000, responseMimeType: "application/json" },
  };
  return slowJSON(async () => {
    let last = "";
    for (const m of ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]) {
      const [d, err] = await gemini(m, payload, 60000);
      if (!d) { last += " | " + err; continue; }
      const p = extractJson(textOf(d));
      if (p) return { ok: true, data: normalize(p), es_imagen: up.mime.startsWith("image/") };
      last += ` | ${m} sin JSON`;
    }
    console.error("[aurum-lector]", last);
    return { ok: false, reason: "ia" };
  });
};
