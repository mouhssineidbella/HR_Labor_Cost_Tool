import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings as SettingsIcon, Save, RefreshCcw, Truck, Coffee, Percent, RotateCcw } from 'lucide-react';

const Settings = () => {
    // L-qiyam l-asliya 3la 7sab Cahier de Charge
    const DEFAULT_VALUES = {
        transport_fee: 325, // 
        panier_fee: 300,    // 
        cimr_rate: 0.06,    // [cite: 241]
        at_rate: 0.0033     // 
    };

    const [settings, setSettings] = useState({
        transport_fee: 0,
        panier_fee: 0,
        cimr_rate: 0,
        at_rate: 0
    });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            if (res.data.length > 0) {
                const data = {};
                res.data.forEach(s => data[s.key] = s.value);
                setSettings(data);
            } else {
                // Ila k-an Backend khwi, n-7et l-defaults
                setSettings(DEFAULT_VALUES);
            }
        } catch (err) { 
            console.error("Error fetching settings", err);
            setSettings(DEFAULT_VALUES); 
        }
    };

    // --- FONCTION RESET L L-QIYAM L-ASLIYA ---
    const handleResetToDefault = () => {
        setSettings(DEFAULT_VALUES);
        setMsg("⚠️ Valeurs réinitialisées aux standards Yazaki (Non encore enregistrées).");
        setTimeout(() => setMsg(""), 4000);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.post('/settings/update', { settings });
            setMsg("✅ Paramètres enregistrés avec succès !");
            setTimeout(() => setMsg(""), 3000);
        } catch (err) {
            setMsg("❌ Erreur lors de la mise à jour.");
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-4xl mx-auto mt-10 px-4 pb-20">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                    <SettingsIcon size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Configuration du Calcul</h2>
                    <p className="text-sm text-gray-500 font-medium tracking-tight">Gérez les constantes du moteur de paie Yazaki.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 space-y-8">
                    {/* Section Primes & Indemnités */}
                    <div>
                        <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 opacity-50">Primes & Indemnités</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-2">
                                    <Truck size={14}/> Transport Fee (Standard: 325 MAD)
                                </label>
                                <input 
                                    type="number" step="0.01"
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold text-gray-700 transition-all"
                                    value={settings.transport_fee}
                                    onChange={(e) => setSettings({...settings, transport_fee: parseFloat(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-2">
                                    <Coffee size={14}/> Panier / Canteen (Standard: 300 MAD)
                                </label>
                                <input 
                                    type="number" step="0.01"
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold text-gray-700 transition-all"
                                    value={settings.panier_fee}
                                    onChange={(e) => setSettings({...settings, panier_fee: parseFloat(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section Taux & Cotisations */}
                    <div className="pt-6 border-t border-gray-50">
                        <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 opacity-50">Taux & Cotisations Sociales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-2">
                                    <Percent size={14}/> CIMR Rate (Default: 0.06)
                                </label>
                                <input 
                                    type="number" step="0.0001"
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold text-gray-700 transition-all"
                                    value={settings.cimr_rate}
                                    onChange={(e) => setSettings({...settings, cimr_rate: parseFloat(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-2">
                                    <Percent size={14}/> AT Rate (Default: 0.0033)
                                </label>
                                <input 
                                    type="number" step="0.0001"
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold text-gray-700 transition-all"
                                    value={settings.at_rate}
                                    onChange={(e) => setSettings({...settings, at_rate: parseFloat(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer avec Boutons Action */}
<div className="bg-gray-50 p-6 px-8 flex flex-col md:flex-row gap-4 justify-between items-center border-t border-gray-100">
    <p className="text-[11px] text-gray-400 font-medium italic text-center md:text-left uppercase tracking-tighter">
        Les modifications impactent les calculs "Ma Zone" et "Simulation"[cite: 113, 119].
    </p>
    <div className="flex gap-3 w-full md:w-auto">
        {/* Had l-bouton hwa l-wa7id dyal r-reinitialisation daba */}
        <button 
            onClick={handleResetToDefault} 
            title="Réinitialiser aux valeurs standards Yazaki"
            className="flex-1 md:flex-none p-3 px-6 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-sm border border-orange-100 shadow-sm active:scale-95"
        >
            <RotateCcw size={18} /> Reset Defaults
        </button>

        <button 
            onClick={handleSave} disabled={loading}
            className="flex-[2] md:flex-none bg-blue-900 text-white px-10 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 hover:bg-blue-800 transition-all transform active:scale-95 disabled:bg-gray-400"
        >
            {loading ? "..." : <><Save size={18}/> Enregistrer</>}
        </button>
    </div>
</div>
            </div>

            {msg && (
                <div className={`mt-6 p-4 rounded-xl text-center text-sm font-bold animate-fade-in border ${msg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                    {msg}
                </div>
            )}
        </div>
    );
};

export default Settings;