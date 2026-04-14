import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import api from '../services/api'; 
import { 
  Calculator, Users, Calendar, DollarSign, Download, 
  PlusCircle, Trash2, Briefcase, ChevronDown, Lock, 
  RotateCcw, AlertTriangle, Database, CheckCircle
} from 'lucide-react';

const Simulation = () => {
   // --- STATE ---
   const [params, setParams] = useState({
     plant: '',
     functionName: '',
     count: 1,
     startDate: '2026-01-01', 
     baseSalary: 3000
   });

   const [projectedList, setProjectedList] = useState([]);
   const [userRole, setUserRole] = useState('');
   const [userPlant, setUserPlant] = useState('');
   // Hna ghadi n-stockiw ghir plant dyal user
   const [availablePlants, setAvailablePlants] = useState([]); 
   const [showDropdown, setShowDropdown] = useState(false);
   const [isResetModalOpen, setIsResetModalOpen] = useState(false);
   
   const [showSuccess, setShowSuccess] = useState(false);

   // Config
   const [config, setConfig] = useState({
     transport_fee: 325,
     panier_fee: 300,
     canteen_fee: 300,
     eid_allowance: 200,
     cimr_rate: 0.06,
     at_rate: 0.0033
   });

   const dropdownRef = useRef(null);
   const STANDARD_FUNCTIONS = ["Direct Labor", "Indirect Labor", "Technician", "Supervisor", "Manager", "Engineer", "HR Manager", "Accountant", "Quality Control", "Logistics", "Maintenance"];

   // --- INITIALIZATION ---
   useEffect(() => {
      const role = localStorage.getItem('user_role');
      const plant = localStorage.getItem('user_plant'); 
      const token = localStorage.getItem('user_token');

      setUserRole(role);
      setUserPlant(plant);

      // --- FIX: FORCE PLANT FOR EVERYONE (Inc. ADMIN) ---
      // Ma-bqinach k-njibou l-list d-les plants mn Backend
      // K-nakhdou ghir plant li f localStorage
      setAvailablePlants([plant]); 
      setParams(p => ({ ...p, plant: plant })); // Fixé auto

      fetchConfig();
      fetchExistingProjections(token); 

      const handleClickOutside = (event) => {
         if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowDropdown(false);
         }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

   const fetchConfig = async () => {
        try {
          const res = await api.get('/settings');
          const map = {};
          res.data.forEach(s => map[s.key] = s.value);
          if (Object.keys(map).length > 0) setConfig(prev => ({...prev, ...map}));
        } catch (err) { console.error("Error loading config", err); }
   };

   // REMARQUE: J'ai supprimé fetchPlants() car on n'en a plus besoin
   // On utilise uniquement le plant du localStorage.

   // --- FETCH EXISTING DATA ---
   const fetchExistingProjections = async (token) => {
       try {
           const res = await axios.get('http://127.0.0.1:8000/api/projections', {
               headers: { Authorization: `Bearer ${token}` }
           }); 
           if (res.data && Array.isArray(res.data)) {
               const existingData = res.data.map(item => {
                   const baseSalary = parseFloat(item.base_salary);
                   const costs = calculateProjection(baseSalary); 
                   return {
                       id: item.id || Date.now() + Math.random(),
                       plant: item.plant,
                       function: item.function,
                       startDate: item.start_date,
                       baseSalary: baseSalary,
                       ...costs
                   };
               });
               setProjectedList(existingData);
           }
       } catch (error) {
           console.error("Erreur chargement projections existantes", error);
       }
   };

   // --- ENGINE CALCUL ---
   const calculateProjection = (baseSalary) => {
      const base = parseFloat(baseSalary);
      if (isNaN(base)) return { grossSalary: 0, socialSecurity: 0, healthInsurance: 0, totalCost: 0 };

      const transport = parseFloat(config.transport_fee);
      const panier = parseFloat(config.panier_fee);
      const canteen = parseFloat(config.canteen_fee);
      const eid = parseFloat(config.eid_allowance);
      
      const grossSalary = base + transport + panier;

      const cnssBase = (grossSalary >= 6000 ? 6000 : grossSalary);
      const socialSecurity = (cnssBase * 0.0898) + (grossSalary * (0.016 + 0.064 + 0.0637));
      
      const amoBase = (grossSalary >= 30000 ? 30000 : grossSalary);
      const healthInsurance = (amoBase * 0.0232) + (grossSalary * 0.00749);

      const pensionScheme = grossSalary * parseFloat(config.cimr_rate);
      const at = grossSalary * parseFloat(config.at_rate);

      const holidaysAccruals = (base * 1.5) / 25;
      const thirteenthMonth = 0; 

      const totalCost = grossSalary + socialSecurity + healthInsurance + pensionScheme + at 
                      + holidaysAccruals + thirteenthMonth + eid + canteen;

      return { grossSalary, socialSecurity, healthInsurance, totalCost };
   };

   // --- ADD NEW ---
   const handleAddProjection = () => {
      const { baseSalary, count, functionName, startDate, plant } = params;
      if (!functionName) return alert("Veuillez saisir une fonction.");
      
      // Verification simple
      if (!plant) return alert("Erreur: Aucune usine détectée.");

      const costs = calculateProjection(parseFloat(baseSalary));
      const newEntries = Array.from({ length: parseInt(count) }).map((_, i) => ({
         id: Date.now() + i, 
         plant,
         function: functionName,
         startDate,
         baseSalary: parseFloat(baseSalary),
         ...costs
      }));

      setProjectedList(prev => [...prev, ...newEntries]);
      setParams(p => ({ ...p, functionName: '' }));
   };

   // --- PUSH WITH TOAST ---
   const handlePushToForecast = async () => {
      if (projectedList.length === 0) return;
      
      try {
         const token = localStorage.getItem('user_token');
         const mappedData = projectedList.map(item => ({
             ...item,
             start_date: item.startDate,
             base_salary: item.baseSalary 
         }));

         await axios.post('http://127.0.0.1:8000/api/payroll/save-projections', { data: mappedData }, {
            headers: { Authorization: `Bearer ${token}` }
         });
         
         setShowSuccess(true);
         setTimeout(() => setShowSuccess(false), 3000);

      } catch (error) {
         console.error("Erreur Push:", error);
      }
   };

   const handleResetTrigger = () => {
      if (projectedList.length === 0) {
         setParams(prev => ({ ...prev, functionName: '', count: 1, baseSalary: 3000 }));
         return;
      }
      setIsResetModalOpen(true);
   };

   const confirmReset = () => {
      setProjectedList([]); 
      setParams(prev => ({ ...prev, functionName: '', count: 1, baseSalary: 3000 }));
      setIsResetModalOpen(false);
   };

   const handleExport = () => {
      const wb = XLSX.utils.book_new();
      const exportData = projectedList.map((row, index) => ({
         "Line ID": index + 1,
         "Plant": row.plant,
         "Function": row.function,
         "Hiring Date": row.startDate,
         "Base Salary": row.baseSalary,
         "Gross Salary (Proj)": row.grossSalary.toFixed(2),
         "Social Security": row.socialSecurity.toFixed(2),
         "Health Insurance": row.healthInsurance.toFixed(2),
         "TOTAL LABOR COST": row.totalCost.toFixed(2)
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Projected_HC");
      XLSX.writeFile(wb, "Labor_Cost_Projection.xlsx");
   };

   const handleDelete = (id) => {
       const updatedList = projectedList.filter(item => item.id !== id);
       setProjectedList(updatedList);
   };

   const grandTotal = projectedList.reduce((acc, item) => acc + item.totalCost, 0);

   return (
      <div className="max-w-7xl mx-auto mt-6 px-4 font-sans mb-20 relative animate-fade-in">
         <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Projection Forecast (N+1)</h2>
            <p className="text-gray-500">Simulez le coût des recrutements futurs. {userRole === 'Plant HR' ? `(Restreint à : ${userPlant})` : '(Accès Global)'}</p>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
               <PlusCircle size={20} className="text-blue-600" /> Nouvelle Projection
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
               
               {/* --- PLANT SELECTOR (MODIFIÉ: LOCKÉ POUR TOUT LE MONDE) --- */}
               <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex justify-between">
                     {/* Lock rouge dima bayn */}
                     Usine / Plant <Lock size={12} className="text-red-500" />
                  </label>
                  <div className="relative">
                     <Users size={16} className="absolute left-3 top-3 text-gray-400" />
                     <select
                        className="w-full pl-9 border border-gray-200 rounded-lg p-2.5 text-sm outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
                        value={params.plant}
                        // onChange desactive
                        disabled={true} 
                     >
                        {/* Kiban ghir Plant dyal User */}
                        {availablePlants.map((p, idx) => (<option key={idx} value={p}>{p}</option>))}
                     </select>
                  </div>
               </div>

               {/* --- Function Select --- */}
               <div ref={dropdownRef}>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fonction</label>
                  <div className="relative">
                     <Briefcase size={16} className="absolute left-3 top-3 text-gray-400 z-10" />
                     <input
                        type="text" placeholder="Saisir ou choisir..."
                        className="w-full pl-9 pr-8 border border-gray-300 rounded-lg p-2.5 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={params.functionName}
                        onChange={(e) => setParams({ ...params, functionName: e.target.value })}
                        onFocus={() => setShowDropdown(true)}
                     />
                     <div className="absolute right-2 top-3 text-gray-400 cursor-pointer" onClick={() => setShowDropdown(!showDropdown)}>
                        <ChevronDown size={16} />
                     </div>
                     {showDropdown && (
                        <div className="absolute z-50 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                           {STANDARD_FUNCTIONS.filter(f => f.toLowerCase().includes(params.functionName.toLowerCase())).map((func, index) => (
                              <div key={index} className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700"
                                 onClick={() => { setParams({ ...params, functionName: func }); setShowDropdown(false); }}>
                                 {func}
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               {/* --- Other Inputs --- */}
               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantité</label>
                  <input type="number" min="1" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                     value={params.count} onChange={(e) => setParams({ ...params, count: e.target.value })} />
               </div>

               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date Emb.</label>
                  <div className="relative">
                     <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                     <input type="date" className="w-full pl-9 border border-gray-300 rounded-lg p-2.5 text-sm"
                        value={params.startDate} onChange={(e) => setParams({ ...params, startDate: e.target.value })} />
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Salaire Base</label>
                  <div className="relative">
                     <DollarSign size={16} className="absolute left-3 top-3 text-gray-400" />
                     <input type="number" className="w-full pl-9 border border-blue-300 bg-blue-50 text-blue-900 font-bold rounded-lg p-2.5 text-sm"
                        value={params.baseSalary} onChange={(e) => setParams({ ...params, baseSalary: e.target.value })} />
                  </div>
               </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
               <button onClick={handleResetTrigger} className="bg-gray-100 text-gray-600 px-5 py-2.5 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2 shadow-sm transition">
                  <RotateCcw size={18} /> Reset
               </button>
               <button onClick={handleAddProjection} className="bg-blue-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-800 flex items-center gap-2 shadow-sm">
                  <Calculator size={18} /> Calculer
               </button>
            </div>
         </div>

         {/* --- TABLE RESULTS --- */}
         {projectedList.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-fade-in">
               <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-800">Résultats ({projectedList.length})</h3>
                  <div className="flex gap-2">
                     <button onClick={handlePushToForecast} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-bold shadow-md">
                        <Database size={14} /> Push to Forecast
                     </button>
                     <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 font-medium">
                        <Download size={14} /> Excel
                     </button>
                  </div>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                     <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase font-bold text-xs border-b border-gray-200">
                           <th className="px-4 py-3">Usine</th>
                           <th className="px-4 py-3">Fonction</th>
                           <th className="px-4 py-3 text-right">Base</th>
                           <th className="px-4 py-3 text-right bg-yellow-50">Brut</th>
                           <th className="px-4 py-3 text-right text-red-500">Charges</th>
                           <th className="px-4 py-3 text-right bg-green-50 font-bold border-l-2 border-green-200 text-green-800">TOTAL COST</th>
                           <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {projectedList.map((row) => (
                           <tr key={row.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-700">{row.plant}</td>
                              <td className="px-4 py-3 text-gray-800">{row.function}</td>
                              <td className="px-4 py-3 text-right font-mono">{new Intl.NumberFormat('fr-MA').format(row.baseSalary)}</td>
                              <td className="px-4 py-3 text-right bg-yellow-50 font-bold">{new Intl.NumberFormat('fr-MA').format(row.grossSalary)}</td>
                              <td className="px-4 py-3 text-right text-red-500">{new Intl.NumberFormat('fr-MA').format(row.socialSecurity + row.healthInsurance)}</td>
                              <td className="px-4 py-3 text-right bg-green-50 font-bold border-l-2 border-green-200 text-green-700">
                                 {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(row.totalCost)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                 <button onClick={() => handleDelete(row.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
               <div className="p-4 bg-gray-50 border-t flex justify-end items-center gap-4">
                  <span className="text-gray-500">Total Budget:</span>
                  <span className="text-2xl font-bold text-green-700">{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(grandTotal)}</span>
               </div>
            </div>
         )}

         {/* --- MODAL & TOAST --- */}
         {isResetModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
               <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                  <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                     <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmer la réinitialisation ?</h3>
                  <p className="text-sm text-gray-500 mb-6">Toutes les projections ajoutées seront perdues.</p>
                  <div className="flex gap-3 justify-center">
                     <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition">Annuler</button>
                     <button onClick={confirmReset} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-md">Tout effacer</button>
                  </div>
               </div>
            </div>
         )}

         {showSuccess && (
             <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-slide-in z-50">
                 <CheckCircle size={24} className="text-emerald-100" />
                 <div>
                     <h4 className="font-bold text-sm">Succès</h4>
                     <p className="text-xs text-emerald-100">Données envoyées au Forecast avec succès !</p>
                 </div>
             </div>
         )}
      </div>
   );
};

export default Simulation;