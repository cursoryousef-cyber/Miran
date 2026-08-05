import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PlatformDashboard } from './dashboards/PlatformDashboard';
import { UniversityDashboard } from './dashboards/UniversityDashboard';
import { ClusterDashboard } from './dashboards/ClusterDashboard';
import { HospitalDashboard } from './dashboards/HospitalDashboard';
import { TrainerDashboard } from './dashboards/TrainerDashboard';
import { TraineeDashboard } from './dashboards/TraineeDashboard';
import { AcademicDashboard } from './dashboards/AcademicDashboard';

export const Dashboard: React.FC = () => {
  const { primaryRole } = useAuth();

  switch (primaryRole) {
    case 'platform_owner':
    case 'system_admin':
    case 'holding_administrator':
      return <PlatformDashboard />;

    case 'university_administrator':
    case 'academic_affairs':
      return <UniversityDashboard />;

    case 'cluster_administrator':
    case 'training_director':
      return <ClusterDashboard />;

    case 'hospital_administrator':
    case 'department_head':
    case 'training_supervisor':
      return <HospitalDashboard />;

    case 'trainer':
      return <TrainerDashboard />;

    case 'trainee':
      return <TraineeDashboard />;

    case 'academic_supervisor':
      return <AcademicDashboard />;

    default:
      return <TraineeDashboard />;
  }
};

export default Dashboard;
