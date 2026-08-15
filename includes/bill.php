<?php
/**
 * Slab-wise electricity bill calculation.
 *  First 50 units  -> Rs. 3.50 / unit
 *  Next 100 units  -> Rs. 4.00 / unit
 *  Next 100 units  -> Rs. 5.20 / unit
 *  Above 250 units -> Rs. 6.50 / unit
 */

function calculate_bill(float $units): array
{
    $units = max(0.0, floor($units));

    $slabs = [
        ['label' => 'First 50 units',  'range' => '0 – 50',    'cap' => 50.0,  'rate' => 3.50],
        ['label' => 'Next 100 units',  'range' => '51 – 150',  'cap' => 100.0, 'rate' => 4.00],
        ['label' => 'Next 100 units',  'range' => '151 – 250', 'cap' => 100.0, 'rate' => 5.20],
        ['label' => 'Above 250 units', 'range' => '251+',      'cap' => null,  'rate' => 6.50],
    ];

    $remaining = $units;
    $rows      = [];
    $total     = 0.0;

    foreach ($slabs as $slab) {
        $take = ($slab['cap'] === null) ? $remaining : min($remaining, $slab['cap']);
        $take = max(0.0, $take);
        $cost = $take * $slab['rate'];

        $rows[] = [
            'label' => $slab['label'],
            'range' => $slab['range'],
            'rate'  => $slab['rate'],
            'units' => $take,
            'cost'  => round($cost, 2),
        ];

        $total     += $cost;
        $remaining -= $take;
    }

    return [
        'units' => $units,
        'slabs' => $rows,
        'total' => round($total, 2),
    ];
}
