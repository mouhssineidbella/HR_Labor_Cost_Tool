<?php

namespace App\Exports;

use App\Models\Employee;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EmployeesExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    public function collection()
    {
        return Employee::all();
    }

    public function headings(): array
    {
        return [
            // --- 1. INPUTS (Données Personnelles) ---
            'ID',                        
            'Nom',                          
            'Depart',                   
            'Function',                   
            'Type de contrat',            
            'Date d\'encienitée',          
            'Bulletin model',             
            'CIMR Rate',                   
            'Solde congé',                 
            'Unite',                     
            'Cost Centre',               
            'Base Salary',                
            'Attendance bonus',             
            'AID Familial',                
            'Indemnité de transport',      
            'Indemnité de représentation',  
            'Ind Transport Impo',          
            'Ind de panier',                
            'Functional allowance',        
            'Indemnité de transport LL',   

            // --- 2. CALCULS SENIORITY ---
            'Seniority Years',              
            'Seniority %',                 
            'Seniority Allowance',          

            // --- 3. LOYALTY ---
            'Loyalty %',                   
            'Loyalty Allowance',            

            // --- 4. HEURES (Inputs) ---
            'Abs Hours',                   
            'OT 25% (Hours)',               
            'OT 50% (Hours)',             
            'OT 100% (Hours)',            
            'OT Bank Holiday (Hours)',      

            // --- 5. BASE AVEC IMPACT ---
            'Base Salary (with abs impact)',

            // --- 6. MONTANTS OT (Calculés) ---
            'OT 25% (Amount)',              
            'OT 50% (Amount)',           
            'OT 100% (Amount)',             
            'OT Bank Holiday (Amount)',     

            // --- 7. NIGHT SHIFT ---
            'Night Shift Hours',           
            'Night Shift Allowance',       

            // --- 8. RESULTATS FINAUX ---
            'Gross Salary',                
            'Social Security (CNSS)',       
            'Health Insurance (AMO)',       
            'Pension Scheme (CIMR)',       
            'AT',                          
            'Transportation',             
            'Canteen',                    
            'Holidays Accruals',      
            '13th Month',                  
            'Eid Allowance',                
            
            // TOTAL
            'TOTAL COMPANY COST'           
        ];
    }

    public function map($employee): array
    {
        $raw = $employee->raw_data ?? [];
        
        $baseSalary = $employee->base_salary > 0 ? $employee->base_salary : 0;
        $hourlyRate = $baseSalary > 0 ? ($baseSalary / 191) : 0;

        $ot25_hours = floatval($employee->ot_25_hours);
        $ot50_hours = floatval($employee->ot_50_hours);
        $ot100_hours = floatval($employee->ot_100_hours);
        $otHol_hours = floatval($employee->ot_holiday_hours);
        
        $ot25_amount = $ot25_hours * $hourlyRate * 1.25;
        $ot50_amount = $ot50_hours * $hourlyRate * 1.50;
        $ot100_amount = $ot100_hours * $hourlyRate * 2.00;
        $otHol_amount = $otHol_hours * $hourlyRate * 2.00;

        $transportTotal = ($raw[14] ?? 0) + ($raw[16] ?? 0) + ($raw[19] ?? 0); 

        return [
            // --- 1. INPUTS (Raw Data) ---
            $raw[0] ?? '', 
            $raw[1] ?? '',
            $raw[2] ?? '', 
            $raw[3] ?? '', 
            $raw[4] ?? '', 
            $raw[5] ?? '', 
            $raw[6] ?? '',
            $raw[7] ?? '', 
            $raw[8] ?? '', 
            $raw[9] ?? '', 
            $raw[10]?? '', 
            $employee->base_salary, 
            $raw[12]?? 0,  
            $raw[13]?? 0, 
            $raw[14]?? 0,  
            $raw[15]?? 0,  
            $raw[16]?? 0,  
            $raw[17]?? 0,  
            $raw[18]?? 0,  
            $raw[19]?? 0,  

            // --- 2. CALCULS SENIORITY ---
            number_format($employee->seniority_years, 2),
            '', // Seniority % (Calculable si besoin)
            number_format($employee->seniority_allowance, 2),

            // --- 3. LOYALTY ---
            $raw[23] ?? '',
            $raw[24] ?? '', 

            // --- 4. HEURES ---
            $raw[25] ?? 0, 
            $employee->ot_25_hours,
            $employee->ot_50_hours,
            $employee->ot_100_hours,
            $employee->ot_holiday_hours,

            // --- 5. BASE IMPACT ---
            $employee->base_salary, 

            // --- 6. MONTANTS OT ---
            number_format($ot25_amount, 2),
            number_format($ot50_amount, 2),
            number_format($ot100_amount, 2),
            number_format($otHol_amount, 2),

            // --- 7. NIGHT SHIFT ---
            $employee->night_shift_hours,

            // --- 8. RESULTATS ---
            number_format($employee->gross_salary, 2),
            number_format($employee->cnss_amount, 2),
            number_format($employee->amo_amount, 2),
            number_format($employee->cimr_amount, 2),
            number_format($employee->at_amount, 2),
            $transportTotal, // Transportation
            '', // Canteen
            number_format($employee->holidays_accrual, 2),
            number_format($employee->thirteenth_month, 2),
            number_format($employee->eid_allowance, 2),
            
            // TOTAL
            number_format($employee->total_company_cost, 2) . ' MAD',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FFFFFFFF']], 'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF2E86C1']]],
        ];
    }
}