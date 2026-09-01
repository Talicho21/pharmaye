<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'root', '@Talicho1995');
    $pdo->exec('CREATE DATABASE IF NOT EXISTS pharmaye CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    echo "Database 'pharmaye' created OK\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
