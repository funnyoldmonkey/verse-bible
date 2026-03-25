<?php
$html = file_get_contents('bg_test.html');
if (preg_match('/\[\{"display":"[^"]+","osis":"Gen".*?"osis":"Rev"[^}]*\}\]/s', $html, $matches)) {
    $books = json_decode($matches[0], true);
    if ($books) {
        echo "Found " . count($books) . " books! First is " . $books[0]['display'] . " with " . $books[0]['num_chapters'] . " chapters.\n";
        echo "Last is " . $books[count($books)-1]['display'] . " with " . $books[count($books)-1]['num_chapters'] . " chapters.\n";
    } else {
        echo "Failed to decode JSON\n";
    }
} else {
    echo "Regex failed\n";
}
