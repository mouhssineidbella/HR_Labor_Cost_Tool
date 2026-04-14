import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, ArrowLeft, RefreshCw, Database, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import XLSX from 'xlsx-js-style'; 
import api from '../services/api';

const Forecast = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("Chargement..."); 
  const [realData, setRealData] = useState([]); 
  const [simData, setSimData] = useState([]);
  
  // Bach n-3rfou wach data kayna (bach n-activiw l-buttons)
  const hasData = realData.length > 0 || simData.length > 0;

  const [config, setConfig] = useState({
    transport_fee: 325,
    panier_fee: 300,
    canteen_fee: 300,
    eid_allowance: 200,
    cimr_rate: 0.06,
    at_rate: 0.0033
  });

  // --- 1. AUTO-FETCH AVEC MÉMOIRE (SMART LOAD) ---
  useEffect(() => {
    fetchConfig();
    
    // N-choufou wach l-user sbq lih dar "Reset" (Nqqa l-ecran)
    const isCleared = localStorage.getItem('workspace_cleared') === 'true';

    if (!isCleared) {
        // Cas Normal: Jib Data Auto (Hit mazal ma-daruch Reset)
        fetchData(false); 
    } else {
        // Cas Reset: Matjib walou (Wakha ydir F5)
        setLoading(false);
        setMsg(" Workspace Nettoyé. Utilisez le bouton 🔄 pour recharger.");
    }
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/settings');
      const map = {};
      res.data.forEach(s => map[s.key] = s.value);
      if (Object.keys(map).length > 0) setConfig(prev => ({...prev, ...map}));
    } catch (err) { console.error("Error config", err); }
  };

  // --- 2. FETCH DATA (FORCE SYNC) ---
  // Hadi k-tkhdem ghir ila wrekti 3la l-icône sghira l-fouq
  const fetchData = async (forceShow = false) => {
    try {
        setLoading(true);
        setMsg("Chargement...");
        
        // Ila l-user wrek 3la Refresh l-fouq (forceShow = true),
        // k-n-nssaw blli kan dayr Reset bash data t-bqa
        if (forceShow) {
            localStorage.removeItem('workspace_cleared');
        }

        const token = localStorage.getItem('user_token');
        if (!token) { setMsg("Erreur: Token manquant."); setLoading(false); return; }

        const [resActual, resSim] = await Promise.all([
            axios.get('http://127.0.0.1:8000/api/payroll/list', { headers: { Authorization: `Bearer ${token}` } }),
            axios.get('http://127.0.0.1:8000/api/projections') 
        ]);

        setRealData(resActual.data || []);
        setSimData(resSim.data || []); 
        setMsg(`✅ Données Chargées: ${resActual.data.length} Actuals + ${resSim.data.length} Projections.`);
        setLoading(false);
    } catch (error) { console.error(error); setMsg("Erreur Backend."); setLoading(false); }
  };

  // --- 3. RESET WORKSPACE (VIEW ONLY) ---
  const handleReset = () => {
      // 1. Khwi l-Ecran (Data kat-bqa f DB)
      setRealData([]); 
      setSimData([]);  
      setMsg(`🧹 Affichage Nettoyé.`);
      
      // 2. Sjel l-etat "Cleared" f Memoire (Bach F5 ma-tjibch data)
      localStorage.setItem('workspace_cleared', 'true');
  };

  // --- 4. CATEGORY MAPPING (CORRECTED) ---
  // HADI HIYA LI KAT-FERREQ BIN DIRECT / INDIRECT / SGA / SUPPORT
  const getCategoryFromFunction = (funcName) => {
      const f = (funcName || "").toLowerCase().trim();
      
      // === 1. INDIRECT (PRIORITÉ 1) ===
      // Khassna n-choufou "Indirect" qbel "Direct"
      if (
          f.includes('indirect') || 
          f.includes('technician') || 
          f.includes('maintenance') || 
          f.includes('quality') || 
          f.includes('supervisor')
      ) {
          return 'Indirect';
      }
      
      // === 2. DIRECT (PRIORITÉ 2) ===
      if (
          f.includes('direct') || 
          f.includes('operator')
      ) {
          return 'Direct';
      }
      
      // === 3. SUPPORT (PRIORITÉ 3) ===
      if (
          f.includes('logistics') || 
          f.includes('engineer') || 
          f.includes('support') || 
          f.includes('it')
      ) {
          return 'Support';
      }

      // === 4. SGA (HR, Finance, Managers) ===
      if (
          f.includes('hr') || 
          f.includes('accountant') || 
          f.includes('finance') || 
          f.includes('manager') || 
          f.includes('admin')
      ) {
          return 'SGA';
      }
      
      // Default fallback
      return 'SGA'; 
  };

  // --- 5. HELPERS & CALCULS ---
  const getJsDate = (val) => { if (!val) return null; return typeof val === 'number' ? new Date((val - 25569) * 86400 * 1000) : new Date(val); };
  const formatDateHeader = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  
  const isActiveInMonth = (empStartDate, columnDate) => {
      const start = getJsDate(empStartDate);
      if (!start && !empStartDate) return true; 
      if (!start) return false;
      const endOfColumnMonth = new Date(columnDate.getFullYear(), columnDate.getMonth() + 1, 0);
      return start <= endOfColumnMonth;
  };

  const parseVal = (val) => (typeof val === 'string' ? parseFloat(val.replace(/\s/g, '').replace(',', '.')) || 0 : val || 0);

  const getSeniorityYears = (startDetails) => {
      const startDate = getJsDate(startDetails);
      if(!startDate) return 0;
      const today = new Date();
      return Math.abs(today - startDate) / (1000 * 60 * 60 * 24 * 365.25); 
  };
  
  const getSeniorityRate = (y) => (y<2?0:y<5?0.05:y<12?0.10:y<20?0.15:y<25?0.20:0.25);

  const calculateDetailedCost = (emp, isSimulation = false) => {
      const baseSalary = parseVal(isSimulation ? emp.base_salary : (emp["Base Salary"] || emp["Base salary"] || 0));
      const startParam = isSimulation ? emp.start_date : (emp["date d'ancienneté"] || emp["Date d'ancienneté"] || emp["Seniority Date"]);
      const seniorityYears = getSeniorityYears(startParam);
      const seniorityAllowance = baseSalary * getSeniorityRate(seniorityYears);
      const loyaltyRate = parseVal(emp["Loyalty %"] || 0);
      const loyaltyAllowance = baseSalary * loyaltyRate;
      const absHours = parseVal(emp["Abs hours"] || 0);
      const baseWithAbs = (191 - absHours) * (baseSalary / 191);
      const hourlyRate = baseSalary / 191;
      const ot25Amt = hourlyRate * parseVal(emp["OT 25% (Hours)"] || 0) * 1.25;
      const ot50Amt = hourlyRate * parseVal(emp["OT 50% (Hours)"] || 0) * 1.50;
      const ot100Amt = hourlyRate * parseVal(emp["OT 100% (Hours)"] || 0) * 2.00;
      const otBankAmt = hourlyRate * parseVal(emp["OT (bank Holiday) (Hours)"] || 0) * 1.00;
      const nightAmt = hourlyRate * parseVal(emp["Night shift Hours"] || 0) * 0.20;
      const transportImpo = parseVal(emp["Ind Transport Impo"] || 0);
      const indPanier = parseVal(emp["Ind. de panier"] || emp["Ind. de Panier"] || 0);
      const functionalAllow = parseVal(emp["Functional allowance"] || 0);
      const aidFamilial = parseVal(emp["AID Familial"] || 0);
      const attendanceBonus = parseVal(emp["Attendance bonus"] || 0);

      const grossSalary = baseWithAbs + ot25Amt + ot50Amt + ot100Amt + otBankAmt + nightAmt 
                        + seniorityAllowance + loyaltyAllowance + functionalAllow + indPanier 
                        + transportImpo + aidFamilial + attendanceBonus;

      const cnssBase = (grossSalary >= 6000 ? 6000 : grossSalary);
      const socialSecurity = (cnssBase * 0.0898) + (grossSalary * (0.016 + 0.064 + 0.0637));
      const amoBase = (grossSalary >= 30000 ? 30000 : grossSalary);
      const healthInsurance = (amoBase * 0.0232) + (grossSalary * 0.00749);
      const cimr = grossSalary * parseFloat(config.cimr_rate);
      const at = grossSalary * parseFloat(config.at_rate);

      const soldeConge = parseVal(emp["Solde congé"] || emp["Solde Congé"] || 0);
      const holidayAccrual = soldeConge > 0 ? (1.5 * baseSalary / 25) : 0;
      const month13 = seniorityYears > 3 ? (baseSalary / 12) * 1.3 : 0;
      const transportFixed = parseFloat(config.transport_fee);
      const canteenFixed = parseFloat(config.canteen_fee);

      return {
          "YZK_7310000": baseWithAbs,
          "YZK_7312000": seniorityAllowance + loyaltyAllowance + transportImpo + indPanier 
                         + functionalAllow + aidFamilial + parseVal(emp["indémnité de représentation"] || 0) 
                         + parseVal(emp["indémnité de tsport"] || 0),
          "YZK_7340000": attendanceBonus,
          "YZK_7330000": ot25Amt + ot50Amt + ot100Amt + otBankAmt + nightAmt,
          "YZK_7326000": holidayAccrual,
          "YZK_7321000": month13,
          "YZK_7370010": socialSecurity,
          "YZK_7415000": healthInsurance,
          "YZK_7405000": cimr,
          "YZK_7370020": at,
          "YZK_7428000": transportFixed,
          "YZK_7440000": canteenFixed
      };
  };

  const exportForecastExcel = () => {
    if (!hasData) { alert("Rien à exporter."); return; }
    
    let targetYear = new Date().getFullYear();
    if (simData.length > 0) { const d = getJsDate(simData[0].start_date); if(d) targetYear = d.getFullYear(); }

    const months = [];
    for (let i = 0; i < 12; i++) months.push(new Date(targetYear, i, 1)); 

    const GL_ACCOUNTS = [
        { code: "YZK_7310000", label: "YZK_7310000 - Salaries - Basic" },
        { code: "YZK_7312000", label: "YZK_7312000 - regular salaries allowances (monthly)" },
        { code: "YZK_7340000", label: "YZK_7340000 - Salaries - Bonus" },
        { code: "YZK_7330000", label: "YZK_7330000 - Salaries - Overtime" },
        { code: "YZK_7326000", label: "YZK_7326000 - Salaries - Accrued Payroll Expenses" },
        { code: "YZK_7321000", label: "YZK_7321000 - 3th month. or more salaries (accrual and payout)" },
        { code: "YZK_7370010", label: "YZK_7370010 - Social Security" },
        { code: "YZK_7415000", label: "YZK_7415000 - Benefits - Medical" },
        { code: "YZK_7405000", label: "YZK_7405000 - Benefits - Company Pension" },
        { code: "YZK_7370020", label: "YZK_7370020 - Local Social Taxation 1" },
        { code: "YZK_7428000", label: "YZK_7428000 - Benefits - Employee Transport" },
        { code: "YZK_7440000", label: "YZK_7440000 - Benefits - Cafeteria Services" }
    ];

    try {
        const matrixRows = [[], ["", `Budget Line`, ...months.map(formatDateHeader)]];
        const TARGET_CATEGORIES = ["Direct", "Indirect", "Support", "SGA"];

        TARGET_CATEGORIES.forEach(catName => {
            const actuals = realData.filter(emp => {
                const c = (emp.Unite || emp.Category || emp.Department || "").trim();
                return c.toLowerCase() === catName.toLowerCase();
            });

            // ICI L-MAPPING KI DAR BACH I-FILTRI
            const projected = simData.filter(s => {
                const mappedCat = getCategoryFromFunction(s.function);
                return mappedCat.toLowerCase() === catName.toLowerCase();
            });

            if (actuals.length > 0 || projected.length > 0) { 
                const hcRow = [catName, catName].concat(months.map(mDate => {
                    const activeActuals = actuals.filter(e => isActiveInMonth(e["date d'ancienneté"] || e["Date d'ancienneté"] || e["Seniority Date"], mDate)).length;
                    const activeSims = projected.filter(p => isActiveInMonth(p.start_date, mDate)).length;
                    return activeActuals + activeSims; 
                }));
                matrixRows.push(hcRow);

                GL_ACCOUNTS.forEach(gl => {
                    const glRow = ["", gl.label].concat(months.map(mDate => {
                        let total = 0;
                        actuals.forEach(e => { if(isActiveInMonth(e["date d'ancienneté"] || e["Date d'ancienneté"] || e["Seniority Date"], mDate)) total += calculateDetailedCost(e, false)[gl.code] || 0; });
                        projected.forEach(p => { if (isActiveInMonth(p.start_date, mDate)) total += calculateDetailedCost(p, true)[gl.code] || 0; });
                        return total;
                    }));
                    matrixRows.push(glRow);
                });
                matrixRows.push([]);
            }
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(matrixRows);
        const styleHeader = { fill: { fgColor: { rgb: "FFFF00" } }, font: { bold: true, name: "Calibri", sz: 11 }, border: { bottom: {style:'thin'}, top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} } };
        const styleCategory = { fill: { fgColor: { rgb: "F4CCCC" } }, font: { bold: true, name: "Calibri", sz: 11 }, border: { bottom: {style:'thin'}, top: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} } };

        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellRef]) continue;
                if (R === 1 && C > 0) ws[cellRef].s = styleHeader;
                const firstCell = ws[XLSX.utils.encode_cell({r:R, c:0})];
                if (firstCell && TARGET_CATEGORIES.includes(firstCell.v)) ws[cellRef].s = styleCategory;
                if (R > 1 && C >= 2 && typeof ws[cellRef].v === 'number') ws[cellRef].z = '#,##0.00';
            }
        }
        ws['!cols'] = [{ wch: 15 }, { wch: 60 }, ...months.map(() => ({ wch: 15 }))];
        XLSX.utils.book_append_sheet(wb, ws, `Forecast_${targetYear}`);
        XLSX.writeFile(wb, `Forecast_Consolidated_${targetYear}.xlsx`);
    } catch (e) { alert("Erreur Export: " + e.message); }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 animate-fade-in pb-20 relative">
      <button onClick={() => navigate('/global')} className="flex items-center text-gray-500 hover:text-gray-800 mb-4 transition font-medium"><ArrowLeft size={20} className="mr-2"/> Retour Dashboard</button>
      
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
         <div className="flex justify-between items-start mb-6">
             <div className="w-10"></div> 
             <div className="flex justify-center">
                 <div className="bg-blue-50 p-4 rounded-full"><FileSpreadsheet size={48} className="text-blue-600"/></div>
             </div>
             {/* REFRESH MANUEL (POUR REVOIR DATA APRÈS RESET) */}
             <button onClick={() => fetchData(true)} className="text-gray-400 hover:text-blue-600 transition p-2 rounded-full hover:bg-gray-100" title="Actualiser et Afficher les données">
                 <RefreshCw size={20} className={loading ? "animate-spin" : ""}/>
             </button>
         </div>

         <h2 className="text-3xl font-bold text-gray-800 mb-2">Générateur Forecast Consolidé</h2>
         <p className="text-gray-500 mb-8">Consolidation Database "Ma Zone" + Simulations Projetées.</p>
         
         <div className={`inline-block px-4 py-2 rounded-lg text-sm font-mono mb-8 border ${msg.includes('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
             <Database size={14} className="inline mr-2"/> {msg}
         </div>

         <div className="flex justify-center gap-4">
             {/* RESET WORKSPACE (VIEW ONLY) */}
             <button onClick={handleReset} disabled={loading || !hasData} className="px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-bold flex items-center gap-2 disabled:opacity-50">
                 <Trash2 size={20}/> Reset Workspace 
             </button>
             
             {/* EXPORT */}
             <button onClick={exportForecastExcel} disabled={loading || !hasData} className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold shadow-md flex items-center gap-2 disabled:opacity-50">
                 <FileSpreadsheet size={20}/> Télécharger Excel 
             </button>
         </div>
      </div>
    </div>
  );
};

export default Forecast;