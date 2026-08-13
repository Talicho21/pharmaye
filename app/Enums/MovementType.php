<?php

namespace App\Enums;

enum MovementType: string
{
    case In = 'in';
    case Out = 'out';
    case Adjustment = 'adjustment';
    case Transfer = 'transfer';
}
