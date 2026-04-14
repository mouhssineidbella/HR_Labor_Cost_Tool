import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Loader, ShieldCheck, Archive as ArchiveIcon, Filter, X, FileText, TrendingUp } from 'lucide-react';

const Archive = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- FILTRES ---
  const [selectedPlant, setSelectedPlant] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All'); 
  
  const [availablePlants, setAvailablePlants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userPlant, setUserPlant] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const plant = localStorage.getItem('user_plant');
    setUserRole(role);
    setUserPlant(plant);
    initArchive();
  }, []);

  const parseCost = (val) => {
    if (!val) return 0;
    let str = String(val).toUpperCase();
    str = str.replace(/MAD/g, '').replace(/DH/g, '').replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const initArchive = async () => {
    const token = localStorage.getItem('user_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Charger les plantes
      const plantsRes = await axios.get('http://127.0.0.1:8000/api/payroll/archived-plants', { headers });
      
      // Nettoyage pour le menu déroulant (YMK, YMO...)
      const cleanPlants = plantsRes.data.map(p => p.replace('Archived_', '').replace('Forecast_', ''));
      setAvailablePlants([...new Set(cleanPlants)]);

      // 2. Charger les données
      const dataRes = await axios.get('http://127.0.0.1:8000/api/payroll/archive', { headers });
      
      const formatted = dataRes.data.map(item => {
        const row = item.row_data || {};
        
        let fullCategory = item.category || 'Unknown';
        let plantName = fullCategory;
        let sourceType = 'Standard'; 

        if (fullCategory.startsWith('Forecast_')) {
            // Cas 1 : C'est un Forecast
            sourceType = 'Forecast';
            plantName = fullCategory.replace('Forecast_', '');
        } else {
            // Cas 2 : C'est un Import Standard (Ma Zone)
            sourceType = 'Standard';
            plantName = fullCategory; 
        }

        const rawCost = row['TOTAL LABOR COST'] || row['Total Labor Cost'] || row['Total_Labor_Cost'] || row.Total_Labor_Cost || 0;

        return {
          ...row,
          Archive_Plant: plantName,
          Archive_Source: sourceType, 
          Archive_Date_Display: item.created_at ? new Date(item.created_at).toLocaleString('fr-FR') : 'N/A',
          Raw_Date: item.created_at,
          Total_Labor_Cost: parseCost(rawCost) 
        };
      });

      setData(formatted);
      setFilteredData(formatted);
      setLoading(false);
    } catch (error) {
      console.error("Init Archive Error:", error);
      setLoading(false);
    }
  };

  // --- MOTEUR DE FILTRAGE ---
  useEffect(() => {
    let result = data;

    // 1. Filtre Usine
    if (selectedPlant !== 'All') {
      result = result.filter(row => row.Archive_Plant === selectedPlant);
    }

    // 2. Filtre Source
    if (selectedSource !== 'All') {
        result = result.filter(row => row.Archive_Source === selectedSource);
    }

    // 3. Recherche Texte
    if (searchTerm) {
      result = result.filter(row => 
        (row.ID && row.ID.toString().includes(searchTerm)) || 
        (row[' ID '] && row[' ID '].toString().includes(searchTerm)) ||
        (row.Function && row.Function.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 4. Dates
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); 
        result = result.filter(row => new Date(row.Raw_Date) >= start);
    }

    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        result = result.filter(row => new Date(row.Raw_Date) <= end);
    }

    setFilteredData(result);
  }, [selectedPlant, selectedSource, searchTerm, startDate, endDate, data]);

  const clearDates = () => {
      setStartDate('');
      setEndDate('');
  };

  const totalCostSum = filteredData.reduce((acc, row) => acc + row.Total_Labor_Cost, 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center mt-40">
      <Loader className="animate-spin text-blue-600 mb-4" size={48}/>
      <p className="text-gray-500 animate-pulse font-bold">Synchronisation avec la base de données...</p>
    </div>
  );

  return (
    <div className="max-w-8xl mx-auto mt-6 px-4 mb-20 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <ArchiveIcon className="text-blue-600" size={32}/> 
            {userRole === 'Central HR' ? 'Historique Global' : `Archives de ${userPlant}`}
          </h2>
          <p className="text-gray-500 mt-1">Consultation et filtrage des archives (Imports & Forecasts).</p>
        </div>
        {/* BUTTON SUPPRIMÉ ICI */}
      </div>

      {/* BARRE DE FILTRES */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 flex flex-col xl:flex-row gap-4 items-end xl:items-center">
        
        {/* Filtre 1: Usine */}
        {userRole === 'Central HR' && (
          <div className="w-full xl:w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usine</label>
            <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-200 p-2 rounded-lg">
                <ShieldCheck className="text-blue-600" size={18}/>
                <select 
                value={selectedPlant} 
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="bg-transparent outline-none text-sm font-bold text-gray-700 w-full cursor-pointer"
                >
                <option value="All">🌍 Toutes</option>
                {availablePlants.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
          </div>
        )}

        {/* Filtre 2: SOURCE (IMPORT vs FORECAST) */}
        <div className="w-full xl:w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type de Données</label>
            <div className={`flex items-center gap-2 border p-2 rounded-lg ${selectedSource === 'Forecast' ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                {selectedSource === 'Forecast' ? <TrendingUp className="text-purple-600" size={18}/> : <FileText className="text-gray-600" size={18}/>}
                <select 
                    value={selectedSource} 
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="bg-transparent outline-none text-sm font-bold text-gray-700 w-full cursor-pointer"
                >
                    <option value="All">📂 Tout Afficher</option>
                    <option value="Standard">📄 Imports (Ma Zone)</option>
                    <option value="Forecast">🚀 Forecast (Push)</option>
                </select>
            </div>
        </div>

        {/* Filtre 3: Dates */}
        <div className="flex gap-2 w-full xl:w-auto">
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Du</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"/>
            </div>
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Au</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"/>
            </div>
            {(startDate || endDate) && (
                <button onClick={clearDates} className="mb-1 p-2 text-red-500 hover:bg-red-50 rounded-full transition self-end"><X size={20}/></button>
            )}
        </div>

        {/* Filtre 4: Recherche */}
        <div className="w-full xl:flex-1">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recherche</label>
          <div className="relative">
            <Search className="absolute left-4 top-2.5 text-gray-400" size={18}/>
            <input 
                type="text" placeholder="Matricule, Fonction..." 
                className="w-full pl-12 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm outline-none"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
             <div><p className="text-gray-400 text-xs font-bold uppercase">Lignes Filtrées</p><p className="text-2xl font-black text-gray-800">{filteredData.length}</p></div>
             <Filter className="text-gray-300" size={32}/>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
             <div>
                 <p className="text-gray-400 text-xs font-bold uppercase">Total Coût</p>
                 <p className="text-2xl font-black text-green-700">{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(totalCostSum)}</p>
             </div>
             <div className="bg-green-50 p-2 rounded-lg text-green-600 font-bold text-xs">SUM</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
             <div>
                 <p className="text-gray-400 text-xs font-bold uppercase">Source Active</p>
                 <p className={`text-xl font-black ${selectedSource === 'Forecast' ? 'text-purple-600' : 'text-blue-600'}`}>
                    {selectedSource === 'All' ? 'Mixte' : selectedSource}
                 </p>
             </div>
             {selectedSource === 'Forecast' ? <TrendingUp className="text-purple-300" size={32}/> : <FileText className="text-blue-300" size={32}/>}
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-800 text-white sticky top-0 z-20">
              <tr>
                <th className="px-6 py-4 font-bold">Date Archive</th>
                <th className="px-6 py-4 font-bold border-l border-gray-700">Source</th>
                <th className="px-6 py-4 font-bold border-l border-gray-700">Usine</th>
                <th className="px-6 py-4 font-bold border-l border-gray-700">Matricule</th>
                <th className="px-6 py-4 font-bold">Fonction</th>
                <th className="px-6 py-4 text-right font-bold bg-green-900 border-l border-green-800">Total Labor Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={index} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4 text-gray-600 font-medium font-mono text-xs">{row.Archive_Date_Display}</td>
                    
                    {/* COLONNE SOURCE AVEC BADGE */}
                    <td className="px-6 py-4 border-l border-gray-50">
                        {row.Archive_Source === 'Forecast' ? (
                            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-bold border border-purple-200">
                                <TrendingUp size={12}/> Forecast
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold border border-gray-200">
                                <FileText size={12}/> Import
                            </span>
                        )}
                    </td>

                    <td className="px-6 py-4 font-black text-blue-600 border-l border-gray-50">{row.Archive_Plant}</td>
                    <td className="px-6 py-4 font-mono text-gray-800">{row.ID || row[' ID '] || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-600 italic font-medium">{row.Function || 'N/A'}</td>
                    <td className="px-6 py-4 text-right font-black text-green-700 bg-green-50/30 border-l border-green-100 group-hover:bg-green-100 transition-colors">
                      {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(row.Total_Labor_Cost)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <Filter size={64} className="mb-4 text-gray-400"/>
                      <p className="text-2xl font-black italic">Aucune donnée trouvée.</p>
                      <button onClick={clearDates} className="mt-4 text-blue-600 hover:underline">Réinitialiser</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Archive;