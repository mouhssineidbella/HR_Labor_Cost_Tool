import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

import bgImage from '../assets/index.png'; 

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const response = await api.post('/login', { email, password });
        const { token, user } = response.data;
        localStorage.setItem('user_token', token);
        localStorage.setItem('user_role', user.role);
        localStorage.setItem('user_plant', user.plant);
        localStorage.setItem('user_name', user.name);
        navigate('/ma-zone');
    } catch (err) {
        setError("Email ou mot de passe incorrect.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat relative font-sans"
      style={{ backgroundImage: `url(${bgImage})` }} 
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"></div>

      <div className="relative z-10 w-full max-w-sm px-4">
        
        <div className="text-center mb-6">
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase drop-shadow-2xl" style={{fontFamily: 'Impact, sans-serif'}}>
                YAZAKI
            </h1>
            <div className="h-1 w-16 bg-red-600 mx-auto mt-2 rounded-full shadow-[0_0_15px_rgba(220,38,38,1)]"></div>
        </div>

       
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 animate-fade-in-up">
          
          <div className="p-6 pt-8">
              <div className="flex justify-center mb-6">
                 <ShieldCheck className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" size={40} />
              </div>

              <h2 className="text-xl font-bold text-center text-white mb-6 tracking-wide">Accès Réservé RH</h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                   <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1 ml-1 tracking-wider">Email</label>
                   <div className="relative group">
                      <User className="absolute left-3 top-3 text-gray-300 group-focus-within:text-white transition-colors" size={18} />
                      <input 
                        type="email" required 
                        className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-lg focus:bg-black/40 focus:border-red-500 outline-none transition-all font-medium text-white placeholder-gray-400"
                        placeholder="nom.prenom@yazaki.com"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1 ml-1 tracking-wider">Mot de passe</label>
                   <div className="relative group">
                      <Lock className="absolute left-3 top-3 text-gray-300 group-focus-within:text-white transition-colors" size={18} />
                      <input 
                        type="password" required 
                        className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-lg focus:bg-black/40 focus:border-red-500 outline-none transition-all font-medium text-white placeholder-gray-400"
                        placeholder="••••••••"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                      />
                   </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-center gap-2 text-xs font-bold animate-pulse">
                     <AlertCircle size={16}/> {error}
                  </div>
                )}

                <button 
                  type="submit" disabled={loading}
                  className={`w-full py-3 rounded-lg text-white font-bold text-md shadow-lg flex justify-center items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 ${
                    loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-red-600/50'
                  }`}
                >
                   {loading ? (
                     <span className="text-sm">Connexion...</span>
                   ) : (
                     <>Se Connecter <ArrowRight size={18} strokeWidth={3}/></>
                   )}
                </button>
              </form>
          </div>
          
          <div className="bg-black/20 p-3 text-center border-t border-white/10">
             <p className="text-[10px] text-gray-400 font-medium">© 2026 Yazaki Morocco</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;