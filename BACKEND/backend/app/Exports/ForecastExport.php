<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ForecastExport implements FromArray, WithStyles, WithTitle, WithColumnWidths, ShouldAutoSize
{
    protected $data;
    protected $headerRowsCount;

    public function __construct(array $data)
    {
        // $data is the pre-formatted 2D array generated from ReportController/PayrollCalculatorService
        $this->data = $data;
        $this->headerRowsCount = 3; // First 3 rows are typically headers in our specific layout
    }

    public function array(): array
    {
        return $this->data;
    }

    public function title(): string
    {
        return 'Consolidated Forecast';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 45, // GL Accounts column needs to be wide
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $lastRow = count($this->data);
        $lastCol = $sheet->getHighestColumn();
        $fullRange = "A1:{$lastCol}{$lastRow}";

        // Global styles
        $sheet->getStyle($fullRange)->applyFromArray([
            'borders' => [
                'allBorders' => ['borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN],
            ],
            'alignment' => [
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Style numbers
        $sheet->getStyle("B4:{$lastCol}{$lastRow}")->getNumberFormat()
            ->setFormatCode('#,##0.00');

        // Header styles (Top rows)
        $sheet->getStyle("A1:{$lastCol}3")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FF1F2937'] // Dark gray header
            ],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        ]);

        return [];
    }
}
