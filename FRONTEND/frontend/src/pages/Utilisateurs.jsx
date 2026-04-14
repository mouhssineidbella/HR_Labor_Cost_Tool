import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Axios configured
import { Users, Shield, Lock, Plus, MapPin, Trash2, Save, X } from 'lucide-react';

const Utilisateurs = () => {
  const [users, setUsers] = useState([]);
  // --- STATE JDID DYAL USINES ---
  const [availablePlants, setAvailablePlants] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Plant HR', plant: '' });

  // 1. FETCH DATA (Users + Plants)
  const fetchData = async () => {
    try {
      // A. Jib Users
      const usersRes = await api.get('/users');
      setUsers(usersRes.data);

      // B. Jib Usines (Dynamique mn DB)
      const plantsRes = await api.get('/payroll/archived-plants');
      setAvailablePlants(plantsRes.data);
      
      // Initialiser plant par défaut (la 1ère de la liste)
      if(plantsRes.data.length > 0) {
          setNewUser(prev => ({ ...prev, plant: plantsRes.data[0] }));
      }
    } catch (error) {
      console.error("Erreur chargement données:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. CREATE USER
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const finalPlant = newUser.role === 'Central HR' ? 'All Plants' : newUser.plant;

      await api.post('/users', {
         ...newUser,
         plant: finalPlant
      });

      alert("Utilisateur créé avec succès !");
      setIsModalOpen(false);
      fetchData(); // Recharger tout
      // Reset Form
      setNewUser({ 
          name: '', email: '', password: '', role: 'Plant HR', 
          plant: availablePlants.length > 0 ? availablePlants[0] : '' 
      });
    } catch (error) {
      alert("Erreur lors de la création.");
      console.error(error);
    }
  };

  // 3. DELETE USER
  const handleDelete = async (id) => {
    if(window.confirm("Supprimer cet utilisateur ?")) {
      try {
        await api.delete(`/users/${id}`);
        fetchData();
      } catch (error) {
        console.error("Erreur suppression:", error);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-6 px-4 font-sans mb-20">
      <div className="mb-6 flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Administration (DB)</h2>
           <p className="text-gray-500">Gestion des accès en base de données.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-900 text-white px-5 py-2.5 rounded-lg flex items-center gap-2">
          <Plus size={20} /> Ajouter Utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Nom</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Usine</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{user.name}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'Central HR' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{user.plant}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between mb-4">
                 <h3 className="font-bold">Nouveau Compte</h3>
                 <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                 <input type="text" placeholder="Nom" required className="w-full border rounded p-2" 
                   value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                 <input type="email" placeholder="Email" required className="w-full border rounded p-2" 
                   value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                 <input type="password" placeholder="Mot de passe" required className="w-full border rounded p-2" 
                   value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                 
                 <select className="w-full border rounded p-2" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="Plant HR">Plant HR</option>
                    <option value="Central HR">Central HR</option>
                 </select>

                 {/* --- INPUT DYNAMIQUE (LISTE VENANT DE LA DB) --- */}
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Usine</label>
                    <div className="relative">
                        <input 
                           list="plants-datalist"
                           className="w-full border rounded p-2"
                           placeholder="Sélectionner ou saisir nouvelle..."
                           value={newUser.role === 'Central HR' ? 'All Plants' : newUser.plant} 
                           onChange={e => setNewUser({...newUser, plant: e.target.value})}
                           disabled={newUser.role === 'Central HR'}
                        />
                        {/* Hna l-magie: had la liste kat-ji mn DB */}
                        <datalist id="plants-datalist">
                           {availablePlants.map((plant, index) => (
                               <option key={index} value={plant} />
                           ))}
                        </datalist>
                    </div>
                 </div>

                 <button type="submit" className="w-full bg-blue-900 text-white py-2 rounded font-bold">Sauvegarder</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Utilisateurs;