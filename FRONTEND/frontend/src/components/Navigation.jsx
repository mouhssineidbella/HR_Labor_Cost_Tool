import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Users, LogOut, LayoutDashboard, Globe, Shield, Archive, TrendingUp } from 'lucide-react';

const Navigation = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [plant, setPlant] = useState('');

  useEffect(() => {
    setRole(localStorage.getItem('user_role') || '');
    setPlant(localStorage.getItem('user_plant') || '');
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/'; 
  };

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
      isActive 
        ? "bg-blue-900 text-white shadow-md" 
        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
    }`;

  return (
    <div className="sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-gray-900 text-white px-6 py-2 flex justify-between items-center text-sm">
        <span className="font-medium opacity-80">
           {role === 'Central HR' ? '👑 Admin (Central)' : `🏭 Plant HR (${plant})`}
        </span>
        <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-2 transition cursor-pointer">
          <LogOut size={14} /> Déconnexion
        </button>
      </div>

      {/* Menu */}
      <nav className="bg-white border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
             <Users className="text-blue-900" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Gestion Payroll</h1>
            <p className="text-xs text-gray-500">Labor Cost Tool</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <NavLink to="/ma-zone" className={linkClass}>
              <LayoutDashboard size={18}/> Ma Zone
          </NavLink>

          <NavLink to="/forecast" className={linkClass}>
              <TrendingUp size={18}/> Forecast
          </NavLink>
          
          <NavLink to="/simulation" className={linkClass}>
              <CalculatorIcon size={18}/> Simulation
          </NavLink>

          <NavLink to="/archive" className={linkClass}>
              <Archive size={18}/> Archive
          </NavLink>

          {/* Global visible pour tout le monde */}
          <NavLink to="/global" className={linkClass}>
              <Globe size={18}/> Dashboard
          </NavLink>

          {/* --- SECTION EXCLUSIVE ADMIN (CENTRAL HR) --- */}
          {role === 'Central HR' && (
            <>
              <div className="w-[1px] h-8 bg-gray-200 mx-2 hidden md:block"></div>
              
              {/* NOTE: Settings removed from here */}

              <NavLink to="/utilisateurs" className={linkClass}>
                  <Shield size={18}/> Utilisateurs
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

const CalculatorIcon = ({size}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
);

export default Navigation;