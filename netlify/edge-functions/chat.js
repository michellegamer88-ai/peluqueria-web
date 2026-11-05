// Asistente «Ámbar» (equivale a asistente-ia.php)
import { guard, json, rate, clientIp, env, gemini, textOf, slowJSON } from "../lib/comun.mjs";
import { KB } from "../lib/textos.mjs";

const MODELS = ["gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"];
const reply = (text, fallback) => json(fallback ? { reply: text, fallback: true } : { reply: text });

export default async (req, context) => {
  const g = guard(req); if (g) return g;
  let body = {}; try { body = await req.json(); } catch (_) {}
  const message = String(body.message || "").trim();
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  if (!message || message.length > 600) return reply("Cuéntamelo en un mensaje algo más corto, por favor.");
  if (!env("GEMINI_API_KEY")) return reply("Me estoy terminando de configurar. Mientras tanto, puedes escribirnos desde el formulario de contacto y te respondemos enseguida.", true);
  const r = await rate("chat", clientIp(req, context), 8, 100, 1200);
  if (r === "rate_min") return reply("Vas muy rápido 🙂 Dame unos segundos y vuelve a preguntarme.");
  if (r === "rate_day") return reply("Hoy ya hemos hablado mucho. Para seguir, déjanos tus datos en el formulario y el equipo te atiende.", true);
  if (r === "rate_global") return reply("Estoy muy solicitada ahora mismo. Escríbenos por el formulario de contacto y te respondemos enseguida.", true);

  const contents = history
    .map((h) => ({ role: h && h.role === "model" ? "model" : "user", parts: [{ text: String((h && h.text) || "").slice(0, 1200) }] }))
    .filter((c) => c.parts[0].text);
  contents.push({ role: "user", parts: [{ text: message }] });
  const payload = {
    system_instruction: { parts: [{ text: KB }] }, contents,
    generationConfig: { temperature: 0.5, topP: 0.9, maxOutputTokens: 1500 },
    safetySettings: ["HARASSMENT", "HATE_SPEECH", "SEXUALLY_EXPLICIT", "DANGEROUS_CONTENT"].map((c) => ({ category: "HARM_CATEGORY_" + c, threshold: "BLOCK_ONLY_HIGH" })),
  };
  return slowJSON(async () => {
    let last = "";
    for (const m of MODELS) {
      const [d, err] = await gemini(m, payload, 30000);
      if (!d) { last = err; continue; }
      const t = textOf(d); if (t) return { reply: t };
      last = m + " vacía";
    }
    console.error("[aurum-chat]", last);
    return { reply: "Ahora mismo no puedo responder. Escríbenos por el formulario de contacto y te ayudamos enseguida.", fallback: true };
  });
};
