import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { PingServicesPage } from './pages/PingServicesPage';
import { LogsPage } from './pages/LogsPage';
import { AddProjectPage } from './pages/AddProjectPage';
import { EditProjectPage } from './pages/EditProjectPage';
import { TelegramPage } from './pages/TelegramPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<AddProjectPage />} />
        <Route path="projects/:uuid/edit" element={<EditProjectPage />} />
        <Route path="ping-services" element={<PingServicesPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="telegram" element={<TelegramPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
