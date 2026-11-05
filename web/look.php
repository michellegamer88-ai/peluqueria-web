<?php
// look.php — dibuja con IA cómo quedaría el look sugerido sobre la foto del visitante.
// La foto no se guarda. Si la IA de imágenes no está disponible, devuelve ok:false
// y la web dibuja una ilustración del look en su lugar (nunca se queda vacía).
require __DIR__ . '/ia-comun.php';
ia_guard();

$r = ia_rate_check('look', 3, 8, 150);
if ($r !== '') ia_out(['ok' => false, 'reason' => $r]);

$up = ia_upload('foto', 8 * 1024 * 1024, false);
if (is_string($up)) ia_out(['ok' => false, 'reason' => $up]);
list($mime, $bytes) = $up;

$desc = trim((string) ($_POST['descripcion'] ?? ''));
$desc = mb_substr(preg_replace('/[\r\n\t]+/', ' ', $desc), 0, 280);
if ($desc === '') $desc = 'a polished, flattering modern haircut with healthy shine';

$key = ia_key();
if ($key === '') ia_out(['ok' => false, 'reason' => 'sin_clave']);
ia_rate_commit();

$prompt = 'Edit this photo. Keep exactly the same person, face, skin, expression, pose, clothing, framing, lighting and background. '
        . 'Change ONLY the hair to this new salon look: ' . $desc . '. '
        . 'Photorealistic, natural hairline, healthy glossy hair as if just styled in a premium salon. No text, no watermark.';

$payload = [
  'contents' => [[ 'role' => 'user', 'parts' => [
    ['inline_data' => ['mime_type' => $mime, 'data' => base64_encode($bytes)]],
    ['text' => $prompt],
  ]]],
  'generationConfig' => ['responseModalities' => ['TEXT', 'IMAGE'], 'temperature' => 0.4],
];

$lastErr = '';
foreach (['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview', 'gemini-2.0-flash-preview-image-generation'] as $m) {
  list($data, $err) = ia_gemini($m, $key, $payload, 90);
  if (!$data) { $lastErr .= ' | ' . $err; continue; }
  foreach (($data['candidates'][0]['content']['parts'] ?? []) as $p) {
    $inl = $p['inlineData'] ?? ($p['inline_data'] ?? null);
    if ($inl && !empty($inl['data'])) {
      $mt = $inl['mimeType'] ?? ($inl['mime_type'] ?? 'image/png');
      ia_out(['ok' => true, 'image' => 'data:' . $mt . ';base64,' . $inl['data']]);
    }
  }
  $lastErr .= " | $m sin imagen";
}
@error_log('[aurum-look]' . $lastErr);
ia_out(['ok' => false, 'reason' => 'ia']);
