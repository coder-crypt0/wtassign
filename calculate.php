<?php
/**
 * AJAX endpoint — receives "units" (POST), returns the slab breakdown as JSON.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/includes/bill.php';

$raw = $_POST['units'] ?? '';

if (!is_string($raw) || $raw === '' || !is_numeric($raw)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please enter a valid number of units.']);
    exit;
}

$units = (float) $raw;

if ($units < 0) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Units cannot be negative.']);
    exit;
}

$units = min($units, 99999); // meter register capacity

echo json_encode(['ok' => true] + calculate_bill($units));
