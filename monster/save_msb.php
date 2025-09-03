<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['content'])) {
        header("HTTP/1.1 400 Bad Request");
        echo "Missing content";
        exit;
    }

    $content = $_POST['content'];
    $file = __DIR__ . '/MonsterSetBase.txt';

    // ghi đè file
    if (file_put_contents($file, $content) !== false) {
        echo "OK";
    } else {
        header("HTTP/1.1 500 Internal Server Error");
        echo "Failed to save file";
    }
} else {
    header("HTTP/1.1 405 Method Not Allowed");
    echo "Only POST allowed";
}