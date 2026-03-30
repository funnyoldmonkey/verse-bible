<?php
// Scraper to get all versions from BibleGateway natively
$html = @file_get_contents('https://www.biblegateway.com/passage/?search=John+1&version=NIV');
if (!$html) {
    echo "Failed to load BG.";
    exit;
}
$dom = new DOMDocument();
@$dom->loadHTML($html);
$xpath = new DOMXPath($dom);

$options = $xpath->query('//select[@name="version"]/optgroup/option | //select[@name="version"]/option');
$v = [];
foreach($options as $o) {
    if ($o->hasAttribute('value')) {
        $val = $o->getAttribute('value');
        $text = trim($o->textContent);
        if ($val && !isset($v[$val])) {
            $v[$val] = ['id' => $val, 'name' => $text];
        }
    }
}

$list = array_values($v);
if (!is_dir('data')) mkdir('data');
file_put_contents('data/versions.json', json_encode($list, JSON_PRETTY_PRINT));
echo "Scraped " . count($list) . " versions.";
?>

// Refresh commit: 20260330-1928
 