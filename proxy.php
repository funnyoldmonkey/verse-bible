<?php
header('Content-Type: application/json');

// Get and sanitize inputs
$search = isset($_GET['search']) ? trim($_GET['search']) : 'John 1';
$version = isset($_GET['version']) ? trim($_GET['version']) : 'NIV';

// Build the target URL
$url = 'https://www.biblegateway.com/passage/?search=' . urlencode($search) . '&version=' . urlencode($version);

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
$html = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (!$html || $httpcode !== 200) {
    echo json_encode(['error' => 'Failed to fetch content from BibleGateway.']);
    exit;
}

// Suppress DOM parser warnings for HTML5
libxml_use_internal_errors(true);
$dom = new DOMDocument();
// Load HTML, specifying encoding to preserve special characters
$dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
libxml_clear_errors();
$xpath = new DOMXPath($dom);

// Find the main passage text container
$passageTextNodes = $xpath->query('//div[contains(@class, "passage-text")]');
if ($passageTextNodes->length == 0) {
    echo json_encode(['error' => 'Could not find passage text.']);
    exit;
}

// Get the first matched node (we only need one passage)
$passageNode = $passageTextNodes->item(0);

// Find the localized reference (header above the text)
$refNodes = $xpath->query('//*[contains(@class, "dropdown-display-text") or contains(@class, "passage-display")]');
$localizedRef = $search;
if ($refNodes->length > 0) {
    // Get text and clean up any internal fluff
    $localizedRef = trim($refNodes->item(0)->textContent);
    // Remove BibleGateway dropdown artifacts like "Psalm 23 Psalm 23" or trailing version codes
    if (preg_match('/^(.+?)\s+\1/u', $localizedRef, $m)) $localizedRef = $m[1];
    // Strip trailing version name/code: keep only up to the last digit (book + chapter)
    if (preg_match('/^(.+\d)\s+\D.*$/u', $localizedRef, $m)) $localizedRef = $m[1];
}

// We want to aggressively strip BibleGateway clutter like footnotes, cross-references, publisher info
$nodesToRemove = $xpath->query('.//*[contains(@class, "footnote") or contains(@class, "crossreference") or contains(@class, "crossrefs") or contains(@class, "publisher-info-bottom") or contains(@class, "passage-other-trans")]', $passageNode);
foreach ($nodesToRemove as $node) {
    if ($node->parentNode) {
        $node->parentNode->removeChild($node);
    }
}

// Remove empty <p> tags and specific layout divs
$moreNodesToRemove = $xpath->query('.//p[normalize-space()=""] | .//div[contains(@class, "bottom-border")]', $passageNode);
foreach ($moreNodesToRemove as $node) {
    if ($node->parentNode) {
        $node->parentNode->removeChild($node);
    }
}

// Generate the cleaned HTML block
$cleanedHtml = $dom->saveHTML($passageNode);

// Strip out the inline styled SVG and extra fluff if they snuck through
// Just basic replacing of the xml declaration
$cleanedHtml = str_replace('<?xml encoding="utf-8" ?>', '', $cleanedHtml);

// Rewrite all internal links to use our SPA router
$allLinks = $xpath->query('.//a', $passageNode);
foreach ($allLinks as $link) {
    $href = $link->getAttribute('href');
    if (strpos($href, '/passage/') !== false) {
        $targetSearch = getInnerSearchParam($href);
        if ($targetSearch) {
            $link->setAttribute('href', '#read=' . urlencode($targetSearch) . '&v=' . urlencode($version));
        } else {
            $link->removeAttribute('href');
        }
    } else {
        $link->removeAttribute('href'); // Strip external links to stay in reader
    }
}

// Extract the navigation links
$prevLink = '';
$nextLink = '';
$prevNodes = $xpath->query('//a[contains(@class, "prev-chapter")]');
if ($prevNodes->length > 0) {
    $href = $prevNodes->item(0)->getAttribute('href');
    $prevLink = getInnerSearchParam($href);
}
$nextNodes = $xpath->query('//a[contains(@class, "next-chapter")]');
if ($nextNodes->length > 0) {
    $href = $nextNodes->item(0)->getAttribute('href');
    $nextLink = getInnerSearchParam($href);
}

function getInnerSearchParam($href) {
    $parsed = parse_url('https://biblegateway.com' . $href);
    if(isset($parsed['query'])) {
        parse_str($parsed['query'], $queryParts);
        return isset($queryParts['search']) ? $queryParts['search'] : '';
    }
    return '';
}

// Return the constructed JSON
echo json_encode([
    'html' => trim($cleanedHtml),
    'prev' => $prevLink,
    'next' => $nextLink,
    'search' => $localizedRef,
    'version' => $version,
    'url' => $url
]);
?>

// Refresh commit: 20260330-1928
 