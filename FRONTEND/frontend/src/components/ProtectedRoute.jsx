import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute: Wraps routes that require authentication.
 * - Checks for token in localStorage
 * - Optionally checks for required role
 * - Redirects to login if not authenticated
 * - Shows access denied if role is insufficient
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('user_token');
  const role = localStorage.getItem('user_role');

  // Not authenticated -> redirect to login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Role check (if specified)
  if (requiredRole && role !== requiredRole) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center max-w-md shadow-lg">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-700 mb-2">Accès Refusé</h2>
          <p className="text-gray-500 text-sm">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
