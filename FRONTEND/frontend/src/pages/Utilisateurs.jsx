import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Shield, Lock, Plus, MapPin, Trash2, Save, X } from 'lucide-react';

const Utilisateurs = () => {
  const [users, setUsers] = useState([]);
  const [availablePlants, setAvailablePlants] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'plant_admin', plant_id: '' });

  // 1. FETCH DATA (Users + Plants)
  const fetchData = async () => {
    try {
      // A. Jib Users
      const usersRes = await api.get('/users');
      setUsers(usersRes.data);

      // B. Jib Plants (from DB)
      const plantsRes = await api.get('/plants');
      setAvailablePlants(plantsRes.data);
      
      // Default plant_id
      if (plantsRes.data.length > 0) {
          setNewUser(prev => ({ ...prev, plant_id: plantsRes.data[0].id }));
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
      const payload = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        plant_id: newUser.role === 'admin' ? null : parseInt(newUser.plant_id)
      };

      await api.post('/users', payload);

      alert("Utilisateur créé avec succès !");
      setIsModalOpen(false);
      fetchData();
      setNewUser({ 
          name: '', email: '', password: '', role: 'plant_admin', 
          plant_id: availablePlants.length > 0 ? availablePlants[0].id : '' 
      });
    } catch (error) {
      const msg = error.response?.data?.message || "Erreur lors de la création.";
      alert(msg);
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
        const msg = error.response?.data?.message || "Erreur suppression.";
        alert(msg);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-6 px-4 font-sans mb-20">
      <div className="mb-6 flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Administration Utilisateurs</h2>
           <p className="text-gray-500">Gestion des comptes et des accès RBAC.</p>
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
                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role_label || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{user.plant_name || '-'}</td>
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
                 <input type="password" placeholder="Mot de passe (min 6)" required className="w-full border rounded p-2" 
                   value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                 
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Rôle</label>
                    <select className="w-full border rounded p-2" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                       <option value="plant_admin">Plant Admin</option>
                       <option value="admin">Global Admin</option>
                    </select>
                 </div>

                 {/* Plant selector: only for Plant Admin */}
                 {newUser.role === 'plant_admin' && (
                   <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Usine</label>
                      <select 
                         className="w-full border rounded p-2"
                         value={newUser.plant_id}
                         onChange={e => setNewUser({...newUser, plant_id: e.target.value})}
                         required
                      >
                         <option value="">-- Sélectionner une usine --</option>
                         {availablePlants.map((plant) => (
                             <option key={plant.id} value={plant.id}>{plant.name}</option>
                         ))}
                      </select>
                   </div>
                 )}

                 {newUser.role === 'admin' && (
                   <div className="bg-purple-50 border border-purple-200 rounded p-3 text-xs text-purple-700 font-medium">
                     👑 Le Global Admin aura accès à toutes les usines.
                   </div>
                 )}

                 <button type="submit" className="w-full bg-blue-900 text-white py-2 rounded font-bold">Sauvegarder</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Utilisateurs;