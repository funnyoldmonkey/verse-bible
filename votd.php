<?php
// API endpoint to fetch the dynamic Verse of the Day
header('Content-Type: application/json');

$version = isset($_GET['version']) ? preg_replace('/[^A-Za-z0-9_-]/', '', $_GET['version']) : 'NIV';
$url = "https://www.biblegateway.com/votd/get/?format=json&version=" . urlencode($version);

// Use cURL (works on virtually all hosting providers, unlike file_get_contents)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Verse Bible App/1.0');
$json = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (!$json || $httpCode !== 200) {
    echo json_encode(['error' => 'Failed to fetch VOTD API']);
    exit;
}

$data = json_decode($json, true);
if (isset($data['votd'])) {
    $text = strip_tags($data['votd']['content']);
    $ref = $data['votd']['display_ref'];
    
    echo json_encode([
        'text' => '"' . trim($text) . '"',
        'ref' => $ref,
        'search' => $ref
    ]);
} else {
    echo json_encode(['error' => 'Invalid VOTD Response']);
}
?>
