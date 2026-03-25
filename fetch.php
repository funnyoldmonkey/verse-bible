<?php
$html = file_get_contents('https://www.biblegateway.com/passage/?search=Genesis+1&version=RVR1960');
file_put_contents('bg_test.html', $html);
echo "Done.";
