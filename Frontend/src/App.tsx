import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { UserRole } from './types';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { HubManagementPage } from './pages/admin/HubManagementPage';
import { HubDetailPage } from './pages/admin/HubDetailPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { ProductCatalogPage } from './pages/admin/ProductCatalogPage';
import { NetworkConfigPage } from './pages/admin/NetworkConfigPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';

// Inspection Pages
import { InspectionDashboardPage } from './pages/inspection/InspectionDashboardPage';
import { ReturnsListPage } from './pages/inspection/ReturnsListPage';
import { NewReturnPage } from './pages/inspection/NewReturnPage';
import { ReturnDetailPage } from './pages/inspection/ReturnDetailPage';
import { ReturnAssessmentPage } from './pages/inspection/ReturnAssessmentPage';
import { PhysicalInspectionPage } from './pages/inspection/PhysicalInspectionPage';
import { InspectionHistoryPage } from './pages/inspection/InspectionHistoryPage';

// Hub Manager Pages
import { HubDashboardPage } from './pages/hub/HubDashboardPage';
import { LocalInventoryPage } from './pages/hub/LocalInventoryPage';
import { DemandForecastPage } from './pages/hub/DemandForecastPage';
import { RecommendationsPage } from './pages/hub/RecommendationsPage';
import { TransferManagementPage } from './pages/hub/TransferManagementPage';
import { TransferDetailPage } from './pages/hub/TransferDetailPage';
import { OrderFulfillmentPage } from './pages/hub/OrderFulfillmentPage';

// Logistics Pages
import { LogisticsDashboardPage } from './pages/logistics/LogisticsDashboardPage';
import { TransferDispatchPage } from './pages/logistics/TransferDispatchPage';
import { LogisticsTransfersPage } from './pages/logistics/LogisticsTransfersPage';
import { ExceptionsManagementPage } from './pages/logistics/ExceptionsManagementPage';

// Analytics Page
import { ImpactAnalyticsPage } from './pages/analytics/ImpactAnalyticsPage';

// Route guard based on user roles
const ProtectedRoute: React.FC<{
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { currentRole } = useAuth();
  const location = useLocation();

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Root redirect based on role
const RootRedirect: React.FC = () => {
  const { currentRole } = useAuth();

  switch (currentRole) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'inspector':
      return <Navigate to="/inspection/dashboard" replace />;
    case 'hub_manager':
      return <Navigate to="/hub/dashboard" replace />;
    case 'logistics':
      return <Navigate to="/logistics/dashboard" replace />;
    case 'analytics_viewer':
      return <Navigate to="/analytics/impact" replace />;
    default:
      return <Navigate to="/admin/dashboard" replace />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* Application Shell with Nested Routes */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<RootRedirect />} />

              {/* Platform Administrator Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/hubs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <HubManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/hubs/:hubId"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hub_manager', 'logistics']}>
                    <HubDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ProductCatalogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuration"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <NetworkConfigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuditLogPage />
                  </ProtectedRoute>
                }
              />

              {/* Return Inspection Officer Routes */}
              <Route
                path="/inspection/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <InspectionDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/returns"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector', 'hub_manager']}>
                    <ReturnsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/returns/new"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <NewReturnPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/returns/:returnId"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector', 'hub_manager']}>
                    <ReturnDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/returns/:returnId/assessment"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <ReturnAssessmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/returns/:returnId/inspection"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <PhysicalInspectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inspection/history"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'inspector']}>
                    <InspectionHistoryPage />
                  </ProtectedRoute>
                }
              />

              {/* Store / Hub Manager Routes */}
              <Route
                path="/hub/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hub_manager']}>
                    <HubDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hub/inventory"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hub_manager', 'logistics']}>
                    <LocalInventoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hub/forecasts"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hub_manager']}>
                    <DemandForecastPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hub/recommendations"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hub_manager']}>
                    <RecommendationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hub/transfers"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hub_manager', 'logistics']}>
                    <TransferManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hub/transfers/:transferId"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hub_manager', 'logistics']}>
                    <TransferDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hub/orders"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hub_manager']}>
                    <OrderFulfillmentPage />
                  </ProtectedRoute>
                }
              />

              {/* Logistics Operator Routes */}
              <Route
                path="/logistics/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'logistics']}>
                    <LogisticsDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/dispatch"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'logistics']}>
                    <TransferDispatchPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/transfers"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'logistics', 'hub_manager']}>
                    <LogisticsTransfersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logistics/exceptions"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'logistics', 'hub_manager']}>
                    <ExceptionsManagementPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Sustainability Analytics Route */}
              <Route
                path="/analytics/impact"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'analytics_viewer', 'hub_manager', 'inspector', 'logistics']}>
                    <ImpactAnalyticsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
