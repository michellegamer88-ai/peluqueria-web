// Dibuja con IA el look sugerido sobre la foto del visitante (equivale a look.php).
// Si no sale, la web dibuja una ilustración del look en su lugar.
import { guard, json, rate, clientIp, env, gemini, toBase64, readUpload, slowJSON } from "../lib/comun.mjs";

export default async (req, context) => {
  const g = guard(req); if (g) return g;
  const up = await readUpload(req, "foto", 6 * 1024 * 1024, false);
  if (up.reason) return json({ ok: false, reason: up.reason });
  if (!env("GEMINI_API_KEY")) return json({ ok: false, reason: "sin_clave" });
  const r = await rate("look", clientIp(req, context), 3, 8, 150);
  if (r) return json({ ok: false, reason: r });
  const desc = String(up.fd.get("descripcion") || "").replace(/[\r\n\t]+/g, " ").slice(0, 280) || "a polished, flattering modern haircut with healthy shine";
  const prompt = "Edit this photo. Keep exactly the same person, face, skin, expression, pose, clothing, framing, lighting and background. " +
    "Change ONLY the hair to this new salon look: " + desc + ". Photorealistic, natural hairline, healthy glossy hair as if just styled in a premium salon. No text, no watermark.";
  const payload = {
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: up.mime, data: toBase64(up.bytes) } }, { text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.4 },
  };
  return slowJSON(async () => {
    let last = "";
    for (const m of ["gemini-3.1-flash-image", "gemini-2.5-flash-image", "gemini-3.1-flash-lite-image"]) {
      const [d, err] = await gemini(m, payload, 90000);
      if (!d) { last += " | " + err; continue; }
      for (const p of (d.candidates?.[0]?.content?.parts || [])) {
        const inl = p.inlineData || p.inline_data;
        if (inl && inl.data) return { ok: true, image: `data:${inl.mimeType || inl.mime_type || "image/png"};base64,${inl.data}` };
      }
      last += ` | ${m} sin imagen`;
    }
    console.error("[aurum-look]", last);
    return { ok: false, reason: "ia" };
  });
};
