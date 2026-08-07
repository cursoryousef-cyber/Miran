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
import { ClusterTrainees } from './pages/ClusterTrainees';
import { AcademicIntakes } from './pages/AcademicIntakes';
import { UniversityCorrections } from './pages/UniversityCorrections';
import { HospitalCapacity } from './pages/HospitalCapacity';
import { UsersPage } from './pages/Users';
import { Declarations } from './pages/Declarations';
import { Workflows } from './pages/Workflows';
import { Policies } from './pages/Policies';
import { Integrations } from './pages/Integrations';
import { Reports } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { OrgMembersPage } from './pages/OrgMembers';
import { HealthMonitor } from './pages/HealthMonitor';
import { AuditLogs } from './pages/AuditLogs';
import { RolesManagement } from './pages/RolesManagement';
import { LogbookPage } from './pages/Logbook';
import { HospitalReview } from './pages/HospitalReview';
import { AcceptanceChain } from './pages/AcceptanceChain';
import { Incidents } from './pages/Incidents';
import { Graduation } from './pages/Graduation';
import { TrainerReassignment } from './pages/TrainerReassignment';
import { TrainerLeaveManagement } from './pages/TrainerLeaveManagement';
import { HospitalWorkspace } from './pages/hospital/HospitalWorkspace';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ─── Auth Guard ──────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// ─── Role Guard: blocks access and redirects to / ────────────────────────
const RoleRoute: React.FC<{ allowedRoles: string[]; children: React.ReactNode }> = ({ allowedRoles, children }) => {
  const { hasAnyRole } = useAuth();
  if (!hasAnyRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// ─── Role constants ──────────────────────────────────────────────────────
const PLATFORM = ['platform_owner', 'system_admin', 'holding_administrator'];
const UNIVERSITY = ['university_administrator', 'academic_affairs'];
const CLUSTER = ['cluster_administrator', 'training_director'];
const HOSPITAL = ['hospital_administrator', 'department_head', 'training_supervisor'];
const TRAINER = ['trainer'];
const TRAINEE = ['trainee'];
const ACADEMIC = ['academic_supervisor'];

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
                  {/* Dashboard — available to all authenticated users, renders per-role */}
                  <Route index element={<Dashboard />} />

                  {/* Platform-only routes */}
                  <Route path="organizations" element={<RoleRoute allowedRoles={[...PLATFORM, ...CLUSTER]}><Organizations /></RoleRoute>} />
                  <Route path="organizations/wizard" element={<RoleRoute allowedRoles={PLATFORM}><OrganizationWizard /></RoleRoute>} />
                  <Route path="users" element={<RoleRoute allowedRoles={PLATFORM}><UsersPage /></RoleRoute>} />
                  <Route path="roles-management" element={<RoleRoute allowedRoles={PLATFORM}><RolesManagement /></RoleRoute>} />
                  <Route path="audit-logs" element={<RoleRoute allowedRoles={PLATFORM}><AuditLogs /></RoleRoute>} />
                  <Route path="health-monitor" element={<RoleRoute allowedRoles={PLATFORM}><HealthMonitor /></RoleRoute>} />
                  <Route path="workflows" element={<RoleRoute allowedRoles={PLATFORM}><Workflows /></RoleRoute>} />
                  <Route path="settings" element={<RoleRoute allowedRoles={PLATFORM}><SettingsPage /></RoleRoute>} />
                  <Route path="policies" element={<RoleRoute allowedRoles={PLATFORM}><Policies /></RoleRoute>} />
                  <Route path="integrations" element={<RoleRoute allowedRoles={PLATFORM}><Integrations /></RoleRoute>} />

                  {/* University + Cluster + Hospital + Academic */}
                  <Route path="affiliations" element={<RoleRoute allowedRoles={[...UNIVERSITY, ...CLUSTER]}><Affiliations /></RoleRoute>} />
                  <Route path="cluster-trainees" element={<RoleRoute allowedRoles={[...CLUSTER, ...PLATFORM]}><ClusterTrainees /></RoleRoute>} />
                  <Route path="intakes" element={<RoleRoute allowedRoles={[...UNIVERSITY, ...CLUSTER, ...HOSPITAL, ...ACADEMIC]}><AcademicIntakes /></RoleRoute>} />
                  <Route path="corrections" element={<RoleRoute allowedRoles={UNIVERSITY}><UniversityCorrections /></RoleRoute>} />
                  {/* Hospital operational workspace — the single hospital surface. */}
                  <Route path="hospital" element={<RoleRoute allowedRoles={[...HOSPITAL, 'training_supervisor', ...PLATFORM]}><HospitalWorkspace /></RoleRoute>} />
                  {/* The former standalone hospital pages now live as workspace
                      sections. The routes are kept so existing links and
                      bookmarks land on the right section instead of 404-ing. */}
                  <Route path="hospital-capacity" element={<Navigate to="/hospital?tab=capacity" replace />} />
                  <Route path="hospital-review" element={<Navigate to="/hospital?tab=requests" replace />} />

                  {/* Calls → Hospital Workspace calls tab */}
                  <Route path="calls" element={<Navigate to="/hospital?tab=calls" replace />} />

                  <Route path="acceptance-chain" element={<RoleRoute allowedRoles={[...HOSPITAL, ...TRAINER, 'training_supervisor', ...PLATFORM]}><AcceptanceChain /></RoleRoute>} />
                  <Route path="incidents" element={<RoleRoute allowedRoles={[...HOSPITAL, ...TRAINER, ...CLUSTER, TRAINEE[0], ...PLATFORM]}><Incidents /></RoleRoute>} />
                  <Route path="graduation" element={<RoleRoute allowedRoles={[...HOSPITAL, ...TRAINER, 'training_supervisor', 'university_administrator', ...PLATFORM]}><Graduation /></RoleRoute>} />

                  {/* Hospital + Trainer */}
                  <Route path="org-members" element={<RoleRoute allowedRoles={[...HOSPITAL, ...TRAINER, ...UNIVERSITY]}><OrgMembersPage /></RoleRoute>} />
                  <Route path="trainer-reassignment" element={<Navigate to="/hospital?tab=reassignment" replace />} />
                  <Route path="trainer-leaves" element={<Navigate to="/hospital?tab=leaves" replace />} />


                  {/* Trainer + Trainee */}
                  <Route path="logbook" element={<RoleRoute allowedRoles={[...TRAINER, ...TRAINEE, ...HOSPITAL]}><LogbookPage /></RoleRoute>} />

                  {/* Trainee only */}
                  <Route path="declarations" element={<RoleRoute allowedRoles={TRAINEE}><Declarations /></RoleRoute>} />

                  {/* Academic Supervisor */}
                  <Route path="reports" element={<RoleRoute allowedRoles={[...ACADEMIC, ...PLATFORM]}><Reports /></RoleRoute>} />
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
