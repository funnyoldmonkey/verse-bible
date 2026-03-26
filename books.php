<?php
header('Content-Type: application/json');

$version = isset($_GET['version']) ? trim($_GET['version']) : 'NIV';
$cacheFile = 'data/books_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $version) . '.json';

if (file_exists($cacheFile)) {
    echo file_get_contents($cacheFile);
    exit;
}

$url = 'https://www.biblegateway.com/passage/?search=Genesis+1&version=' . urlencode($version);
$html = @file_get_contents($url);

if (!$html) {
    echo json_encode(['error' => 'Failed to fetch BibleGateway']);
    exit;
}

// Extract embedded book data reliably
if (preg_match('/\[\{"display":"[^"]+","osis":"Gen".*?"osis":"Rev"[^}]*\}\]/s', $html, $matches)) {
    $books = json_decode($matches[0], true);
    if ($books) {
        // Strip out any redundant data like "chapters": null to save space
        $cleaned = [];
        foreach ($books as $b) {
            $cleaned[] = [
                'name' => $b['display'],
                'osis' => $b['osis'],
                'chapters' => $b['num_chapters'],
                'testament' => isset($b['testament']) ? $b['testament'] : 'OT'
            ];
        }
        
        file_put_contents($cacheFile, json_encode($cleaned));
        echo json_encode($cleaned);
        exit;
    }
}

echo json_encode(['error' => 'Could not parse book list for ' . $version]);
