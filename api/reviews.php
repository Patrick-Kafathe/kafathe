<?php
declare(strict_types=1);
/**
 * Client reviews API (works on any PHP 7.4+ shared host, no database needed).
 *   GET  ?action=list                  -> approved reviews (public)
 *   POST action=submit                 -> new review, saved as "pending" (public)
 *   GET  ?action=all        [token]    -> every review (admin)
 *   POST action=status      [token]    -> approve / hide / pending (admin)
 *   POST action=delete      [token]    -> delete a review (admin)
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$cfg   = is_file(__DIR__ . '/config.php') ? (require __DIR__ . '/config.php') : [];
$TOKEN = (string)($cfg['admin_token'] ?? '');
$DEFAULT_TOKEN = 'CHANGE-ME-to-a-long-private-phrase';
$MAXH  = (int)($cfg['max_per_hour'] ?? 3);
$STORE = __DIR__ . '/store/reviews.php';
$RATE  = __DIR__ . '/store/rate.php';
$UP    = __DIR__ . '/uploads';
$TOPICS = ['Website', 'Software', 'Database', 'Photography', 'Design', 'Other'];
const GUARD = "<?php http_response_code(403); exit; ?>\n";

if (!is_dir(__DIR__ . '/store')) { @mkdir(__DIR__ . '/store', 0755, true); }
if (!is_dir($UP)) { @mkdir($UP, 0755, true); }

function len(string $s): int { return function_exists('mb_strlen') ? mb_strlen($s) : strlen($s); }
function out($data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fail(string $msg, int $code = 400): void { out(['ok' => false, 'error' => $msg], $code); }

function load_file(string $path): array {
    if (!is_file($path)) return [];
    $raw = (string)file_get_contents($path);
    if (strpos($raw, GUARD) === 0) $raw = substr($raw, strlen(GUARD));
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}
function save_file(string $path, array $data): void {
    $fp = fopen($path, 'c+');
    if (!$fp) fail('Server cannot write to the api/store folder. Set it to writable (755/775).', 500);
    flock($fp, LOCK_EX);
    ftruncate($fp, 0); rewind($fp);
    fwrite($fp, GUARD . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp); flock($fp, LOCK_UN); fclose($fp);
}
function clean(string $s, int $max): string {
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    $s = trim(strip_tags($s));
    return function_exists('mb_substr') ? mb_substr($s, 0, $max) : substr($s, 0, $max);
}
function is_admin(): bool {
    global $TOKEN, $DEFAULT_TOKEN;
    if ($TOKEN === '' || $TOKEN === $DEFAULT_TOKEN) return false;
    $given = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    return is_string($given) && hash_equals($TOKEN, $given);
}
function require_admin(): void {
    global $TOKEN, $DEFAULT_TOKEN;
    if ($TOKEN === '' || $TOKEN === $DEFAULT_TOKEN) fail('Admin actions are off: set a private admin_token in api/config.php first.', 403);
    if (!is_admin()) fail('Wrong admin token.', 401);
}
function public_view(array $r): array {
    return ['id' => $r['id'], 'name' => $r['name'], 'role' => $r['role'], 'rating' => $r['rating'],
            'topic' => $r['topic'], 'text' => $r['text'], 'image' => $r['image'], 'date' => $r['date']];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = [];
if ($method === 'POST') {
    $raw = file_get_contents('php://input', false, null, 0, 1200000);
    $body = json_decode((string)$raw, true);
    if (!is_array($body)) fail('Invalid request.');
}
$action = $method === 'POST' ? (string)($body['action'] ?? '') : (string)($_GET['action'] ?? 'list');

/* ---------- public: approved list ---------- */
if ($action === 'list' && $method === 'GET') {
    $items = array_values(array_filter(load_file($STORE), fn($r) => ($r['status'] ?? '') === 'approved'));
    usort($items, fn($a, $b) => strcmp($b['date'], $a['date']));
    out(['ok' => true, 'items' => array_map('public_view', $items)]);
}

/* ---------- admin: everything ---------- */
if ($action === 'all' && $method === 'GET') {
    require_admin();
    $items = load_file($STORE);
    usort($items, fn($a, $b) => strcmp($b['date'], $a['date']));
    out(['ok' => true, 'items' => array_map(fn($r) => public_view($r) + ['status' => $r['status']], $items)]);
}

/* ---------- public: submit ---------- */
if ($action === 'submit' && $method === 'POST') {
    if (!empty($body['website'])) out(['ok' => true]);                    // honeypot: pretend success to bots
    $name  = clean((string)($body['name'] ?? ''), 60);
    $role  = clean((string)($body['role'] ?? ''), 80);
    $text  = clean((string)($body['text'] ?? ''), 500);
    $topic = (string)($body['topic'] ?? 'Other');
    $rating = (int)($body['rating'] ?? 0);
    if (len($name) < 2) fail('Please enter your name.');
    if (len($text) < 10) fail('Please write a little more (at least 10 characters).');
    if ($rating < 1 || $rating > 5) fail('Please choose a rating.');
    if (!in_array($topic, $TOPICS, true)) $topic = 'Other';
    if (preg_match('~https?://|www\.~i', $text) && substr_count(strtolower($text), 'http') > 1) fail('Please keep links out of the review.');

    // simple per-visitor rate limit
    $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'x') . '|pk');
    $rates = load_file($RATE); $now = time();
    foreach ($rates as $k => $times) { $rates[$k] = array_values(array_filter($times, fn($t) => $t > $now - 3600)); if (!$rates[$k]) unset($rates[$k]); }
    if (count($rates[$ip] ?? []) >= $MAXH) fail('You have sent a few reviews already — please try again later.', 429);
    $rates[$ip][] = $now; save_file($RATE, $rates);

    // optional picture
    $image = '';
    $img = (string)($body['image'] ?? '');
    if ($img !== '') {
        if (!preg_match('~^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$~', $img, $m)) fail('That picture type is not supported.');
        $bin = base64_decode($m[2], true);
        if ($bin === false || strlen($bin) > 700000) fail('That picture is too large.');
        $info = @getimagesizefromstring($bin);
        $okMime = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!$info || !isset($okMime[$info['mime']]) || $info[0] > 4000 || $info[1] > 4000) fail('That picture could not be verified.');
        $fname = bin2hex(random_bytes(10)) . '.' . $okMime[$info['mime']];
        if (@file_put_contents($UP . '/' . $fname, $bin) === false) fail('Could not save the picture.', 500);
        $image = 'api/uploads/' . $fname;
    }

    $items = load_file($STORE);
    $items[] = ['id' => 'r' . bin2hex(random_bytes(6)), 'name' => $name, 'role' => $role, 'rating' => $rating, 'topic' => $topic,
                'text' => $text, 'image' => $image, 'date' => gmdate('c'), 'status' => 'pending'];
    save_file($STORE, $items);

    $to = (string)($cfg['notify_email'] ?? '');
    if ($to !== '' && function_exists('mail')) {
        @mail($to, 'New website review awaiting approval', "From: $name ($role)\nRating: $rating/5\nAbout: $topic\n\n$text\n\nApprove it in your admin panel > Reviews.", "Content-Type: text/plain; charset=UTF-8");
    }
    out(['ok' => true, 'pending' => true]);
}

/* ---------- admin: status / delete ---------- */
if (($action === 'status' || $action === 'delete') && $method === 'POST') {
    require_admin();
    $id = (string)($body['id'] ?? '');
    $items = load_file($STORE); $found = false;
    foreach ($items as $i => $r) {
        if ($r['id'] !== $id) continue;
        $found = true;
        if ($action === 'delete') {
            if (!empty($r['image'])) { $f = $UP . '/' . basename($r['image']); if (is_file($f)) @unlink($f); }
            array_splice($items, $i, 1);
        } else {
            $st = (string)($body['status'] ?? '');
            if (!in_array($st, ['approved', 'hidden', 'pending'], true)) fail('Bad status.');
            $items[$i]['status'] = $st;
        }
        break;
    }
    if (!$found) fail('Review not found.', 404);
    save_file($STORE, array_values($items));
    out(['ok' => true]);
}

fail('Unknown action.', 404);
