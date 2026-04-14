import React, { useState, useEffect } from 'react';
import XLSX from 'xlsx-js-style'; 
import axios from 'axios';
import api from '../services/api'; 
import { UploadCloud, FileSpreadsheet, Loader, Download, RotateCcw, AlertTriangle, X } from 'lucide-react';

const MaZone = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("idle");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // --- CONFIG ---
  const [config, setConfig] = useState({
    transport_fee: 325,
    panier_fee: 300, 
    canteen_fee: 300,
    eid_allowance: 200, 
    cimr_rate: 0.06,
    at_rate: 0.0033
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/settings');
        const map = {};
        res.data.forEach(s => map[s.key] = s.value);
        if (Object.keys(map).length > 0) setConfig(prev => ({...prev, ...map}));
      } catch (err) { console.error("Error loading config", err); }
    };
    fetchConfig();
  }, []);

  // --- HELPERS ---
  const parseVal = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val.replace(/\s/g, '').replace(',', '.')) || 0;
      return 0;
  };

  const cleanIdValue = (val) => {
    if (val === null || val === undefined) return '';
    let str = val.toString().replace(',', '.');
    const num = parseFloat(str);
    if (!isNaN(num)) return Math.floor(num);
    return val;
  };

  const getSeniorityYears = (dateVal) => {
      if (!dateVal) return 0;
      let dateObj = typeof dateVal === 'number' 
        ? new Date((dateVal - 25569) * 86400 * 1000) 
        : new Date(dateVal);
      if (isNaN(dateObj.getTime())) return 0; 
      const diff = new Date() - dateObj;
      return diff / (1000 * 60 * 60 * 24 * 365.25);
  };

  const getSeniorityRate = (years) => {
      if (years < 2) return 0;
      if (years < 5) return 0.05;
      if (years < 12) return 0.10;
      if (years < 20) return 0.15;
      if (years < 25) return 0.20;
      return 0.25;
  };

  // --- CALCUL LOGIC ---
  const calculateLaborCost = (row) => {
    let idKey = Object.keys(row).find(k => k.toUpperCase().trim() === 'ID') || 'ID';
    const finalID = cleanIdValue(row[idKey]);
    const baseSalary = parseVal(row['Base Salary'] || row['Base salary']);
    
    // Seniority
    let seniorityYears = parseVal(row['Seniority Years']);
    if (row["date d'ancienneté"] || row["Date d'ancienneté"] || row["Seniority Date"]) {
        seniorityYears = getSeniorityYears(row["date d'ancienneté"] || row["Date d'ancienneté"] || row["Seniority Date"]);
    }
    const seniorityRate = getSeniorityRate(seniorityYears);
    const seniorityAllowance = baseSalary * seniorityRate;

    // Loyalty
    const loyaltyRate = parseVal(row['Loyalty %'] || 0);
    const loyaltyAllowance = baseSalary * loyaltyRate;

    // Base with Abs
    const absHours = parseVal(row['Abs hours'] || 0);
    const baseWithAbs = (191 - absHours) * (baseSalary / 191);

    // OT
    const ot25Hours = parseVal(row['OT 25% (Hours)'] || 0);
    const ot50Hours = parseVal(row['OT 50% (Hours)'] || 0);
    const ot100Hours = parseVal(row['OT 100% (Hours)'] || 0);
    const otBankHours = parseVal(row['OT (bank Holiday) (Hours)'] || 0);
    const nightHours = parseVal(row['Night shift Hours'] || 0);

    const hourlyRate = baseSalary / 191;
    const ot25Amt = hourlyRate * ot25Hours * 1.25;
    const ot50Amt = hourlyRate * ot50Hours * 1.50;
    const ot100Amt = hourlyRate * ot100Hours * 2.00;
    const otBankAmt = hourlyRate * otBankHours * 1.00; 
    const nightAllowance = nightHours * hourlyRate * 0.20;

    // Allowances
    const attendanceBonus = parseVal(row['Attendance bonus'] || 0);
    const aidFamilial = parseVal(row['AID Familial'] || 0);
    const functionalAllowance = parseVal(row['Functional allowance'] || 0);
    const transportImpo = parseVal(row['Ind Transport Impo'] || 0);
    const indPanier = parseVal(row['Ind. de panier'] || 0);
    
    // Gross
    const grossSalary = baseWithAbs + ot25Amt + ot50Amt + ot100Amt + otBankAmt + nightAllowance 
                      + loyaltyAllowance + seniorityAllowance + functionalAllowance + indPanier 
                      + transportImpo + aidFamilial + attendanceBonus;

    // Charges
    const cnssBase = (grossSalary >= 6000 ? 6000 : grossSalary);
    const socialSecurity = (cnssBase * 0.0898) + (grossSalary * (0.016 + 0.064 + 0.0637));
    const amoBase = (grossSalary >= 30000 ? 30000 : grossSalary);
    const healthInsurance = (amoBase * 0.0232) + (grossSalary * 0.00749);
    const cimrVal = grossSalary * parseFloat(config.cimr_rate);
    const atVal = grossSalary * parseFloat(config.at_rate);

    // Accruals & Benefits
    const soldeConge = parseVal(row['Solde congé'] || 0);
    const holidayAccrual = soldeConge > 0 ? (1.5 * baseSalary / 25) : 0;
    const month13 = seniorityYears > 3 ? (baseSalary / 12) * 1.3 : 0;
    const transportFixed = parseFloat(config.transport_fee);
    const canteenFixed = parseFloat(config.canteen_fee);
    const eidAllowance = parseFloat(config.eid_allowance);

    const totalCost = grossSalary + socialSecurity + healthInsurance + cimrVal + atVal 
                    + transportFixed + canteenFixed + holidayAccrual + month13 + eidAllowance;

    // Return Row with standardized keys for calculation usage
    return {
        ...row,
        finalID, baseSalary, seniorityYears, seniorityRate, seniorityAllowance, loyaltyRate, loyaltyAllowance,
        baseWithAbs, ot25Amt, ot50Amt, ot100Amt, otBankAmt, nightAllowance,
        grossSalary, socialSecurity, healthInsurance, cimrVal, atVal,
        transportFixed, canteenFixed, holidayAccrual, month13, eidAllowance, totalCost
    };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setMsg("Traitement...");
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const bstr = event.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }); 
            const headers = rows[0]; 
            const dataRows = rows.slice(1); 
            if (dataRows.length > 0) {
                const formattedData = dataRows.map((row) => {
                    let obj = {};
                    headers.forEach((header, index) => {
                        const cleanHeader = header ? header.trim() : `Col_${index}`;
                        obj[cleanHeader] = row[index] !== undefined ? row[index] : null;
                    });
                    return calculateLaborCost(obj); 
                });
                setData(formattedData);
                uploadToBackend(formattedData);
            } else { setLoading(false); setMsg("Fichier vide."); }
        } catch (error) { setMsg("Erreur fichier."); setLoading(false); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const uploadToBackend = async (calculatedData) => {
    try {
      const token = localStorage.getItem('user_token');
      await axios.post('http://127.0.0.1:8000/api/payroll/upload', { data: calculatedData }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg("✅ Données archivées !");
      setStatus("success");
    } catch (e) { setMsg("❌ Erreur transfert."); setStatus("error"); } finally { setLoading(false); }
  };

  const handleResetTrigger = () => { if(data.length) setIsResetModalOpen(true); };
  const confirmReset = () => { setData([]); setMsg(""); setStatus("idle"); setIsResetModalOpen(false); };

  // --- 3. EXPORT EXCEL (HEADERS EXACTS DU TARGET FILE) ---
  const downloadHCProjection = () => {
    if (data.length === 0) return;

    // LES COLONNES EXACTES MN TARGET FILE (Avec les typos "Nom", "indémnité")
    const headers = [
      "ID", "Nom", "Depart", "Function", "Type de contrat", "date d'ancienneté", "bulletin model", 
      "CIMR Rate", "Solde congé", "Unite", "Cost Centre", 
      "Base Salary", "Attendance bonus", "AID Familial", 
      "indémnité de tsport", "indémnité de représentation", "Ind Transport Impo", 
      "Ind. de panier", "Functional allowance", "indémnité de tsport LL",
      "Seniority Years", "Seniority %", "Seniority allowance", "Loyalty %", "Loyalty allowance", 
      "Abs hours", "OT 25% (Hours)", "OT 50% (Hours)", "OT 100% (Hours)", "OT (bank Holiday) (Hours)", 
      "Base salary (with abs impact)", 
      "OT 25%", "OT 50%", "OT 100%", "OT (bank Holiday)", "Night shift Hours", "Night shift Allowance",
      "Gross Salary", "Social security", "Health insurance", "Pension scheme", "AT",
      "Transportation", "Canteen", "Holidays Accruals", "13th month", "Eid allowance",
      "TOTAL LABOR COST" // Zedt hadi 7it darouriya l resultat
    ];

    const dataRows = data.map(row => [
      row.finalID, 
      row["Nom"] || row["Name"] || "", 
      row["Depart"] || row["Department"] || "",
      row["Function"], 
      row["Type de contrat"] || row["Contract Type"], 
      row["date d'ancienneté"] || row["Seniority Date"], 
      row["bulletin model"] || "", 
      row["CIMR Rate"], 
      row["Solde congé"] || row["Solde Congé"], 
      row["Unite"], 
      row["Cost Centre"], 
      
      row["Base Salary"], 
      row["Attendance bonus"] || 0, 
      row["AID Familial"] || 0, 
      row["indémnité de tsport"] || row["Ind Transport"] || 0, 
      row["indémnité de représentation"] || row["Ind Représentation"] || 0,
      row["Ind Transport Impo"] || 0, 
      row["Ind. de panier"] || 0, 
      row["Functional allowance"] || 0,
      row["indémnité de tsport LL"] || 0, 

      row.seniorityYears.toFixed(2), 
      (row.seniorityRate * 100).toFixed(2) + '%', 
      row.seniorityAllowance.toFixed(2),
      (row.loyaltyRate * 100).toFixed(2) + '%', 
      row.loyaltyAllowance.toFixed(2),

      row["Abs hours"] || 0,
      row["OT 25% (Hours)"] || 0,
      row["OT 50% (Hours)"] || 0,
      row["OT 100% (Hours)"] || 0,
      row["OT (bank Holiday) (Hours)"] || 0, 
      
      row.baseWithAbs.toFixed(2),
      row.ot25Amt.toFixed(2), 
      row.ot50Amt.toFixed(2), 
      row.ot100Amt.toFixed(2), 
      row.otBankAmt.toFixed(2), 
      row["Night shift Hours"] || 0,
      row.nightAllowance.toFixed(2),
      
      row.grossSalary.toFixed(2),
      row.socialSecurity.toFixed(2), 
      row.healthInsurance.toFixed(2), 
      row.cimrVal.toFixed(2), 
      row.atVal.toFixed(2),
      row.transportFixed.toFixed(2), 
      row.canteenFixed.toFixed(2), 
      row.holidayAccrual.toFixed(2), 
      row.month13.toFixed(2), 
      row.eidAllowance.toFixed(2),
      row.totalCost.toFixed(2)
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    const styleHeader = { fill: { fgColor: { rgb: "2F5597" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" } } };
    const styleCell = { border: { top: { style: "thin", color: { rgb: "D9D9D9" } }, bottom: { style: "thin", color: { rgb: "D9D9D9" } } } };

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;
        if (R === 0) ws[cellRef].s = styleHeader;
        else {
          ws[cellRef].s = styleCell;
          if (C === 0) { ws[cellRef].t = 'n'; ws[cellRef].z = '0'; } 
          else if (C >= 30) { ws[cellRef].z = '#,##0.00'; } 
        }
      }
    }

    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "Labor_Cost_Analysis");
    XLSX.writeFile(wb, "Payroll_Labor_Cost_Report.xlsx");
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4 animate-fade-in pb-20 relative">
      <div className="bg-white p-10 rounded-xl shadow-lg border border-gray-200 text-center mb-8">
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full transition-all duration-500 ${loading ? 'bg-blue-100 rotate-180' : 'bg-blue-50'}`}>
            {loading ? <Loader size={48} className="text-blue-600 animate-spin" /> : <UploadCloud size={48} className="text-blue-600" />}
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Ma Zone - Importation & Calcul</h2>
        <p className="text-gray-500 mb-8">Importez "Actual HC" pour générer l'analyse complète des coûts.</p>
        <div className="flex gap-4 justify-center">
          <label className={`cursor-pointer font-bold py-4 px-8 rounded-xl transition flex items-center gap-3 shadow-md transform hover:scale-105 ${loading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            <FileSpreadsheet size={24} /> {loading ? "Calcul en cours..." : "Sélectionner Actual HC"}
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={loading} className="hidden" />
          </label>
          {data.length > 0 && (
            <>
              <button onClick={downloadHCProjection} className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl transition flex items-center gap-3 shadow-md transform hover:scale-105"><Download size={24} /> Download</button>
              <button onClick={handleResetTrigger} className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 px-8 rounded-xl transition flex items-center gap-3 shadow-md transform hover:scale-105"><RotateCcw size={24} /> Reset</button>
            </>
          )}
        </div>
        {msg && <div className={`mt-8 inline-flex items-center px-6 py-3 rounded-lg text-sm font-bold border ${status === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{msg}</div>}
      </div>
      {data.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center"><h3 className="font-bold text-gray-700">Données Importées ({data.length} lignes)</h3><span className="text-xs text-gray-400 font-medium italic">Scrollez pour voir toute la liste</span></div>
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full text-sm text-left text-gray-500 border-collapse">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10">
                <tr>{Object.keys(data[0]).map((key) => (<th key={key} className="px-6 py-3 whitespace-nowrap border-b bg-gray-100">{key}</th>))}</tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap">{typeof val === 'string' && val.includes('.') && !isNaN(val) ? parseFloat(val).toLocaleString() : val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center relative">
               <button onClick={() => setIsResetModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
               <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="text-red-600" size={24}/></div>
               <h3 className="text-lg font-bold text-gray-800 mb-2">Réinitialiser l'import ?</h3>
               <p className="text-sm text-gray-500 mb-6">Toutes les données calculées à l'écran seront effacées. Vous devrez réimporter le fichier.</p>
               <div className="flex gap-3 justify-center"><button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition">Annuler</button><button onClick={confirmReset} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-md">Confirmer</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MaZone;