import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  CssBaseline,
  CircularProgress,
  Backdrop,
} from '@mui/material';

import Header from './components/Header';
import { useAuth } from './contexts/AuthContext';
import { useUI } from './contexts/UIContext';
import LoginPage from './pages/LoginPage';
import ForcePasswordChangePage from './pages/ForcePasswordChangePage';
import BlockedSlotManagementPage from './pages/BlockedSlotManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import ManualPage from './pages/ManualPage';
import HomePage from './pages/HomePage';

// --- Protected Route Component ---
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// --- Main App Component (Routing) ---
function App() {
  const { isLoading } = useUI();

  return (
    <>
      <CssBaseline />
      <Header />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/blocked" element={<ProtectedRoute><BlockedSlotManagementPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
        <Route path="/force-password-change" element={<ProtectedRoute><ForcePasswordChangePage /></ProtectedRoute>} />
        <Route path="/manual/:manualType" element={<ProtectedRoute><ManualPage /></ProtectedRoute>} />
      </Routes>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}

export default App;