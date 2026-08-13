<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case Credit = 'credit';
}
