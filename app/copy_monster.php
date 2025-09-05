<?php
// Hiển thị lỗi để dễ debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json; charset=utf-8");

// Xác định đường dẫn
$source = dirname(__FILE__) . "/../monster/MonsterSetBase.txt";
$dest   = "C:/Muserver/data/monster/MonsterSetBase.txt";

// Kiểm tra file nguồn
if (!file_exists($source)) {
    echo json_encode(array("success" => false, "error" => "Không tìm thấy file nguồn: " . $source));
    exit;
}

// Kiểm tra thư mục đích
if (!is_dir(dirname($dest))) {
    echo json_encode(array("success" => false, "error" => "Không tìm thấy thư mục đích: " . dirname($dest)));
    exit;
}

// Thử copy
if (@copy($source, $dest)) {
    echo json_encode(array("success" => true, "message" => "Đã copy thành công sang " . $dest));
} else {
    echo json_encode(array("success" => false, "error" => "Không thể copy file. Kiểm tra quyền ghi vào " . $dest));
}
?>