import React from 'react';
import { useAuth } from '../context/AuthContext';
import { roleIdentity } from '../components/ui';
import { PlatformDashboard } from './dashboards/PlatformDashboard';
import { UniversityDashboard } from './dashboards/UniversityDashboard';
import { ClusterDashboard } from './dashboards/ClusterDashboard';
import { HospitalDashboard } from './dashboards/HospitalDashboard';
import { SupervisorDashboard } from './dashboards/SupervisorDashboard';
import { TrainerDashboard } from './dashboards/TrainerDashboard';
import { TraineeDashboard } from './dashboards/TraineeDashboard';
import { AcademicDashboard } from './dashboards/AcademicDashboard';

/**
 * Landing page per role.
 *
 * Resolution goes through the same `roleIdentity` map the sidebar uses, so the
 * rail and the landing page can never disagree. Switching on raw role codes here
 * meant any role missing from this list silently fell through to the trainee
 * board while the sidebar showed its real identity.
 */
export const Dashboard: React.FC = () => {
  const { primaryRole } = useAuth();

  switch (roleIdentity(primaryRole).key) {
    case 'platform': return <PlatformDashboard />;
    case 'cluster': return <ClusterDashboard />;
    case 'hospital': return <HospitalDashboard />;
    case 'supervisor': return <SupervisorDashboard />;
    case 'university': return <UniversityDashboard />;
    case 'academic': return <AcademicDashboard />;
    case 'trainer': return <TrainerDashboard />;
    case 'trainee':
    default: return <TraineeDashboard />;
  }
};

export default Dashboard;
