<?php
// panel.php — el dueño del salón ve aquí los contactos y estudios recibidos.
// Protegido con la contraseña creada en setup.php.
session_start();
header('X-Robots-Tag: noindex');
$pass = '';
foreach ([__DIR__ . '/../aurum_panel_pass.php', __DIR__ . '/datos/panel_pass.php'] as $f) if (is_file($f)) { $v = @include $f; if (is_string($v) && $v !== '') { $pass = $v; break; } }
$err = '';
if (isset($_GET['salir'])) { $_SESSION = []; session_destroy(); header('Location: panel.php'); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && $pass !== '') {
  usleep(400000);
  if (password_verify((string) ($_POST['p'] ?? ''), $pass)) { session_regenerate_id(true); $_SESSION['aurum_ok'] = 1; header('Location: panel.php'); exit; }
  $err = 'Contraseña incorrecta.';
}
$ok = !empty($_SESSION['aurum_ok']) && $pass !== '';
$rows = [];
if ($ok) {
  foreach ([__DIR__ . '/../aurum_leads.jsonl', __DIR__ . '/datos/aurum_leads.jsonl'] as $f) {
    if (!is_file($f)) continue;
    foreach (file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $l) { $d = json_decode($l, true); if (is_array($d)) $rows[] = $d; }
  }
  usort($rows, function ($a, $b) { return strcmp($b['fecha'] ?? '', $a['fecha'] ?? ''); });
  if (isset($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="contactos-aurum.csv"');
    $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF");
    if ($rows) { fputcsv($o, array_keys($rows[0])); foreach ($rows as $r) fputcsv($o, array_values($r)); }
    exit;
  }
}
function h($s) { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
?><!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Contactos · AURUM</title><style>
:root{--bg:#0d0b08;--ink:#f4eee2;--mut:#a79c88;--gold:#c9a45c;--brd:rgba(244,238,226,.14)}*{box-sizing:border-box;margin:0}
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--ink);padding:24px;line-height:1.5}
h1{font-family:Georgia,serif;font-weight:400}h1 b{color:var(--gold);font-weight:400}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}
a{color:var(--gold)}.box{max-width:380px;margin:12vh auto;border:1px solid var(--brd);border-radius:18px;padding:28px}
input{width:100%;padding:12px;border-radius:10px;border:1px solid var(--brd);background:#14110d;color:var(--ink);font:inherit;margin:12px 0}
button{width:100%;padding:12px;border:0;border-radius:99px;font-weight:700;background:var(--gold);color:#0d0b08;cursor:pointer}
.grid{display:grid;gap:12px}.c{border:1px solid var(--brd);border-radius:14px;padding:14px 16px}.c .m{color:var(--mut);font-size:.82rem}.t{display:inline-block;font-size:.7rem;padding:2px 8px;border:1px solid var(--gold);border-radius:99px;color:var(--gold);margin-right:6px;text-transform:uppercase;letter-spacing:.08em}
.c p{margin-top:6px;font-size:.92rem}</style></head><body>
<?php if ($pass === ''): ?><div class="box"><h1>Panel <b>AURUM</b></h1><p style="margin-top:10px;color:var(--mut)">Primero crea la contraseña del panel en <a href="setup.php">setup.php</a>.</p></div>
<?php elseif (!$ok): ?><form class="box" method="post"><h1>Panel <b>AURUM</b></h1><input type="password" name="p" placeholder="Contraseña" required autofocus><button>Entrar</button><?php if ($err) echo '<p style="margin-top:10px;color:#e7a37f">' . h($err) . '</p>'; ?></form>
<?php else: ?>
<div class="top"><h1>Contactos <b>(<?php echo count($rows); ?>)</b></h1><div><a href="?csv=1">Descargar Excel (CSV)</a> · <a href="?salir=1">Salir</a></div></div>
<div class="grid"><?php if (!$rows) echo '<p style="color:var(--mut)">Aún no hay contactos.</p>'; foreach ($rows as $r): ?>
<div class="c"><span class="t"><?php echo h($r['tipo'] ?? ''); ?></span><b><?php echo h($r['nombre'] ?: '—'); ?></b> · <a href="mailto:<?php echo h($r['email']); ?>"><?php echo h($r['email']); ?></a> <?php echo $r['telefono'] ? '· ' . h($r['telefono']) : ''; ?>
<div class="m"><?php echo h(date('d/m/Y H:i', strtotime($r['fecha'] ?? 'now'))); ?><?php echo !empty($r['servicio']) ? ' · ' . h($r['servicio']) : ''; ?></div>
<?php if (!empty($r['mensaje'])): ?><p><?php echo h($r['mensaje']); ?></p><?php endif; ?>
<?php if (($r['tipo'] ?? '') === 'estudio'): ?><p>🧪 <?php echo h($r['diagnostico'] ?: '—'); ?><br>✨ Tratamiento: <?php echo h($r['tratamiento'] ?: '—'); ?> · Look: <?php echo h($r['look'] ?: '—'); ?><br>💶 Gasto actual: <?php echo $r['gasto_mes_eur'] !== null ? h($r['gasto_mes_eur']) . ' €/mes' : '—'; ?> · Plan: <?php echo h($r['plan'] ?: '—'); ?> · Ahorro estimado: <?php echo $r['ahorro_anual_eur'] !== null ? h($r['ahorro_anual_eur']) . ' €/año' : '—'; ?></p><?php endif; ?>
</div><?php endforeach; ?></div><?php endif; ?></body></html>
