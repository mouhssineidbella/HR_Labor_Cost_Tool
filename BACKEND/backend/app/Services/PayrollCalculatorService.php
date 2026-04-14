<?php

namespace App\Services;

use Carbon\Carbon;

class PayrollCalculatorService
{
   
    public function calculateRow(array $input): array
    {
        // 0. NETTOYAGE DES DONNÉES (Safety First)
        $baseSalary = $this->parseNumber($input['base_salary'] ?? 0);
        
        $seniorityDateStr = $input['seniority_date'] ?? null;
        $seniorityDate = null;
        if ($seniorityDateStr) {
            try {
                $seniorityDate = ($seniorityDateStr instanceof Carbon) 
                    ? $seniorityDateStr 
                    : Carbon::parse($seniorityDateStr);
            } catch (\Exception $e) {
                $seniorityDate = null;
            }
        }

        // OT Hours
        $ot25Hours = $this->parseNumber($input['ot_25_hours'] ?? 0);
        $ot50Hours = $this->parseNumber($input['ot_50_hours'] ?? 0);
        $ot100Hours = $this->parseNumber($input['ot_100_hours'] ?? 0);
        $otHolidayHours = $this->parseNumber($input['ot_holiday_hours'] ?? 0);
        $nightShiftHours = $this->parseNumber($input['night_shift_hours'] ?? 0);

        // Allowances (Primes)
        $transportAllow = $this->parseNumber($input['transport_allowance'] ?? 0);
        $represAllow = $this->parseNumber($input['representation_allowance'] ?? 0);
        $panierAllow = $this->parseNumber($input['panier_allowance'] ?? 0);
        $funcAllow = $this->parseNumber($input['functional_allowance'] ?? 0);
        $aidFamilial = $this->parseNumber($input['aid_familial'] ?? 0);
        $transportImpo = $this->parseNumber($input['transport_impo'] ?? 0);

        // Autres
        $cimrRate = $this->parseNumber($input['cimr_rate'] ?? 0);
        $soldeConge = $this->parseNumber($input['solde_conge'] ?? 0);


        // 1. LOGIC DE BASE

        $hoursDivisor = 191; 
        $hourlyRate = ($baseSalary > 0) ? ($baseSalary / $hoursDivisor) : 0;
        

        // 2. CALCUL ANCIENNETÉ (Seniority)

        $seniorityYears = 0;
        $seniorityPercent = 0;

        if ($seniorityDate) {
            $seniorityYears = $seniorityDate->floatDiffInYears(now());
            
            $seniorityPercent = match (true) {
                $seniorityYears < 2 => 0,
                $seniorityYears < 5 => 0.05,
                $seniorityYears < 12 => 0.10,
                $seniorityYears < 20 => 0.15,
                $seniorityYears < 25 => 0.20,
                default => 0.25,
            };
        }

        $seniorityAllowance = $baseSalary * $seniorityPercent;


        // 3. CALCUL OVERTIME

        $ot25Amount = $hourlyRate * $ot25Hours * 1.25; 
        $ot50Amount = $hourlyRate * $ot50Hours * 1.50; 
        $ot100Amount = $hourlyRate * $ot100Hours * 2.00;
        $otHolidayAmount = $hourlyRate * $otHolidayHours * 2.00; 
        
        $nightShiftAmount = $nightShiftHours * $hourlyRate * 0.20; 

        $otTotalAmount = $ot25Amount + $ot50Amount + $ot100Amount + $otHolidayAmount + $nightShiftAmount;


        // 4. GROSS SALARY (SALAIRE BRUT)

        $grossSalary = $baseSalary 
                     + $seniorityAllowance
                     + $otTotalAmount
                     + $transportAllow
                     + $represAllow
                     + $panierAllow
                     + $funcAllow
                     + $aidFamilial
                     + $transportImpo;


        // 5. CHARGES SOCIALES (CNSS, AMO, CIMR)
        
        $cnssBase = min($grossSalary, 6000);
       
        $cnssAmount = ($cnssBase * 0.0898) + ($grossSalary * 0.1437); 

        $amoAmount = ($grossSalary * 0.0226) + ($grossSalary * 0.0211); 

        $cimrAmount = $grossSalary * $cimrRate;
        $atAmount = $grossSalary * 0.0033; 

        // 6. PROVISIONS (Coûts Annuels / 12)

        $holidaysAccrual = ($soldeConge > 0) ? (1.5 * $baseSalary / 26) : 0; 
        $thirteenthMonth = ($seniorityYears >= 1) ? ($baseSalary / 12) : 0;

        $eidAllowance = 200 / 12; 

        // 7. TOTAL COMPANY COST
        $totalCost = $grossSalary 
                   + $cnssAmount 
                   + $amoAmount 
                   + $cimrAmount 
                   + $atAmount 
                   + $holidaysAccrual 
                   + $thirteenthMonth 
                   + $eidAllowance;

        return [
            'seniority_years'       => round($seniorityYears, 2),
            'seniority_allowance'   => round($seniorityAllowance, 2),
            'ot_total_amount'       => round($otTotalAmount, 2),
            'gross_salary'          => round($grossSalary, 2),
            'cnss_amount'           => round($cnssAmount, 2),
            'amo_amount'            => round($amoAmount, 2),
            'cimr_amount'           => round($cimrAmount, 2),
            'at_amount'             => round($atAmount, 2),
            'holidays_accrual'      => round($holidaysAccrual, 2),
            'thirteenth_month'      => round($thirteenthMonth, 2),
            'eid_allowance'         => round($eidAllowance, 2),
            'total_company_cost'    => round($totalCost, 2)
        ];
    }

    private function parseNumber($value)
    {
        if (is_null($value) || $value === '') return 0.0;
        if (is_numeric($value)) return (float)$value;

        $string = (string)$value;
        $cleaned = preg_replace('/[^0-9.]/', '', $string);

        return is_numeric($cleaned) ? (float)$cleaned : 0.0;
    }
}