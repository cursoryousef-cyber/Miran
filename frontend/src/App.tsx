import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { theme } from './theme/theme';
import { RtlProvider } from './theme/RtlProvider';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Organizations } from './pages/Organizations';
import { OrganizationWizard } from './pages/OrganizationWizard';
import { Affiliations } from './pages/Affiliations';
import { AcademicIntakes } from './pages/AcademicIntakes';
import { UsersPage } from './pages/Users';
import { Declarations } from './pages/Declarations';
import { Workflows } from './pages/Workflows';
import { Policies } from './pages/Policies';
import { Integrations } from './pages/Integrations';
import { Reports } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { OrgMembersPage } from './pages/OrgMembers';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RtlProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="organizations" element={<Organizations />} />
                  <Route path="organizations/wizard" element={<OrganizationWizard />} />
                  <Route path="affiliations" element={<Affiliations />} />
                  <Route path="intakes" element={<AcademicIntakes />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="org-members" element={<OrgMembersPage />} />
                  <Route path="declarations" element={<Declarations />} />
                  <Route path="workflows" element={<Workflows />} />
                  <Route path="policies" element={<Policies />} />
                  <Route path="integrations" element={<Integrations />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </RtlProvider>
    </QueryClientProvider>
  );
};

export default App;
