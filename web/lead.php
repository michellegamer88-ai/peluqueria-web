<?php
// lead.php — guarda los contactos (estudio capilar y formulario) donde solo el
// dueño puede leerlos: fuera de public_html si se puede, si no en datos/ (bloqueada).
// El dueño los ve en panel.php (con contraseña) o en el administrador de archivos.
require __DIR__ . '/ia-comun.php';
ia_guard();

$r = ia_rate_check('lead', 5, 40, 0);
if ($r !== '') ia_out(['ok' => false, 'reason' => $r]);

$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) $in = [];
function s($v, $max = 120) { return mb_substr(trim(preg_replace('/[\r\n\t]+/', ' ', is_scalar($v) ? (string) $v : '')), 0, $max); }

if (s($in['web'] ?? '') !== '') ia_out(['ok' => true]); // campo trampa anti-bots

$email = s($in['email'] ?? '', 160);
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) ia_out(['ok' => false, 'reason' => 'email']);
if (empty($in['consent'])) ia_out(['ok' => false, 'reason' => 'consent']);
$tipo = in_array(($in['tipo'] ?? ''), ['estudio', 'contacto'], true) ? $in['tipo'] : 'contacto';

$e = is_array($in['estudio'] ?? null) ? $in['estudio'] : [];
$row = [
  'fecha'            => date('c'),
  'tipo'             => $tipo,
  'nombre'           => s($in['nombre'] ?? '', 80),
  'email'            => $email,
  'telefono'         => mb_substr(preg_replace('/[^0-9+\s]/', '', (string) ($in['telefono'] ?? '')), 0, 24),
  'servicio'         => s($in['servicio'] ?? '', 80),
  'mensaje'          => s($in['mensaje'] ?? '', 800),
  'diagnostico'      => s($e['diagnostico'] ?? '', 300),
  'tratamiento'      => s($e['tratamiento'] ?? '', 80),
  'look'             => s($e['look'] ?? '', 120),
  'gasto_mes_eur'    => isset($e['gastoMes']) ? round((float) $e['gastoMes'], 2) : null,
  'plan'             => s($e['plan'] ?? '', 40),
  'ahorro_anual_eur' => isset($e['ahorroAnual']) ? round((float) $e['ahorroAnual']) : null,
  'ip'               => $_SERVER['REMOTE_ADDR'] ?? '',
];

$stored = false;
foreach ([__DIR__ . '/..', __DIR__ . '/datos'] as $dir) {
  if (!is_dir($dir) || !is_writable($dir)) continue;
  $ok1 = @file_put_contents($dir . '/aurum_leads.jsonl', json_encode($row, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX) !== false;
  $csv = $dir . '/aurum_leads.csv'; $new = !is_file($csv);
  if ($fh = @fopen($csv, 'a')) {
    if (flock($fh, LOCK_EX)) { if ($new) fputcsv($fh, array_keys($row)); fputcsv($fh, array_values($row)); flock($fh, LOCK_UN); }
    fclose($fh);
  }
  if ($ok1) { $stored = true; break; }
}
ia_rate_commit();

// Aviso por email al salón (opcional): crea ../aurum_aviso_email.php con <?php return 'tu@email.com';
$to = '';
if (is_file(__DIR__ . '/../aurum_aviso_email.php')) { $v = @include __DIR__ . '/../aurum_aviso_email.php'; if (is_string($v)) $to = trim($v); }
if ($stored && $to !== '' && filter_var($to, FILTER_VALIDATE_EMAIL) && function_exists('mail')) {
  $body = "Nuevo contacto desde la web ($tipo):\n\n";
  foreach ($row as $k => $v) $body .= str_pad($k, 18) . ': ' . ($v === null || $v === '' ? '—' : $v) . "\n";
  @mail($to, 'Nuevo contacto web AURUM — ' . $email, $body, "From: web@" . ($_SERVER['HTTP_HOST'] ?? 'aurum.local') . "\r\nContent-Type: text/plain; charset=utf-8");
}

if (!$stored) { @error_log('[aurum-lead] no se pudo guardar'); ia_out(['ok' => false, 'reason' => 'guardar']); }
ia_out(['ok' => true]);
