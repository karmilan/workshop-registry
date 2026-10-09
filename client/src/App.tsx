import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import WorkshopDetailsPage from './pages/WorkshopDetailsPage';
import WorkshopFormPage from './pages/WorkshopFormPage';
import WorkshopListPage from './pages/WorkshopListPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/workshops" replace />} />
            <Route path="/workshops" element={<WorkshopListPage />} />
            <Route
              path="/workshops/new"
              element={<RoleGuard allowedRoles={['MANAGER']}><WorkshopFormPage /></RoleGuard>}
            />
            <Route
              path="/workshops/:id/edit"
              element={<RoleGuard allowedRoles={['MANAGER']}><WorkshopFormPage /></RoleGuard>}
            />
            <Route path="/workshops/:id" element={<WorkshopDetailsPage />} />
            <Route
              path="/admin/users"
              element={<RoleGuard allowedRoles={['ADMIN']}><UserManagementPage /></RoleGuard>}
            />
          </Route>
          <Route path="*" element={<Navigate to="/workshops" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
