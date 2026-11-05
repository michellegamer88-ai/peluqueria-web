<?php
// setup.php — activar la clave de la IA (Gemini) y la contraseña del panel de
// contactos, UNA sola vez, desde el navegador. Nada se muestra ni se registra.
// Cuando esté todo configurado, se puede borrar este archivo.
$G_OUT = __DIR__ . '/../gemini_api_key.php';  $G_IN = __DIR__ . '/secret_config.php';
$P_OUT = __DIR__ . '/../aurum_panel_pass.php'; $P_IN = __DIR__ . '/datos/panel_pass.php';

function rd($a, $b) { foreach ([$a, $b] as $f) if (is_file($f)) { $v = @include $f; if (is_string($v) && trim($v) !== '' && $v !== 'TU_CLAVE_AQUI') return trim($v); } return ''; }
function wr($a, $b, $val) { $c = "<?php return '" . str_replace(["\\", "'"], ["\\\\", "\\'"], $val) . "';\n"; return (@file_put_contents($a, $c) !== false) || (@file_put_contents($b, $c) !== false); }
function valid_gemini($k) {
  if (!function_exists('curl_init')) return false;
  $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models');
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_HTTPHEADER => ['x-goog-api-key: ' . $k]]);
  $r = curl_exec($ch); $c = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  return $r !== false && $c === 200;
}
$gSet = rd($G_OUT, $G_IN) !== '';
$pSet = rd($P_OUT, $P_IN) !== '';
$msg = ''; $tone = 'info';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  if (isset($_POST['gemini_key']) && !$gSet) {
    $k = trim((string) $_POST['gemini_key']);
    if (strpos($k, 'AIza') !== 0) { $msg = 'La clave debe empezar por «AIza». Revísala.'; $tone = 'warn'; }
    elseif (!valid_gemini($k)) { $msg = 'Google no ha aceptado esa clave. Cópiala de nuevo, completa.'; $tone = 'warn'; }
    elseif (wr($G_OUT, $G_IN, $k)) { $gSet = true; $msg = '✅ Clave de la IA activada. El asistente y el estudio ya funcionan.'; $tone = 'ok'; }
    else { $msg = 'La clave es válida pero no se pudo guardar (permisos del servidor).'; $tone = 'warn'; }
  } elseif (isset($_POST['panel_pass']) && !$pSet) {
    $p = (string) $_POST['panel_pass'];
    if (mb_strlen($p) < 8) { $msg = 'La contraseña debe tener al menos 8 caracteres.'; $tone = 'warn'; }
    elseif (wr($P_OUT, $P_IN, password_hash($p, PASSWORD_DEFAULT))) { $pSet = true; $msg = '✅ Contraseña del panel guardada. Entra en panel.php para ver tus contactos.'; $tone = 'ok'; }
    else { $msg = 'No se pudo guardar la contraseña (permisos del servidor).'; $tone = 'warn'; }
  } else { $msg = 'Eso ya estaba configurado. Por seguridad no se puede cambiar desde aquí.'; }
}
?><!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Configuración · AURUM</title>
<style>
:root{--bg:#0d0b08;--ink:#f4eee2;--mut:#a79c88;--gold:#c9a45c;--brd:rgba(244,238,226,.14)}
*{box-sizing:border-box;margin:0}body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:radial-gradient(50% 40% at 20% 0%,rgba(201,164,92,.22),transparent 70%),var(--bg);color:var(--ink);min-height:100vh;display:grid;place-items:center;padding:24px;line-height:1.6}
.box{width:100%;max-width:480px;border:1px solid var(--brd);border-radius:20px;padding:30px;background:rgba(255,255,255,.03)}
h1{font-family:Georgia,serif;font-weight:400;font-size:1.7rem;margin-bottom:6px}h1 b{color:var(--gold);font-weight:400}.sub{color:var(--mut);font-size:.92rem;margin-bottom:20px}
.card{border:1px solid var(--brd);border-radius:14px;padding:16px;margin-bottom:14px}.card h2{font-size:1rem;display:flex;gap:8px;align-items:center;justify-content:space-between}
.pill{font-size:.72rem;padding:3px 10px;border-radius:99px;border:1px solid var(--brd)}.pill.ok{color:#f1dca7;border-color:var(--gold)}.pill.no{color:var(--mut)}
.hint{color:var(--mut);font-size:.85rem;margin:6px 0 12px}.hint a{color:var(--gold)}
input{width:100%;padding:12px;border-radius:10px;border:1px solid var(--brd);background:#14110d;color:var(--ink);font:inherit}
button{width:100%;margin-top:10px;padding:12px;border:0;border-radius:99px;font-weight:700;cursor:pointer;background:linear-gradient(120deg,#e6c987,#c9a45c,#9c7a3c);color:#0d0b08}
.msg{margin-top:14px;padding:11px 13px;border-radius:10px;font-size:.9rem;border:1px solid var(--brd)}.ok{border-color:var(--gold)}.warn{border-color:#c46b4b}
</style></head><body><main class="box">
<h1>AURUM · <b>Configuración</b></h1>
<p class="sub">Se hace una sola vez. Lo que pegues aquí se guarda en el servidor y nunca se muestra a los visitantes.</p>
<div class="card"><h2>1 · Clave de la IA (Google Gemini) <span class="pill <?php echo $gSet?'ok':'no'; ?>"><?php echo $gSet?'Activada ✓':'Pendiente'; ?></span></h2>
<?php if (!$gSet): ?><p class="hint">Créala gratis en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> → «Crear clave de API». Empieza por <b>AIza…</b></p>
<form method="post" autocomplete="off"><input name="gemini_key" type="password" placeholder="AIza…" required><button>Activar la IA</button></form><?php endif; ?></div>
<div class="card"><h2>2 · Contraseña del panel de contactos <span class="pill <?php echo $pSet?'ok':'no'; ?>"><?php echo $pSet?'Creada ✓':'Pendiente'; ?></span></h2>
<?php if (!$pSet): ?><p class="hint">Con ella entrarás en <b>panel.php</b> para ver los emails y estudios que dejan tus clientes.</p>
<form method="post" autocomplete="off"><input name="panel_pass" type="password" minlength="8" placeholder="Mínimo 8 caracteres" required><button>Guardar contraseña</button></form><?php endif; ?></div>
<?php if ($gSet && $pSet): ?><div class="msg ok">✅ Todo listo. Ya puedes borrar <b>setup.php</b> del servidor.</div><?php endif; ?>
<?php if ($msg): ?><div class="msg <?php echo $tone; ?>"><?php echo htmlspecialchars($msg, ENT_QUOTES, 'UTF-8'); ?></div><?php endif; ?>
</main></body></html>
