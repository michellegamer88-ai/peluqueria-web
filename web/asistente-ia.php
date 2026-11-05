<?php
// asistente-ia.php — chat de «Ámbar». El navegador habla solo con este archivo;
// la clave de la IA vive en el servidor y nunca se envía al visitante.
require __DIR__ . '/ia-comun.php';
ia_guard();

$MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite']; // capa gratuita: preferente + respaldo

function reply($text, $extra = []) { ia_out(array_merge(['reply' => $text], $extra)); }

$r = ia_rate_check('chat', 8, 100, 1200);
if ($r === 'rate_min')    reply('Vas muy rápido 🙂 Dame unos segundos y vuelve a preguntarme.');
if ($r === 'rate_day')    reply('Hoy ya hemos hablado mucho. Para seguir, déjanos tus datos en el formulario y el equipo te atiende.', ['fallback' => true]);
if ($r === 'rate_global') reply('Estoy muy solicitada ahora mismo. Escríbenos por el formulario de contacto y te respondemos enseguida.', ['fallback' => true]);

$key = ia_key();
if ($key === '') reply('Me estoy terminando de configurar. Mientras tanto, puedes escribirnos desde el formulario de contacto y te respondemos enseguida.', ['fallback' => true]);

$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) $in = [];
$message = trim((string) ($in['message'] ?? ''));
$history = is_array($in['history'] ?? null) ? array_slice($in['history'], -8) : [];
if ($message === '' || mb_strlen($message) > 600) ia_out(['reply' => 'Cuéntamelo en un mensaje algo más corto, por favor.'], 200);

ia_rate_commit();

$system = include __DIR__ . '/knowledge.php';
if (!is_string($system) || $system === '') $system = 'Eres Ámbar, asistente del salón AURUM. Responde breve, en español, solo sobre peluquería y barbería, e invita al estudio capilar gratis.';

$contents = [];
foreach ($history as $h) {
  $text = mb_substr((string) ($h['text'] ?? ''), 0, 1200);
  if ($text === '') continue;
  $contents[] = ['role' => (($h['role'] ?? '') === 'model') ? 'model' : 'user', 'parts' => [['text' => $text]]];
}
$contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];

$payload = [
  'system_instruction' => ['parts' => [['text' => $system]]],
  'contents'           => $contents,
  'generationConfig'   => ['temperature' => 0.5, 'topP' => 0.9, 'maxOutputTokens' => 1500],
  'safetySettings'     => [
    ['category' => 'HARM_CATEGORY_HARASSMENT',        'threshold' => 'BLOCK_ONLY_HIGH'],
    ['category' => 'HARM_CATEGORY_HATE_SPEECH',       'threshold' => 'BLOCK_ONLY_HIGH'],
    ['category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold' => 'BLOCK_ONLY_HIGH'],
    ['category' => 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
  ],
];

$reply = ''; $lastErr = '';
foreach ($MODELS as $m) {
  list($data, $err) = ia_gemini($m, $key, $payload, 30);
  if (!$data) { $lastErr = $err; continue; }
  $reply = ia_text($data);
  if ($reply !== '') break;
  $lastErr = "$m respuesta vacía";
}
if ($reply === '') {
  @error_log('[aurum-chat] ' . $lastErr);
  reply('Ahora mismo no puedo responder. Escríbenos por el formulario de contacto y te ayudamos enseguida.', ['fallback' => true]);
}
reply($reply);
