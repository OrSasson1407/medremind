import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, type AuthState } from './store/authStore';

// --- Layouts & Pages ---
import DashboardLayout from './components/layout/DashboardLayout';
import AuthPage from './AuthPage';

// --- Views ---
import DashboardHome from './views/DashboardHome';
import AddPatient from './views/AddPatient';
import PatientDetail from './views/PatientDetail';

// ----------------------------------------------------------------------
// The "Bouncer": Kicks unauthenticated users back to the Login page
// ----------------------------------------------------------------------
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state: AuthState) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// ----------------------------------------------------------------------
// Main Application Router
// ----------------------------------------------------------------------
export default function App() {
  const isAuthenticated = useAuthStore((state: AuthState) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        
        {/* --- Public Route --- */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
          } 
        />

        {/* --- Protected Caregiver Routes --- */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Automatically redirect from base URL to the dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Injecting the modular views we built */}
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="add-patient" element={<AddPatient />} />
          <Route path="patients/:id" element={<PatientDetail />} />
        </Route>

        {/* Catch-all 404 - Redirects lost users to the home page */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}