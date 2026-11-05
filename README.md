# AURUM Atelier — web premium para peluquería y barbería (demo)

Web de demostración para vender a salones: diseño negro + blanco + oro, asistente de IA «Ámbar»
y estudio capilar con IA (foto o PDF → diagnóstico, look dibujado, ahorro estimado y captura de email).

- `web/` es lo que se publica (se sube tal cual a `public_html`).
- `web/setup.php`: se abre una vez en el navegador para pegar la clave gratuita de Google Gemini
  y crear la contraseña del panel. Después se puede borrar.
- `web/panel.php`: el dueño ve los contactos y estudios recibidos (y los descarga en Excel).
- `web/lib/manifest.js`: precios de tratamientos y planes que usa la calculadora.
- `web/knowledge.php`: lo que sabe el asistente (servicios, precios, horario…).

Contenido de ejemplo (marcado en la web): dirección, teléfono, cifras y testimonios.

## Publicar en Netlify (con la IA funcionando)

Netlify no ejecuta PHP, así que la parte inteligente está duplicada en `netlify/`
(mismas direcciones: `/asistente-ia.php`, `/lector-capilar.php`, `/look.php`, `/lead.php`, `/panel.php`).

1. Netlify → Add new site → Import an existing project → GitHub → `peluqueria-web`.
2. Rama: `claude/barbershop-premium-web-wljh3h`. Lo demás lo lee de `netlify.toml` (no cambiar nada).
3. Site configuration → Environment variables:
   - `GEMINI_API_KEY` = la clave de Google AI Studio.
   - `PANEL_PASSWORD` = contraseña del panel de contactos (mínimo 8 caracteres).
4. Deploys → Trigger deploy. Los contactos se ven en `https://<tu-sitio>.netlify.app/panel.php`.

Prueba local: `npm install && node netlify/build.mjs && GEMINI_API_KEY=… PANEL_PASSWORD=… BLOBS_DIR=/tmp/blobs node tools/netlify-local.mjs` → http://127.0.0.1:8090
