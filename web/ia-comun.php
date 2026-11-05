<?php
// ia-comun.php — utilidades compartidas por los archivos de IA de AURUM.
// No se sirve directamente (bloqueado en .htaccess y aquí mismo).
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

function ia_out($arr, $code = 200) {
  if ($code !== 200) http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// Cabeceras + solo POST + mismo origen (evita que otras webs gasten la cuota)
function ia_guard() {
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: no-store');
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') ia_out(['ok' => false, 'reason' => 'method'], 405);
  $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
  $src  = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
  if ($src !== '') {
    $srcHost = strtolower((string) parse_url($src, PHP_URL_HOST));
    if ($srcHost === '' || $srcHost !== $host) ia_out(['ok' => false, 'reason' => 'origin'], 403);
  }
}

// Límite por IP (minuto/día) + tope global diario. Devuelve '' si se puede seguir.
function ia_rate_check($prefix, $perMin, $perDay, $globalDay) {
  $ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  $tmp = sys_get_temp_dir();
  $now = time();
  $ipFile = $tmp . '/aurum_' . $prefix . '_' . md5($ip) . '.json';
  $stamps = is_file($ipFile) ? json_decode((string) @file_get_contents($ipFile), true) : [];
  if (!is_array($stamps)) $stamps = [];
  $min = count(array_filter($stamps, function ($t) use ($now) { return $t > $now - 60; }));
  $day = count(array_filter($stamps, function ($t) use ($now) { return $t > $now - 86400; }));
  if ($min >= $perMin) return 'rate_min';
  if ($day >= $perDay) return 'rate_day';
  $gFile  = $tmp . '/aurum_' . $prefix . '_global_' . date('Ymd') . '.txt';
  $gCount = is_file($gFile) ? (int) @file_get_contents($gFile) : 0;
  if ($globalDay > 0 && $gCount >= $globalDay) return 'rate_global';
  $GLOBALS['__ia_rate'] = [$ipFile, $stamps, $gFile, $gCount, $now];
  return '';
}
function ia_rate_commit() {
  if (empty($GLOBALS['__ia_rate'])) return;
  list($ipFile, $stamps, $gFile, $gCount, $now) = $GLOBALS['__ia_rate'];
  $stamps[] = $now;
  @file_put_contents($ipFile, json_encode(array_values(array_slice($stamps, -300))), LOCK_EX);
  @file_put_contents($gFile, (string) ($gCount + 1), LOCK_EX);
}

// Clave de Gemini: entorno -> fuera de public_html -> secret_config.php
function ia_key() {
  $key = getenv('GEMINI_API_KEY');
  if (!$key && is_file(__DIR__ . '/../gemini_api_key.php')) { $key = @include __DIR__ . '/../gemini_api_key.php'; }
  if (!$key && is_file(__DIR__ . '/secret_config.php'))     { $key = @include __DIR__ . '/secret_config.php'; }
  $key = is_string($key) ? trim($key) : '';
  return ($key !== '' && $key !== 'TU_CLAVE_AQUI') ? $key : '';
}

// Llamada a Gemini. Devuelve [array|null respuesta, string error]
function ia_gemini($model, $key, $payload, $timeout = 40) {
  $base = getenv('AURUM_GEMINI_BASE') ?: 'https://generativelanguage.googleapis.com';
  $url  = $base . '/v1beta/models/' . rawurlencode($model) . ':generateContent';
  $ch   = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'x-goog-api-key: ' . $key],
    CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_TIMEOUT        => $timeout,
    CURLOPT_CONNECTTIMEOUT => 10,
  ]);
  $resp = curl_exec($ch);
  $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err  = curl_error($ch);
  curl_close($ch);
  if ($resp === false || $code >= 400) return [null, "$model http $code $err " . substr((string) $resp, 0, 300)];
  $data = json_decode((string) $resp, true);
  return [is_array($data) ? $data : null, is_array($data) ? '' : "$model json inválido"];
}

function ia_text($data) {
  $out = '';
  foreach (($data['candidates'][0]['content']['parts'] ?? []) as $p) {
    if (isset($p['text']) && empty($p['thought'])) $out .= $p['text'];
  }
  return trim($out);
}

function ia_extract_json($s) {
  $s = trim((string) $s);
  $s = preg_replace('/^```(?:json)?/i', '', $s);
  $s = trim(preg_replace('/```$/', '', trim($s)));
  $a = strpos($s, '{'); $b = strrpos($s, '}');
  if ($a === false || $b === false || $b < $a) return null;
  $d = json_decode(substr($s, $a, $b - $a + 1), true);
  return is_array($d) ? $d : null;
}

// Fichero subido -> [mime, bytes] o motivo de fallo (string)
function ia_upload($field, $maxBytes, $allowPdf = true) {
  if (empty($_FILES[$field]) || !is_uploaded_file($_FILES[$field]['tmp_name'] ?? '')) return 'sin_archivo';
  $f = $_FILES[$field];
  if (($f['error'] ?? 1) === UPLOAD_ERR_INI_SIZE || ($f['error'] ?? 1) === UPLOAD_ERR_FORM_SIZE) return 'tamano';
  if (($f['error'] ?? 1) !== 0) return 'subida';
  if (($f['size'] ?? 0) <= 0 || $f['size'] > $maxBytes) return 'tamano';
  $bytes = @file_get_contents($f['tmp_name']);
  if ($bytes === false || $bytes === '') return 'lectura';
  $mime = '';
  if (function_exists('finfo_open')) { $fi = finfo_open(FILEINFO_MIME_TYPE); $mime = (string) finfo_file($fi, $f['tmp_name']); finfo_close($fi); }
  if ($mime === '') $mime = (string) ($f['type'] ?? '');
  $mime = strtolower(trim($mime));
  if ($mime === 'image/jpg') $mime = 'image/jpeg';
  $ok = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if ($allowPdf) $ok[] = 'application/pdf';
  if (!in_array($mime, $ok, true)) return 'tipo';
  return [$mime, $bytes];
}
