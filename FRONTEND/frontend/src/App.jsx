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
import ProtectedRoute from './components/ProtectedRoute';

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
          
          {/* Pages Protégées (Auth Required) */}
          <Route path="/ma-zone" element={<ProtectedRoute><MaZone /></ProtectedRoute>} />
          <Route path="/global" element={<ProtectedRoute><Global /></ProtectedRoute>} />
          <Route path="/simulation" element={<ProtectedRoute><Simulation /></ProtectedRoute>} />
          <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
          <Route path="/forecast" element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
          
          {/* Admin Only */}
          <Route path="/utilisateurs" element={<ProtectedRoute requiredRole="admin"><Utilisateurs /></ProtectedRoute>} />
          
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;