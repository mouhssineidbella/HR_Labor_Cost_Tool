import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, ArrowLeft, RefreshCw, Database, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

        const [resActual, resSim] = await Promise.all([
            api.get('/payroll/list'),
            api.get('/projections') 
        ]);

        setRealData(resActual.data || []);
        setSimData(resSim.data || []); 
        setMsg(`✅ Données Chargées: ${resActual.data.length} Actuals + ${resSim.data.length} Projections.`);
        setLoading(false);
    } catch (error) { console.error(error); setMsg("Erreur Backend."); setLoading(false); }
  };

  // --- 3. RESET WORKSPACE (DELETE FROM DB) ---
  const handleReset = async () => {
      const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer toutes les projections de ce workspace ?");
      if (!confirmed) return;

      try {
          setLoading(true);
          const response = await api.delete('/projections/reset');
          
          if (response.status === 200) {
              setRealData([]); 
              setSimData([]);  
              setMsg(`🧹 Workspace Nettoyé.`);
              localStorage.setItem('workspace_cleared', 'true');
          }
      } catch (error) {
          console.error("Error resetting workspace:", error);
          setMsg("❌ Erreur lors du nettoyage.");
      } finally {
          setLoading(false);
      }
  };

  // --- 4. EXPORT EXCEL (BACKEND REPORT) ---
  const exportForecastExcel = async () => {
    if (!hasData) { alert("Rien à exporter."); return; }
    
    try {
        setLoading(true);
        setMsg("Téléchargement du rapport consolidé en cours...");
        
        // Fetch Excel file directly from the backend endpoint
        const response = await api.get('/reports/export', { responseType: 'blob' });
        
        // Create an invisible anchor to trigger download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Forecast_Consolidated.xlsx');
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        setMsg("");
    } catch (err) {
        console.error("Export Error:", err);
        setMsg("Erreur lors de l'export.");
    } finally {
        setLoading(false);
    }
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