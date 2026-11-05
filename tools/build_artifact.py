"""Genera la versión de demostración (una sola página) para publicar en claude.ai.
Uso: python3 tools/build_artifact.py <salida.html>"""
import base64, json, re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
W = R / "web"
out = pathlib.Path(sys.argv[1])

def heredoc(php):
    s = (W / php).read_text()
    return s.split("<<<'TXT'\n", 1)[1].split("\nTXT;", 1)[0]

def datauri(m):
    p = W / m.group(1)
    return 'data:image/webp;base64,' + base64.b64encode(p.read_bytes()).decode()

html = (W / "index.html").read_text()
body = html.split("<body>", 1)[1].split('<script defer src="lib/gsap.min.js">', 1)[0]
body = re.sub(r'(assets/img/[\w-]+\.webp)', lambda m: datauri(m), body)
css = (W / "styles.css").read_text()
css += """
/* Ajustes para la vista de claude.ai */
:root { color-scheme: dark; }
.nav { top: env(safe-area-inset-top, 0px); padding-left: max(var(--pad), env(safe-area-inset-left, 0px)); padding-right: max(var(--pad), env(safe-area-inset-right, 0px)); }
.chat { right: calc(22px + env(safe-area-inset-right, 0px)); bottom: calc(22px + env(safe-area-inset-bottom, 0px)); }
.demo-panel { background: var(--bg-2); border-top: 1px solid var(--line); }
.dp-list { display: grid; gap: 12px; margin-top: 10px; }
.dp-card { border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; background: var(--bg-3); min-width: 0; }
.dp-card p { margin: 6px 0 0; font-size: .9rem; color: var(--ink-2); overflow-wrap: anywhere; }
.dp-top { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.dp-meta { color: var(--mut) !important; font-size: .8rem !important; }
@media (max-width: 640px) { .chat { right: calc(14px + env(safe-area-inset-right, 0px)); bottom: calc(14px + env(safe-area-inset-bottom, 0px)); } }
"""
head = """<title>AURUM Atelier</title>
<meta name="description" content="Demo de web premium para peluquería y barbería con asistente IA y estudio capilar.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..600,0..100;1,9..144,300..600,0..100&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
""" + css + "\n</style>\n"
scripts = (
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>\n'
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>\n'
  "<script>\n" + (W / "lib/manifest.js").read_text() + "\n</script>\n"
  "<script>window.__AURUM_KB__ = " + json.dumps(heredoc("knowledge.php"), ensure_ascii=False) + ";\n"
  "window.__AURUM_LECTOR__ = " + json.dumps(heredoc("lector-capilar.php"), ensure_ascii=False) + ";</script>\n"
  "<script>\n" + (R / "tools/artifact-api.js").read_text() + "\n</script>\n"
  "<script>\n" + (W / "main.js").read_text().replace("</script", "<\\/script") + "\n</script>\n"
)
out.write_text(head + body + scripts)
print(out, round(out.stat().st_size / 1024), "KB")
