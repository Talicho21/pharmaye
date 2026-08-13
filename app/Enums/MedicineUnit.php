<?php

namespace App\Enums;

enum MedicineUnit: string
{
    case Tablet = 'tablet';
    case Capsule = 'capsule';
    case Bottle = 'bottle';
    case Box = 'box';
    case Vial = 'vial';
    case Ampoule = 'ampoule';
    case Sachet = 'sachet';
    case Strip = 'strip';
    case Tube = 'tube';
    case Pack = 'pack';
    case Piece = 'piece';
    case Other = 'other';

    /**
     * Map free-form legacy unit strings (e.g. "PKT", "Tabs") onto the enum.
     */
    public static function fromLegacy(?string $raw): self
    {
        $normalized = strtolower(trim((string) $raw));

        return match (true) {
            $normalized === '' => self::Piece,
            str_contains($normalized, 'tab') => self::Tablet,
            str_contains($normalized, 'cap') => self::Capsule,
            str_contains($normalized, 'bot') || str_contains($normalized, 'btl') => self::Bottle,
            str_contains($normalized, 'box') => self::Box,
            str_contains($normalized, 'vial') => self::Vial,
            str_contains($normalized, 'amp') => self::Ampoule,
            str_contains($normalized, 'sach') => self::Sachet,
            str_contains($normalized, 'strip') => self::Strip,
            str_contains($normalized, 'tube') => self::Tube,
            str_contains($normalized, 'pkt') || str_contains($normalized, 'pack') => self::Pack,
            str_contains($normalized, 'pc') || str_contains($normalized, 'piece') => self::Piece,
            default => self::Other,
        };
    }
}
