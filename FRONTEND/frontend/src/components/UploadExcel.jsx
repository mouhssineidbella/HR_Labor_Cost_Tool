import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- LISTE DES FONCTIONS STANDARDS ---
const STANDARD_ROLES = [
    "DIRECT LABOR", "INDIRECT LABOR", "STRUCTURE", "OPERATEUR", 
    "TECHNICIEN", "CHEF D'EQUIPE", "SUPERVISEUR", "MANAGER", "ADMINISTRATION"
];

const UploadExcel = () => {
    // --- VARIABLES DE BASE ---
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [employees, setEmployees] = useState([]);
    
    // --- VARIABLES ADMIN & NAVIGATION ---
    const [userRole, setUserRole] = useState(''); 
    const [userPlantId, setUserPlantId] = useState(null);
    const [viewMode, setViewMode] = useState('local'); // local, global, simulation, users
    
    // --- VARIABLES DATA ---
    const [plants, setPlants] = useState([]);
    const [selectedPlantFilter, setSelectedPlantFilter] = useState(''); 

    // --- VARIABLES SIMULATION ---
    const [averages, setAverages] = useState([]); 
    const [simFunction, setSimFunction] = useState(''); 
    const [simCount, setSimCount] = useState(0); 
    const [simResult, setSimResult] = useState(null);
    const [manualCost, setManualCost] = useState(0); 
    const [isManualNeeded, setIsManualNeeded] = useState(false);

    // --- VARIABLES USERS (NOUVEAU) ---
    const [usersList, setUsersList] = useState([]);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'plant_manager', plant_id: '' });

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return { headers: { 'Authorization': `Bearer ${token}` } };
    };

    // 1. INITIALISATION
    useEffect(() => {
        const role = localStorage.getItem('user_role');
        const myPlant = localStorage.getItem('user_plant');
        setUserRole(role);
        setUserPlantId(myPlant);
        fetchEmployees(myPlant);
        if (role === 'admin') fetchPlants();
    }, []);

    // 2. FETCH FONCTIONS
    const fetchPlants = async () => {
        try { const res = await axios.get('http://127.0.0.1:8000/api/plants', getAuthHeaders()); setPlants(res.data); } catch(e){}
    };
    const fetchEmployees = async (pid=null) => {
        try {
            const params = pid ? { plant_id: pid } : {};
            const res = await axios.get('http://127.0.0.1:8000/api/employees', { ...getAuthHeaders(), params });
            setEmployees(res.data);
        } catch(e){}
    };
    const fetchAverages = async () => {
        try {
            const params = (userRole === 'admin' && selectedPlantFilter) ? { plant_id: selectedPlantFilter } : {};
            const res = await axios.get('http://127.0.0.1:8000/api/projection/averages', { ...getAuthHeaders(), params });
            setAverages(res.data);
        } catch(e){}
    };
    const fetchUsers = async () => {
        try { const res = await axios.get('http://127.0.0.1:8000/api/users', getAuthHeaders()); setUsersList(res.data); } catch(e){}
    };

    // 3. NAVIGATION (SWITCH TABS)
    const switchMode = (mode) => {
        setViewMode(mode);
        setMessage('');
        setSimResult(null);
        if(mode === 'local') fetchEmployees(userPlantId);
        else if(mode === 'global') fetchEmployees(selectedPlantFilter);
        else if(mode === 'simulation') fetchAverages();
        else if(mode === 'users') fetchUsers();
    };

    // 4. ACTIONS (Upload, Download, Simuler, User)
    const onUpload = async () => {
        if (!file) return alert("Fichier?");
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/upload-actual', formData, { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' });
            setMessage('✅ ' + res.data.message);
            if(viewMode === 'local') fetchEmployees(userPlantId);
        } catch (error) { setMessage('❌ Erreur: ' + (error.response?.data?.message || 'Erreur')); }
    };

    const handleDownload = async () => {
        try {
            const targetId = viewMode === 'local' ? userPlantId : selectedPlantFilter;
            const response = await axios.get('http://127.0.0.1:8000/api/employees/export', { ...getAuthHeaders(), params: { plant_id: targetId }, responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Payroll_Report_${targetId || 'Global'}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) { alert("Erreur download"); }
    };

    const handleFilterChange = (e) => {
        const val = e.target.value;
        setSelectedPlantFilter(val);
        if(viewMode === 'global') fetchEmployees(val);
        if(viewMode === 'simulation') setTimeout(fetchAverages, 100);
    };

    // -- SIMULATION LOGIC --
    const handleSimFunctionChange = (e) => {
        const funcName = e.target.value;
        setSimFunction(funcName);
        const found = averages.find(a => a.function === funcName);
        setIsManualNeeded(!found);
    };

    const handleSimulate = () => {
        if (!simFunction || simCount <= 0) return alert("Erreur saisie");
        let cost = 0;
        if(isManualNeeded) {
            if(manualCost <= 0) return alert("Entrez le coût estimé");
            cost = parseFloat(manualCost);
        } else {
            const avg = averages.find(a => a.function === simFunction);
            cost = avg ? avg.avg_total_cost : 0;
        }
        setSimResult({
            function: simFunction, count: simCount, unitCost: cost, total: cost * simCount,
            source: isManualNeeded ? 'Estimation Manuelle' : 'Historique Réel'
        });
    };

    // -- USER LOGIC --
    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://127.0.0.1:8000/api/users', newUser, getAuthHeaders());
            setMessage('✅ Utilisateur créé !');
            setNewUser({ name: '', email: '', password: '', role: 'plant_manager', plant_id: '' });
            fetchUsers();
        } catch (e) { setMessage('❌ Erreur création'); }
    };

    const handleDeleteUser = async (id) => {
        if(!window.confirm("Supprimer?")) return;
        try { await axios.delete(`http://127.0.0.1:8000/api/users/${id}`, getAuthHeaders()); fetchUsers(); } catch(e){}
    };

    // --- RENDER ---
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
                <h2 style={{ color: '#2c3e50', margin: 0 }}>
                    {viewMode === 'users' ? '👥 Gestion Utilisateurs' : (viewMode === 'simulation' ? '🔮 Simulateur' : 'Gestion Payroll')}
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => switchMode('local')} style={tabStyle(viewMode === 'local')}>🏢 Ma Zone</button>
                    {userRole === 'admin' && (
                        <>
                            <button onClick={() => switchMode('global')} style={tabStyle(viewMode === 'global')}>🌍 Global</button>
                            <button onClick={() => switchMode('simulation')} style={tabStyle(viewMode === 'simulation')}>🔮 Simulation</button>
                            <button onClick={() => switchMode('users')} style={tabStyle(viewMode === 'users')}>👥 Utilisateurs</button>
                        </>
                    )}
                </div>
            </div>

            {message && <div style={{ padding: '10px', marginBottom:'15px', borderRadius: '4px', background: message.includes('✅') ? '#d4edda' : '#f8d7da' }}>{message}</div>}

            {/* 1. LOCAL MODE */}
            {viewMode === 'local' && (
                <div style={cardStyle}>
                    <h4>Importer les données (Mon Usine)</h4>
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".xlsx,.xls,.csv" />
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                        <button onClick={onUpload} style={btnStyle('#0056b3')}>⬆️ Importer</button>
                        <button onClick={handleDownload} style={btnStyle('#218838')}>📥 Rapport</button>
                    </div>
                </div>
            )}

            {/* 2. GLOBAL MODE */}
            {viewMode === 'global' && (
                <div style={{ ...cardStyle, border: '1px dashed #6610f2', background: '#f8f9fa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontWeight: 'bold', color: '#6610f2' }}>🔍 Usine:</span>
                            <select value={selectedPlantFilter} onChange={handleFilterChange} style={{ padding: '8px', marginLeft:'10px' }}>
                                <option value="">-- Tout Voir --</option>
                                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <button onClick={handleDownload} style={btnStyle('#28a745')}>📥 Exporter Vue</button>
                    </div>
                </div>
            )}

            {/* 3. SIMULATION MODE */}
            {viewMode === 'simulation' && (
                <div style={{ ...cardStyle, border: '1px solid #ffc107' }}>
                    <h4 style={{ margin: '0 0 15px 0' }}>Estimer le coût d'embauche</h4>
                    {userRole === 'admin' && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ marginRight: '10px' }}>Basé sur l'usine:</label>
                            <select value={selectedPlantFilter} onChange={handleFilterChange} style={{ padding: '5px' }}>
                                <option value="">-- Moyenne Globale --</option>
                                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Fonction:</label>
                            <select value={simFunction} onChange={handleSimFunctionChange} style={{ padding: '10px', width: '220px' }}>
                                <option value="">-- Choisir --</option>
                                <optgroup label="Standards">{STANDARD_ROLES.map(r => <option key={r} value={r}>{r}</option>)}</optgroup>
                                <optgroup label="Historique">{averages.map((a, i) => !STANDARD_ROLES.includes(a.function) && <option key={i} value={a.function}>{a.function}</option>)}</optgroup>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Qté:</label>
                            <input type="number" value={simCount} onChange={e => setSimCount(Number(e.target.value))} style={{ padding: '10px', width: '80px' }} />
                        </div>
                        {isManualNeeded && (
                            <div style={{ background: '#e2e3e5', padding: '10px', borderRadius: '5px' }}>
                                <label style={{ fontSize: '12px' }}>⚠️ Coût estimé (DH):</label>
                                <input type="number" value={manualCost} onChange={e => setManualCost(Number(e.target.value))} style={{ padding: '8px', width: '100px' }} />
                            </div>
                        )}
                        <button onClick={handleSimulate} style={btnStyle('#ffc107', 'black')}>🧮 Calculer</button>
                    </div>
                    {simResult && (
                        <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '5px' }}>
                            <h3 style={{ margin: '0', color: '#856404' }}>💰 Total: {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(simResult.total)}</h3>
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'users' && (
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '300px', ...cardStyle }}>
                        <h3 style={{ marginTop: 0, color: '#0056b3' }}>➕ Ajouter Utilisateur</h3>
                        <form onSubmit={handleCreateUser}>
                            <input required placeholder="Nom" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} style={inputStyle} />
                            <input required type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={inputStyle} />
                            <input required type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} style={inputStyle} />
                            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={inputStyle}>
                                <option value="plant_manager">Manager Usine</option>
                                <option value="admin">Super Admin</option>
                            </select>
                            {newUser.role === 'plant_manager' && (
                                <select required value={newUser.plant_id} onChange={e => setNewUser({...newUser, plant_id: e.target.value})} style={inputStyle}>
                                    <option value="">-- Choisir Usine --</option>
                                    {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            )}
                            <button type="submit" style={{ ...btnStyle('#28a745'), width: '100%', marginTop: '10px' }}>Créer</button>
                        </form>
                    </div>
                    <div style={{ flex: '2', ...cardStyle }}>
                        <h3 style={{ marginTop: 0 }}>Utilisateurs</h3>
                        <table style={{ width: '100%', fontSize: '13px' }}>
                            <thead><tr style={{ background: '#eee', textAlign: 'left' }}><th>Nom</th><th>Email</th><th>Rôle</th><th>Usine</th><th>Action</th></tr></thead>
                            <tbody>
                                {usersList.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '8px' }}>{u.name}</td>
                                        <td style={{ padding: '8px' }}>{u.email}</td>
                                        <td style={{ padding: '8px' }}>{u.role}</td>
                                        <td style={{ padding: '8px' }}>{u.plant?.name || '-'}</td>
                                        <td style={{ padding: '8px' }}>{u.id !== 1 && <button onClick={() => handleDeleteUser(u.id)} style={{ color: 'red', border: 'none', cursor: 'pointer' }}>🗑️</button>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            
            {(viewMode === 'local' || viewMode === 'global') && (
                <div style={{ overflowX: 'auto', marginTop: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: 'white' }}>
                        <thead>
                            <tr style={{ background: '#343a40', color: 'white' }}>
                                <th style={{ padding: '10px' }}>Matricule</th><th style={{ padding: '10px' }}>Nom</th><th style={{ padding: '10px' }}>Fonction</th>
                                {viewMode === 'global' && <th style={{ padding: '10px' }}>Usine</th>}
                                <th style={{ padding: '10px', textAlign: 'right' }}>Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, i) => (
                                <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}>{emp.matricule}</td><td style={{ padding: '10px' }}>{emp.full_name}</td><td style={{ padding: '10px' }}>{emp.function}</td>
                                    {viewMode === 'global' && <td style={{ padding: '10px' }}>{emp.plant_id}</td>}
                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{new Intl.NumberFormat('fr-MA').format(emp.total_company_cost)} MAD</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const tabStyle = (isActive) => ({ padding: '8px 15px', background: isActive ? '#007bff' : '#f8f9fa', color: isActive ? 'white' : '#333', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' });
const btnStyle = (bg, color='white') => ({ padding: '10px 20px', background: bg, color, border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' });
const cardStyle = { padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', marginBottom: '20px' };
const inputStyle = { width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };

export default UploadExcel;