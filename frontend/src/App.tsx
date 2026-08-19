import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PendingVerificationPage } from './pages/PendingVerificationPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DashboardAlertsPage } from './pages/DashboardAlertsPage';
import { DashboardResourcesPage } from './pages/DashboardResourcesPage';
import { OperationalAlertsPage } from './pages/OperationalAlertsPage';
import { AlertDetailsPage } from './pages/AlertDetailsPage';
import { PublicAlertsPage } from './pages/PublicAlertsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Strony uwierzytelniania (bez bocznego menu) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending" element={<PendingVerificationPage />} />

          {/* Główna powłoka aplikacji z Sidebar i Topbar (Layout) */}
          <Route element={<Layout />}>
            {/* Trasa publiczna */}
            <Route path="/" element={<PublicAlertsPage />} />

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
            <Route
              path="/admin/logs"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminAuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/logs"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminAuditLogsPage />
                </ProtectedRoute>
              }
            />

            {/* Przekierowanie fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
