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
