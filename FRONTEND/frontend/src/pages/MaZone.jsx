import React, { useState, useEffect } from 'react';
import XLSX from 'xlsx-js-style'; 
import api from '../services/api'; 
import { UploadCloud, FileSpreadsheet, Loader, Download, RotateCcw, AlertTriangle, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const MaZone = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("idle");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);



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
                    return obj; 
                });
                uploadToBackend(formattedData);
            } else { setLoading(false); setMsg("Fichier vide."); }
        } catch (error) { setMsg("Erreur fichier."); setLoading(false); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const uploadToBackend = async (rawData) => {
    try {
      const res = await api.post('/payroll/upload', { data: rawData });
      setData(res.data.data);
      setMsg(res.data.message || "✅ Données calculées et archivées !");
      setStatus("success");
    } catch (e) { 
      setMsg("❌ Erreur transfert."); 
      setStatus("error"); 
    } finally { 
      setLoading(false); 
    }
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
                <tr>
                  {Object.keys(data[0])
                    .filter(key => !key.startsWith('YZK_'))
                    .map((key) => (<th key={key} className="px-6 py-3 whitespace-nowrap border-b bg-gray-100">{key}</th>))
                  }
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    {Object.keys(row)
                      .filter(key => !key.startsWith('YZK_'))
                      .map((key, j) => {
                        const val = row[key];
                        const lowerKey = key.toLowerCase().trim();
                        const isExcluded = lowerKey === 'id' || lowerKey === 'finalid' || lowerKey === 'matricule'
                          || lowerKey === 'cost centre' || lowerKey === 'cost center'
                          || lowerKey === 'employee id' || lowerKey === 'unite';
                        const isNumber = typeof val === 'number';
                        const isStringNumber = typeof val === 'string' && val.includes('.') && !isNaN(parseFloat(val));
                        
                        let displayVal = val;
                        if (isExcluded && isNumber) {
                          displayVal = Number.isInteger(val) ? val : Math.floor(val);
                        } else if (!isExcluded && (isNumber || isStringNumber)) {
                          displayVal = formatCurrency(val);
                        }
                        
                        return (
                          <td key={j} className="px-6 py-4 whitespace-nowrap">{displayVal}</td>
                        );
                    })}
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