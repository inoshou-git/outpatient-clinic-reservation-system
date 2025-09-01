import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, CircularProgress, Backdrop } from "@mui/material";

import Header from "./components/Header";
import { useAuth } from "./contexts/AuthContext";
import { useUI } from "./contexts/UIContext";
import LoginPage from "./pages/LoginPage";
import ForcePasswordChangePage from "./pages/ForcePasswordChangePage";
import BlockedSlotManagementPage from "./pages/BlockedSlotManagementPage";
import UserManagementPage from "./pages/UserManagementPage";
import ManualPage from "./pages/ManualPage";
import HomePage from "./pages/HomePage";

// --- Protected Route Component ---
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// --- Admin Route Component ---
const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isAuthLoading, isAuthenticated } = useAuth();

  if (isAuthLoading) {
    return (
      <Backdrop open={true} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

// --- General or Admin Route Component ---
const GeneralOrAdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isAuthLoading, isAuthenticated } = useAuth();

  if (isAuthLoading) {
    return (
      <Backdrop open={true} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin' && user?.role !== 'general') {
    return <Navigate to="/" replace />;
  }

  return children;
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
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blocked"
          element={
            <GeneralOrAdminRoute>
              <BlockedSlotManagementPage />
            </GeneralOrAdminRoute>
          }
        />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <UserManagementPage />
            </AdminRoute>
          }
        />
        <Route
          path="/force-password-change"
          element={
            <ProtectedRoute>
              <ForcePasswordChangePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manual/:manualType"
          element={
            <ProtectedRoute>
              <ManualPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}

export default App;
