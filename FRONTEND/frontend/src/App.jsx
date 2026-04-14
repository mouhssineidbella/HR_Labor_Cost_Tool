import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Import des Pages
import Login from './components/Login';
import MaZone from './pages/MaZone';
import Global from './pages/Global';
import Simulation from './pages/Simulation';
import Utilisateurs from './pages/Utilisateurs';
import Navigation from './components/Navigation';
import Archive from './pages/Archive';
import Forecast from './pages/Forecast';
// Settings removed import

// Layout Component
const Layout = ({ children }) => {
  const location = useLocation();
  const showNav = location.pathname !== '/';

  return (
    <div className="min-h-screen bg-gray-50">
      {showNav && <Navigation />}
      <div className={showNav ? "p-4" : ""}>
         {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Page par défaut = Login */}
          <Route path="/" element={<Login />} />
          
          {/* Pages Internes */}
          <Route path="/ma-zone" element={<MaZone />} />
          <Route path="/global" element={<Global />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/utilisateurs" element={<Utilisateurs />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/forecast" element={<Forecast />} />
          
          {/* Settings Route Removed */}
          
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;