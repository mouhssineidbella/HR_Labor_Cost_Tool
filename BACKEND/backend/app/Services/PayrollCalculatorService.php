<?php

namespace App\Services;

use Carbon\Carbon;
use App\Models\Setting;

/**
 * =====================================================================
 * PayrollCalculatorService — SINGLE SOURCE OF TRUTH
 * =====================================================================
 * 
 * Centralized calculation engine for ALL payroll math in the system.
 * Replicates exact Yazaki Excel formulas for Moroccan labor costs.
 * 
 * IMPORTANT: No other file (controller, frontend, etc.) should contain
 * payroll math. All calculations MUST go through this service.
 * 
 * Formulas aligned with: MaZone.jsx / Forecast.jsx (Excel Template)
 * =====================================================================
 */
class PayrollCalculatorService
{
    // --- CONFIG CACHE (loaded once from DB) ---
    private ?array $config = null;

    // --- CONSTANTS ---
    private const HOURS_DIVISOR = 191;

    // --- GL ACCOUNT REGISTRY (Yazaki Budget Lines) ---
    public const GL_ACCOUNTS = [
        ['code' => 'YZK_7310000', 'label' => 'YZK_7310000 - Salaries - Basic'],
        ['code' => 'YZK_7312000', 'label' => 'YZK_7312000 - Regular salaries allowances (monthly)'],
        ['code' => 'YZK_7340000', 'label' => 'YZK_7340000 - Salaries - Bonus'],
        ['code' => 'YZK_7330000', 'label' => 'YZK_7330000 - Salaries - Overtime'],
        ['code' => 'YZK_7326000', 'label' => 'YZK_7326000 - Salaries - Accrued Payroll Expenses'],
        ['code' => 'YZK_7321000', 'label' => 'YZK_7321000 - 3th month or more salaries (accrual and payout)'],
        ['code' => 'YZK_7370010', 'label' => 'YZK_7370010 - Social Security'],
        ['code' => 'YZK_7415000', 'label' => 'YZK_7415000 - Benefits - Medical'],
        ['code' => 'YZK_7405000', 'label' => 'YZK_7405000 - Benefits - Company Pension'],
        ['code' => 'YZK_7370020', 'label' => 'YZK_7370020 - Local Social Taxation 1'],
        ['code' => 'YZK_7428000', 'label' => 'YZK_7428000 - Benefits - Employee Transport'],
        ['code' => 'YZK_7440000', 'label' => 'YZK_7440000 - Benefits - Cafeteria Services'],
    ];

    // --- CATEGORY DEFINITIONS ---
    public const CATEGORIES = ['Direct', 'Indirect', 'Support', 'SGA'];

    // =====================================================================
    // PUBLIC API — Entry Points
    // =====================================================================

    /**
     * GET CATEGORY FROM FUNCTION NAME
     * 
     * Maps a job function name to its cost category.
     * Priority: Indirect > Direct > Support > SGA (default)
     * Replicates exact logic from Forecast.jsx getCategoryFromFunction()
     */
    public static function getCategoryFromFunction(?string $funcName): string
    {
        $f = strtolower(trim($funcName ?? ''));

        // 1. INDIRECT (Priority 1 — must check before "Direct")
        if (
            str_contains($f, 'indirect') ||
            str_contains($f, 'technician') ||
            str_contains($f, 'maintenance') ||
            str_contains($f, 'quality') ||
            str_contains($f, 'supervisor')
        ) {
            return 'Indirect';
        }

        // 2. DIRECT (Priority 2)
        if (str_contains($f, 'direct') || str_contains($f, 'operator')) {
            return 'Direct';
        }

        // 3. SUPPORT (Priority 3)
        if (
            str_contains($f, 'logistics') ||
            str_contains($f, 'engineer') ||
            str_contains($f, 'support') ||
            str_contains($f, 'it')
        ) {
            return 'Support';
        }

        // 4. SGA (HR, Finance, Managers)
        if (
            str_contains($f, 'hr') ||
            str_contains($f, 'accountant') ||
            str_contains($f, 'finance') ||
            str_contains($f, 'manager') ||
            str_contains($f, 'admin')
        ) {
            return 'SGA';
        }

        return 'SGA'; // Default fallback
    }

    /**
     * GET CATEGORY FOR AN ACTUAL HC ROW
     * 
     * For actual employees, category comes from the Unite/Category/Department
     * column in the Excel. Falls back to function-based mapping.
     */
    public static function getCategoryFromActualRow(array $row): string
    {
        $category = trim($row['Unite'] ?? $row['Category'] ?? $row['Department'] ?? '');
        if ($category !== '') {
            return $category;
        }
        return self::getCategoryFromFunction($row['Function'] ?? $row['function'] ?? null);
    }

    /**
     * CHECK IF EMPLOYEE IS ACTIVE IN A GIVEN MONTH
     * 
     * An employee is active if their start date is on or before
     * the last day of the given month.
     */
    public function isActiveInMonth($startDateRaw, Carbon $monthStart): bool
    {
        if (!$startDateRaw && $startDateRaw !== 0) return true; // No date = always active

        $startDate = $this->parseDate($startDateRaw);
        if (!$startDate) return true; // Unparseable = assume active

        $endOfMonth = $monthStart->copy()->endOfMonth();
        return $startDate->lte($endOfMonth);
    }

    /**
     * BUILD CONSOLIDATED FORECAST REPORT
     * 
     * Aggregates Actual HC + Projections by Category × GL Account × Month.
     * Returns the same matrix structure that Forecast.jsx builds for Excel export,
     * but computed entirely server-side.
     * 
     * @param array $actualRows  Array of raw payroll rows (from payroll_data JSON)
     * @param array $projections Array of projection records (from projections table)
     * @param int|null $year     Target year (defaults to current year)
     * @return array Consolidated report structure
     */
    public function buildConsolidatedReport(array $actualRows, array $projections, ?int $year = null): array
    {
        $targetYear = $year ?? now()->year;

        // Build 12 month columns
        $months = [];
        for ($i = 0; $i < 12; $i++) {
            $months[] = Carbon::create($targetYear, $i + 1, 1);
        }
        $monthLabels = array_map(fn(Carbon $m) => $m->format('Y-m'), $months);

        // Pre-calculate all actual rows through the service
        $calculatedActuals = [];
        foreach ($actualRows as $row) {
            $calculatedActuals[] = $this->calculateActualHC($row);
        }

        // Pre-calculate all projections through the service
        $calculatedProjections = [];
        foreach ($projections as $proj) {
            $projData = is_array($proj) ? $proj : $proj->toArray();
            $calcResult = $this->calculateProjection($projData);
            $calculatedProjections[] = array_merge($projData, $calcResult);
        }

        // Build the matrix: Category → { headcount: [...], gl_accounts: { code: [...] }, total: [...] }
        $report = [];
        $grandTotals = array_fill(0, 12, 0);

        foreach (self::CATEGORIES as $catName) {
            // Filter actuals by category
            $catActuals = array_filter($calculatedActuals, function ($row) use ($catName) {
                return strtolower(self::getCategoryFromActualRow($row)) === strtolower($catName);
            });

            // Filter projections by function → category mapping
            $catProjections = array_filter($calculatedProjections, function ($proj) use ($catName) {
                $mapped = self::getCategoryFromFunction($proj['function'] ?? '');
                return strtolower($mapped) === strtolower($catName);
            });

            if (empty($catActuals) && empty($catProjections)) continue;

            // Headcount per month
            $headcount = [];
            foreach ($months as $idx => $mDate) {
                $activeActuals = 0;
                foreach ($catActuals as $emp) {
                    $dateKey = $emp["date d'ancienneté"] ?? $emp["Date d'ancienneté"] ?? $emp["Seniority Date"] ?? null;
                    if ($this->isActiveInMonth($dateKey, $mDate)) {
                        $activeActuals++;
                    }
                }

                $activeProjections = 0;
                foreach ($catProjections as $proj) {
                    if ($this->isActiveInMonth($proj['start_date'] ?? null, $mDate)) {
                        $activeProjections++;
                    }
                }

                $headcount[] = $activeActuals + $activeProjections;
            }

            // GL Account totals per month
            $glData = [];
            $categoryMonthTotals = array_fill(0, 12, 0);

            foreach (self::GL_ACCOUNTS as $gl) {
                $glCode = $gl['code'];
                $glMonthly = [];

                foreach ($months as $idx => $mDate) {
                    $total = 0;

                    // Sum actuals for this GL in this month
                    foreach ($catActuals as $emp) {
                        $dateKey = $emp["date d'ancienneté"] ?? $emp["Date d'ancienneté"] ?? $emp["Seniority Date"] ?? null;
                        if ($this->isActiveInMonth($dateKey, $mDate)) {
                            $total += (float)($emp[$glCode] ?? 0);
                        }
                    }

                    // Sum projections — map GL codes to projection fields
                    foreach ($catProjections as $proj) {
                        if ($this->isActiveInMonth($proj['start_date'] ?? null, $mDate)) {
                            $total += $this->getProjectionGLValue($proj, $glCode);
                        }
                    }

                    $glMonthly[] = round($total, 2);
                    $categoryMonthTotals[$idx] += $total;
                }

                $glData[] = [
                    'code'    => $glCode,
                    'label'   => $gl['label'],
                    'monthly' => $glMonthly,
                    'total'   => round(array_sum($glMonthly), 2),
                ];
            }

            // Accumulate grand totals
            foreach ($categoryMonthTotals as $idx => $val) {
                $grandTotals[$idx] += $val;
            }

            $report[] = [
                'category'     => $catName,
                'headcount'    => $headcount,
                'gl_accounts'  => $glData,
                'monthly_totals' => array_map(fn($v) => round($v, 2), $categoryMonthTotals),
                'annual_total' => round(array_sum($categoryMonthTotals), 2),
            ];
        }

        return [
            'year'         => $targetYear,
            'months'       => $monthLabels,
            'gl_registry'  => self::GL_ACCOUNTS,
            'categories'   => $report,
            'grand_totals' => [
                'monthly' => array_map(fn($v) => round($v, 2), $grandTotals),
                'annual'  => round(array_sum($grandTotals), 2),
            ],
        ];
    }

    // =====================================================================
    // PUBLIC API — Calculation Entry Points
    // =====================================================================

    /**
     * 1. CALCULATE ACTUAL HC (Excel Upload Row)
     * 
     * Accepts a raw Excel row with original header names and returns
     * the same row enriched with all computed columns.
     * Used by: PayrollController::store() (during Excel import)
     * 
     * @param array $row Raw Excel row with original headers
     * @return array The same row + all computed fields appended
     */
    public function calculateActualHC(array $row): array
    {
        $config = $this->getConfig();

        // --- EXTRACT RAW VALUES FROM EXCEL HEADERS ---
        $baseSalary = $this->parseVal($row['Base Salary'] ?? $row['Base salary'] ?? 0);

        // Seniority date (multiple possible header names + Excel serial)
        $dateKeys = ["date d'ancienneté", "Date d'ancienneté", "Seniority Date", "date_d_anciennete"];
        $seniorityDateRaw = null;
        $foundDateKey = null;
        foreach ($dateKeys as $key) {
            if (isset($row[$key]) && $row[$key] !== null && $row[$key] !== '') {
                $seniorityDateRaw = $row[$key];
                $foundDateKey = $key;
                break;
            }
        }

        $seniorityDate = $this->parseDate($seniorityDateRaw);
        $seniorityYears = $this->calcSeniorityYears($seniorityDate);
        $seniorityRate = $this->getSeniorityRate($seniorityYears);
        $seniorityAllowance = $baseSalary * $seniorityRate;

        // Format seniority date for display (DD/MM/YYYY)
        if ($foundDateKey && $seniorityDate) {
            $row[$foundDateKey] = $seniorityDate->format('d/m/Y');
        }

        // Loyalty
        $loyaltyRate = $this->parseVal($row['Loyalty %'] ?? 0);
        $loyaltyAllowance = $baseSalary * $loyaltyRate;

        // Base with Abs impact
        $absHours = $this->parseVal($row['Abs hours'] ?? 0);
        $baseWithAbs = (self::HOURS_DIVISOR - $absHours) * ($baseSalary / self::HOURS_DIVISOR);

        // Overtime
        $hourlyRate = $baseSalary / self::HOURS_DIVISOR;
        $ot25Hours = $this->parseVal($row['OT 25% (Hours)'] ?? 0);
        $ot50Hours = $this->parseVal($row['OT 50% (Hours)'] ?? 0);
        $ot100Hours = $this->parseVal($row['OT 100% (Hours)'] ?? 0);
        $otBankHours = $this->parseVal($row['OT (bank Holiday) (Hours)'] ?? 0);
        $nightHours = $this->parseVal($row['Night shift Hours'] ?? 0);

        $ot25Amt = $hourlyRate * $ot25Hours * 1.25;
        $ot50Amt = $hourlyRate * $ot50Hours * 1.50;
        $ot100Amt = $hourlyRate * $ot100Hours * 2.00;
        $otBankAmt = $hourlyRate * $otBankHours * 1.00;
        $nightAllowance = $nightHours * $hourlyRate * 0.20;

        // Allowances from Excel
        $attendanceBonus = $this->parseVal($row['Attendance bonus'] ?? 0);
        $aidFamilial = $this->parseVal($row['AID Familial'] ?? 0);
        $functionalAllowance = $this->parseVal($row['Functional allowance'] ?? 0);
        $transportImpo = $this->parseVal($row['Ind Transport Impo'] ?? 0);
        $indPanier = $this->parseVal($row['Ind. de panier'] ?? $row['Ind. de Panier'] ?? 0);
        $represAllowance = $this->parseVal($row['indémnité de représentation'] ?? 0);
        $transportAllowance = $this->parseVal($row['indémnité de tsport'] ?? 0);

        // --- GROSS SALARY (AL) ---
        $grossSalary = $baseWithAbs + $ot25Amt + $ot50Amt + $ot100Amt + $otBankAmt
                     + $nightAllowance + $loyaltyAllowance + $seniorityAllowance
                     + $functionalAllowance + $indPanier + $transportImpo
                     + $aidFamilial + $attendanceBonus;

        // --- SOCIAL CHARGES ---
        $socialCharges = $this->calcSocialCharges($grossSalary, $config);

        // --- ACCRUALS & BENEFITS ---
        $soldeConge = $this->parseVal($row['Solde congé'] ?? $row['Solde Congé'] ?? 0);
        $holidayAccrual = ($soldeConge > 0) ? (1.5 * $baseSalary / 25) : 0;
        $month13 = ($seniorityYears > 3) ? ($baseSalary / 12) * 1.3 : 0;
        $transportFixed = (float)($config['transport_fee'] ?? 325);
        $canteenFixed = (float)($config['canteen_fee'] ?? 300);
        $eidAllowance = (float)($config['eid_allowance'] ?? 200);

        // --- TOTAL COMPANY COST ---
        $totalCost = $grossSalary
                   + $socialCharges['social_security']
                   + $socialCharges['health_insurance']
                   + $socialCharges['cimr_amount']
                   + $socialCharges['at_amount']
                   + $transportFixed + $canteenFixed
                   + $holidayAccrual + $month13 + $eidAllowance;

        // --- GL ACCOUNT MAPPING (Yazaki Budget Lines) ---
        $glAccounts = [
            'YZK_7310000' => round($baseWithAbs, 2),
            'YZK_7312000' => round($seniorityAllowance + $loyaltyAllowance + $transportImpo
                                  + $indPanier + $functionalAllowance + $aidFamilial
                                  + $represAllowance + $transportAllowance, 2),
            'YZK_7340000' => round($attendanceBonus, 2),
            'YZK_7330000' => round($ot25Amt + $ot50Amt + $ot100Amt + $otBankAmt + $nightAllowance, 2),
            'YZK_7326000' => round($holidayAccrual, 2),
            'YZK_7321000' => round($month13, 2),
            'YZK_7370010' => round($socialCharges['social_security'], 2),
            'YZK_7415000' => round($socialCharges['health_insurance'], 2),
            'YZK_7405000' => round($socialCharges['cimr_amount'], 2),
            'YZK_7370020' => round($socialCharges['at_amount'], 2),
            'YZK_7428000' => round($transportFixed, 2),
            'YZK_7440000' => round($canteenFixed, 2),
        ];

        // --- CLEAN ID VALUE (remove decimals from IDs) ---
        $idKey = null;
        foreach (array_keys($row) as $k) {
            if (strtoupper(trim($k)) === 'ID') {
                $idKey = $k;
                break;
            }
        }
        $finalID = $idKey !== null ? $this->cleanIdValue($row[$idKey]) : null;

        // --- RETURN: Original row + ALL computed fields ---
        return array_merge($row, [
            'finalID'             => $finalID,
            'seniorityYears'      => round($seniorityYears, 2),
            'seniorityRate'       => round($seniorityRate, 4),
            'seniorityAllowance'  => round($seniorityAllowance, 2),
            'loyaltyRate'         => round($loyaltyRate, 4),
            'loyaltyAllowance'    => round($loyaltyAllowance, 2),
            'baseWithAbs'         => round($baseWithAbs, 2),
            'ot25Amt'             => round($ot25Amt, 2),
            'ot50Amt'             => round($ot50Amt, 2),
            'ot100Amt'            => round($ot100Amt, 2),
            'otBankAmt'           => round($otBankAmt, 2),
            'nightAllowance'      => round($nightAllowance, 2),
            'grossSalary'         => round($grossSalary, 2),
            'socialSecurity'      => round($socialCharges['social_security'], 2),
            'healthInsurance'     => round($socialCharges['health_insurance'], 2),
            'cimrVal'             => round($socialCharges['cimr_amount'], 2),
            'atVal'               => round($socialCharges['at_amount'], 2),
            'transportFixed'      => round($transportFixed, 2),
            'canteenFixed'        => round($canteenFixed, 2),
            'holidayAccrual'      => round($holidayAccrual, 2),
            'month13'             => round($month13, 2),
            'eidAllowance'        => round($eidAllowance, 2),
            'totalCost'           => round($totalCost, 2),
            'Total_Labor_Cost'    => round($totalCost, 2),
            // GL Accounts for Forecast export
            ...$glAccounts,
        ]);
    }

    /**
     * 2. CALCULATE PROJECTION (Simulated New Hire)
     * 
     * Accepts minimal input (base_salary, start_date, function) and 
     * computes gross salary and total cost for a projected employee.
     * Used by: ProjectionController::store(), Simulation page preview
     * 
     * @param array $data Must contain 'base_salary', optionally 'start_date'
     * @return array Computed gross_salary, total_cost, and breakdown
     */
    public function calculateProjection(array $data): array
    {
        $config = $this->getConfig();
        $baseSalary = $this->parseVal($data['base_salary'] ?? 0);

        // For new projections, transport + panier are included in gross
        $transport = (float)($config['transport_fee'] ?? 325);
        $panier = (float)($config['panier_fee'] ?? 300);
        $canteen = (float)($config['canteen_fee'] ?? 300);
        $eid = (float)($config['eid_allowance'] ?? 200);

        $grossSalary = $baseSalary + $transport + $panier;

        // Social charges
        $socialCharges = $this->calcSocialCharges($grossSalary, $config);

        // Accruals (new hire: no seniority, no 13th month)
        $holidaysAccrual = ($baseSalary * 1.5) / 25;
        $thirteenthMonth = 0;

        $totalCost = $grossSalary
                   + $socialCharges['social_security']
                   + $socialCharges['health_insurance']
                   + $socialCharges['cimr_amount']
                   + $socialCharges['at_amount']
                   + $holidaysAccrual + $thirteenthMonth
                   + $eid + $canteen;

        return [
            'gross_salary'      => round($grossSalary, 2),
            'social_security'   => round($socialCharges['social_security'], 2),
            'health_insurance'  => round($socialCharges['health_insurance'], 2),
            'cimr_amount'       => round($socialCharges['cimr_amount'], 2),
            'at_amount'         => round($socialCharges['at_amount'], 2),
            'holidays_accrual'  => round($holidaysAccrual, 2),
            'thirteenth_month'  => round($thirteenthMonth, 2),
            'eid_allowance'     => round($eid, 2),
            'canteen_fee'       => round($canteen, 2),
            'total_cost'        => round($totalCost, 2),
        ];
    }

    // =====================================================================
    // PRIVATE HELPERS — Shared Calculation Logic
    // =====================================================================

    /**
     * Map a GL account code to the corresponding value from a calculated projection.
     * Projections don't have full Excel columns, so we map GL codes to the
     * computed fields returned by calculateProjection().
     */
    private function getProjectionGLValue(array $proj, string $glCode): float
    {
        $config = $this->getConfig();
        $baseSalary = $this->parseVal($proj['base_salary'] ?? 0);
        $transport = (float)($config['transport_fee'] ?? 325);
        $panier = (float)($config['panier_fee'] ?? 300);

        return match ($glCode) {
            'YZK_7310000' => $baseSalary,                                          // Base Salary
            'YZK_7312000' => $transport + $panier,                                 // Allowances (transport + panier for projections)
            'YZK_7340000' => 0,                                                    // Bonus (none for new hires)
            'YZK_7330000' => 0,                                                    // Overtime (none for projections)
            'YZK_7326000' => (float)($proj['holidays_accrual'] ?? 0),              // Holiday accrual
            'YZK_7321000' => (float)($proj['thirteenth_month'] ?? 0),              // 13th month
            'YZK_7370010' => (float)($proj['social_security'] ?? 0),               // CNSS
            'YZK_7415000' => (float)($proj['health_insurance'] ?? 0),              // AMO
            'YZK_7405000' => (float)($proj['cimr_amount'] ?? 0),                   // CIMR
            'YZK_7370020' => (float)($proj['at_amount'] ?? 0),                     // AT
            'YZK_7428000' => (float)($config['transport_fee'] ?? 325),             // Transport fixed
            'YZK_7440000' => (float)($config['canteen_fee'] ?? 300),               // Canteen fixed
            default       => 0,
        };
    }

    /**
     * Load config from settings table (cached per-request)
     */
    private function getConfig(): array
    {
        if ($this->config === null) {
            $this->config = [];
            $settings = Setting::all();
            foreach ($settings as $setting) {
                $this->config[$setting->key] = $setting->value;
            }
        }
        return $this->config;
    }

    /**
     * Calculate Social Charges (CNSS, AMO, CIMR, AT)
     * Implements Moroccan employer contribution formulas
     */
    private function calcSocialCharges(float $grossSalary, array $config): array
    {
        // Extract dynamic rates from config with fallbacks
        $cnssCap = (float)($config['cnss_cap'] ?? 6000);
        $cnssEmployeeRate = (float)($config['cnss_employee_rate'] ?? 0.0898);
        $cnssEmployerRate = (float)($config['cnss_employer_rate'] ?? 0.1437);
        
        $amoCap = (float)($config['amo_cap'] ?? 30000);
        $amoRateCapped = (float)($config['amo_rate_capped'] ?? 0.0232);
        $amoRateUncapped = (float)($config['amo_rate_uncapped'] ?? 0.00749);

        // CNSS: Employee part capped at 6000 MAD + Employer part on full gross
        $cnssBase = min($grossSalary, $cnssCap);
        $socialSecurity = ($cnssBase * $cnssEmployeeRate)
                        + ($grossSalary * $cnssEmployerRate);

        // AMO: Capped part + Uncapped part
        $amoBase = min($grossSalary, $amoCap);
        $healthInsurance = ($amoBase * $amoRateCapped)
                         + ($grossSalary * $amoRateUncapped);

        // CIMR & AT: from config (rates stored in settings table)
        $cimrRate = (float)($config['cimr_rate'] ?? 0.06);
        $atRate = (float)($config['at_rate'] ?? 0.0033);
        $cimrAmount = $grossSalary * $cimrRate;
        $atAmount = $grossSalary * $atRate;

        return [
            'social_security'  => $socialSecurity,
            'health_insurance' => $healthInsurance,
            'cimr_amount'      => $cimrAmount,
            'at_amount'        => $atAmount,
        ];
    }

    /**
     * Calculate Seniority Years from a Carbon date
     * Formula: (Today - SeniorityDate) / 365.25
     */
    private function calcSeniorityYears(?Carbon $seniorityDate): float
    {
        if (!$seniorityDate) return 0.0;
        $diffInDays = abs(now()->diffInDays($seniorityDate));
        return $diffInDays / 365.25;
    }

    /**
     * Seniority Rate Brackets (Moroccan labor law)
     * <2 years → 0%, <5 → 5%, <12 → 10%, <20 → 15%, <25 → 20%, ≥25 → 25%
     */
    private function getSeniorityRate(float $years): float
    {
        return match (true) {
            $years < 2  => 0.0,
            $years < 5  => 0.05,
            $years < 12 => 0.10,
            $years < 20 => 0.15,
            $years < 25 => 0.20,
            default     => 0.25,
        };
    }

    /**
     * Parse any date format: Excel serial number, ISO string, or Carbon
     */
    private function parseDate($value): ?Carbon
    {
        if (!$value || $value === '' || $value === 0) return null;

        try {
            // Excel serial number (e.g., 40461)
            if (is_numeric($value) && (float)$value > 10000) {
                $dateObj = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float)$value);
                return Carbon::instance($dateObj);
            }

            // Already a Carbon instance
            if ($value instanceof Carbon) return $value;

            // String date (ISO, DD/MM/YYYY, etc.)
            return Carbon::parse($value);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Parse numeric value from any format (handles French commas, spaces)
     */
    private function parseVal($value): float
    {
        if (is_null($value) || $value === '') return 0.0;
        if (is_numeric($value)) return (float)$value;

        $string = (string)$value;
        // Remove spaces, replace comma with dot
        $cleaned = str_replace([' ', ','], ['', '.'], $string);
        // Remove anything that isn't a digit or dot
        $cleaned = preg_replace('/[^0-9.\-]/', '', $cleaned);

        return is_numeric($cleaned) ? (float)$cleaned : 0.0;
    }

    /**
     * Clean ID values (remove decimals from IDs/matricules)
     */
    private function cleanIdValue($val)
    {
        if ($val === null || $val === '') return '';
        $str = str_replace(',', '.', (string)$val);
        $num = (float)$str;
        if (!is_nan($num) && is_numeric($str)) return (int)floor($num);
        return $val;
    }
}