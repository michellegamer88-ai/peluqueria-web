// Prepara dist/ (lo que publica Netlify): copia web/ sin los .php ni las carpetas
// internas, y genera los textos del asistente a partir de knowledge.php y lector-capilar.php
import { cpSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
const R = join(dirname(fileURLToPath(import.meta.url)), "..");
rmSync(join(R, "dist"), { recursive: true, force: true });
cpSync(join(R, "web"), join(R, "dist"), {
  recursive: true,
  filter: (src) => { const b = basename(src); return !b.endsWith(".php") && b !== "datos" && b !== ".htaccess"; },
});
const heredoc = (f) => readFileSync(join(R, "web", f), "utf8").split("<<<'TXT'\n")[1].split("\nTXT;")[0];
writeFileSync(join(R, "netlify/lib/textos.mjs"),
  "// Generado por netlify/build.mjs desde web/knowledge.php y web/lector-capilar.php. No editar a mano.\n" +
  "export const KB = " + JSON.stringify(heredoc("knowledge.php")) + ";\n" +
  "export const LECTOR = " + JSON.stringify(heredoc("lector-capilar.php")) + ";\n");
console.log("dist/ listo");
