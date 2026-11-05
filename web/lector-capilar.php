<?php
// lector-capilar.php — lee una FOTO del cabello o un PDF/foto de un ticket de
// peluquería con IA y devuelve un diagnóstico orientativo + el gasto, en JSON.
// La foto no se guarda: se envía a la IA y se descarta.
require __DIR__ . '/ia-comun.php';
ia_guard();

$r = ia_rate_check('lector', 6, 30, 400);
if ($r !== '') ia_out(['ok' => false, 'reason' => $r]);

$up = ia_upload('archivo', 10 * 1024 * 1024, true);
if (is_string($up)) ia_out(['ok' => false, 'reason' => $up]);
list($mime, $bytes) = $up;

$key = ia_key();
if ($key === '') ia_out(['ok' => false, 'reason' => 'sin_clave']);
ia_rate_commit();

$INSTR = <<<'TXT'
Eres el asistente de diagnóstico capilar ORIENTATIVO de un salón de peluquería y barbería. Recibes UNA de estas cosas:
(a) una FOTO donde se ve el cabello (o la barba) de una persona, o
(b) un DOCUMENTO (PDF o foto) de un ticket, factura o presupuesto de peluquería, barbería o productos capilares.

Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin texto adicional ni ```), con EXACTAMENTE esta forma:
{
  "tipo_entrada": "foto_cabello" | "documento_gasto" | "otro",
  "diagnostico": {
    "tipo_cabello": "liso" | "ondulado" | "rizado" | "afro" | null,
    "grosor": "fino" | "medio" | "grueso" | null,
    "longitud": "muy corto" | "corto" | "medio" | "largo" | "muy largo" | null,
    "color_actual": string o null,
    "color_hex": "#RRGGBB" o null,
    "teñido": true | false | null,
    "estado_puntuacion": entero 1-10 o null,
    "danos": [strings cortos, p. ej. "puntas abiertas", "frizz", "sequedad", "rotura por decoloración"],
    "barba": true | false | null,
    "observaciones": string corto o null
  },
  "gasto": {
    "gasto_total_eur": number o null,
    "periodo": "visita" | "mensual" | "anual" | "otro" | null,
    "conceptos": [{"concepto": string, "importe_eur": number o null}],
    "establecimiento": string o null,
    "fecha": string o null
  },
  "recomendacion": {
    "tratamiento": "hidratacion" | "reconstruccion" | "keratina" | "anticaida" | "color" | "mantenimiento",
    "tratamiento_nombre": string corto,
    "motivo": string de 1 frase,
    "look_sugerido": string corto (nombre del look),
    "descripcion_look": string de 1-2 frases, concreta (largo, capas, forma, color),
    "longitud_sugerida": "muy corto" | "corto" | "medio" | "largo",
    "textura_sugerida": "liso" | "ondulado" | "rizado",
    "color_sugerido_hex": "#RRGGBB",
    "flequillo": true | false
  }
}

Reglas estrictas:
- "diagnostico": SOLO lo que se ve en la foto. Si es un documento, pon null en todo salvo lo que el documento diga explícitamente. Si no se ve con seguridad, null. No inventes.
- "gasto": SOLO importes que aparezcan escritos en el documento. Si es una foto de cabello, todo null y "conceptos": []. NUNCA estimes precios.
- Números con PUNTO decimal, sin símbolo €.
- "recomendacion": sí es una sugerencia profesional tuya basada en lo observado (si no hay datos, recomienda "mantenimiento" y un look clásico favorecedor).
- No es un diagnóstico médico. Si ves posibles problemas del cuero cabelludo (calvas, placas, heridas), indícalo en "observaciones" sugiriendo consultar a un dermatólogo.
- No identifiques a la persona ni comentes su físico más allá del cabello y la barba.
- Si la imagen no muestra cabello ni es un documento de gasto, "tipo_entrada": "otro".
TXT;

$payload = [
  'contents' => [[
    'role'  => 'user',
    'parts' => [['inline_data' => ['mime_type' => $mime, 'data' => base64_encode($bytes)]], ['text' => $INSTR]],
  ]],
  'generationConfig' => ['temperature' => 0.2, 'maxOutputTokens' => 1400, 'responseMimeType' => 'application/json', 'thinkingConfig' => ['thinkingBudget' => 0]],
];

$parsed = null; $lastErr = '';
foreach (['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as $m) {
  list($data, $err) = ia_gemini($m, $key, $payload, 50);
  if (!$data) { $lastErr .= ' | ' . $err; continue; }
  $parsed = ia_extract_json(ia_text($data));
  if ($parsed) break;
  $lastErr .= " | $m sin JSON";
}
if (!$parsed) { @error_log('[aurum-lector]' . $lastErr); ia_out(['ok' => false, 'reason' => 'ia']); }

// ---- Validar y normalizar (lo que no encaja -> null; nunca inventamos) ----
function en($v, $allowed) { $v = is_string($v) ? mb_strtolower(trim($v)) : null; return in_array($v, $allowed, true) ? $v : null; }
function txt($v, $max = 160) { return (is_string($v) && trim($v) !== '') ? mb_substr(trim($v), 0, $max) : null; }
function hex($v) { return (is_string($v) && preg_match('/^#[0-9a-fA-F]{6}$/', trim($v))) ? strtoupper(trim($v)) : null; }
function bol($v) { return is_bool($v) ? $v : null; }
function num($v) {
  if ($v === null || $v === '') return null;
  if (is_int($v) || is_float($v)) return $v >= 0 ? round((float) $v, 2) : null;
  $s = str_replace([' ', "\xc2\xa0", '€', 'EUR'], '', (string) $v);
  if (strpos($s, ',') !== false && strpos($s, '.') === false) $s = str_replace(',', '.', $s); else $s = str_replace(',', '', $s);
  return (is_numeric($s) && (float) $s >= 0) ? round((float) $s, 2) : null;
}

$dg = is_array($parsed['diagnostico'] ?? null) ? $parsed['diagnostico'] : [];
$gs = is_array($parsed['gasto'] ?? null) ? $parsed['gasto'] : [];
$rc = is_array($parsed['recomendacion'] ?? null) ? $parsed['recomendacion'] : [];

$score = $dg['estado_puntuacion'] ?? null;
$score = (is_numeric($score) && $score >= 1 && $score <= 10) ? (int) round($score) : null;
$danos = [];
foreach ((is_array($dg['danos'] ?? null) ? $dg['danos'] : []) as $d) { $t = txt($d, 40); if ($t) $danos[] = $t; }
$conceptos = [];
foreach ((is_array($gs['conceptos'] ?? null) ? $gs['conceptos'] : []) as $c) {
  if (!is_array($c)) continue;
  $t = txt($c['concepto'] ?? null, 60); if (!$t) continue;
  $conceptos[] = ['concepto' => $t, 'importe_eur' => num($c['importe_eur'] ?? null)];
}
$tipo = en($parsed['tipo_entrada'] ?? null, ['foto_cabello', 'documento_gasto', 'otro']) ?: 'otro';
$trat = en($rc['tratamiento'] ?? null, ['hidratacion', 'reconstruccion', 'keratina', 'anticaida', 'color', 'mantenimiento']) ?: 'mantenimiento';

$out = [
  'tipo_entrada' => $tipo,
  'diagnostico'  => [
    'tipo_cabello'      => en($dg['tipo_cabello'] ?? null, ['liso', 'ondulado', 'rizado', 'afro']),
    'grosor'            => en($dg['grosor'] ?? null, ['fino', 'medio', 'grueso']),
    'longitud'          => en($dg['longitud'] ?? null, ['muy corto', 'corto', 'medio', 'largo', 'muy largo']),
    'color_actual'      => txt($dg['color_actual'] ?? null, 40),
    'color_hex'         => hex($dg['color_hex'] ?? null),
    'tenido'            => bol($dg['teñido'] ?? ($dg['tenido'] ?? null)),
    'estado_puntuacion' => $score,
    'danos'             => array_slice($danos, 0, 6),
    'barba'             => bol($dg['barba'] ?? null),
    'observaciones'     => txt($dg['observaciones'] ?? null, 220),
  ],
  'gasto' => [
    'gasto_total_eur' => num($gs['gasto_total_eur'] ?? null),
    'periodo'         => en($gs['periodo'] ?? null, ['visita', 'mensual', 'anual', 'otro']),
    'conceptos'       => array_slice($conceptos, 0, 12),
    'establecimiento' => txt($gs['establecimiento'] ?? null, 60),
    'fecha'           => txt($gs['fecha'] ?? null, 30),
  ],
  'recomendacion' => [
    'tratamiento'        => $trat,
    'tratamiento_nombre' => txt($rc['tratamiento_nombre'] ?? null, 60),
    'motivo'             => txt($rc['motivo'] ?? null, 220),
    'look_sugerido'      => txt($rc['look_sugerido'] ?? null, 60),
    'descripcion_look'   => txt($rc['descripcion_look'] ?? null, 280),
    'longitud_sugerida'  => en($rc['longitud_sugerida'] ?? null, ['muy corto', 'corto', 'medio', 'largo']),
    'textura_sugerida'   => en($rc['textura_sugerida'] ?? null, ['liso', 'ondulado', 'rizado']),
    'color_sugerido_hex' => hex($rc['color_sugerido_hex'] ?? null),
    'flequillo'          => bol($rc['flequillo'] ?? null),
  ],
];
// Si es una foto de cabello, el gasto nunca sale de la IA
if ($tipo === 'foto_cabello') $out['gasto'] = ['gasto_total_eur' => null, 'periodo' => null, 'conceptos' => [], 'establecimiento' => null, 'fecha' => null];

ia_out(['ok' => true, 'data' => $out, 'es_imagen' => strpos($mime, 'image/') === 0]);
