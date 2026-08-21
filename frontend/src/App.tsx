import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PendingVerificationPage } from './pages/PendingVerificationPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { DashboardPage } from './pages/DashboardPage';
import { DashboardAlertsPage } from './pages/DashboardAlertsPage';
import { DashboardResourcesPage } from './pages/DashboardResourcesPage';
import { OperationalAlertsPage } from './pages/OperationalAlertsPage';
import { AlertDetailsPage } from './pages/AlertDetailsPage';
import { PublicAlertsPage } from './pages/PublicAlertsPage';

// Komponent przekierowujący z adresu głównego (/) do logowania lub do panelu
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isVerified) return <Navigate to="/pending" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard/alerts" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Strona główna przekierowuje do logowania jako pierwszej strony */}
          <Route path="/" element={<RootRedirect />} />

          {/* Strony uwierzytelniania (bez bocznego menu) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending" element={<PendingVerificationPage />} />

          {/* Główna powłoka aplikacji z Sidebar i Topbar (Layout) */}
          <Route element={<Layout />}>
            {/* Trasa publiczna */}
            <Route path="/public" element={<PublicAlertsPage />} />

            {/* Trasy chronione dla zweryfikowanych służb */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/operational"
              element={
                <ProtectedRoute>
                  <OperationalAlertsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/operational/alerts/:id"
              element={
                <ProtectedRoute>
                  <AlertDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/alerts"
              element={
                <ProtectedRoute>
                  <DashboardAlertsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/alerts/:id"
              element={
                <ProtectedRoute>
                  <AlertDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/resources"
              element={
                <ProtectedRoute>
                  <DashboardResourcesPage />
                </ProtectedRoute>
              }
            />

            {/* Trasy dla administratora */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Przekierowanie fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
