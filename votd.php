<?php
// API endpoint to fetch the dynamic Verse of the Day
header('Content-Type: application/json');

$version = isset($_GET['version']) ? preg_replace('/[^A-Za-z0-9_-]/', '', $_GET['version']) : 'NIV';
$url = "https://www.biblegateway.com/votd/get/?format=json&version=" . urlencode($version);

$json = @file_get_contents($url);
if (!$json) {
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
