import React, { useState, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Tab, Box, CircularProgress } from '@mui/material';
import { Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui';

import { WorkspaceOverview } from './WorkspaceOverview';
import { TrainerCards } from './TrainerCards';
const CallsHub = lazy(() => import('./CallsHub').then(m => ({ default: m.CallsHub })));

import { HospitalCapacity } from '../HospitalCapacity';
import { HospitalReview } from '../HospitalReview';
import { AcceptanceChain } from '../AcceptanceChain';
import { TrainerReassignment } from '../TrainerReassignment';
import { TrainerLeaveManagement } from '../TrainerLeaveManagement';
import { LogbookPage } from '../Logbook';
import { Incidents } from '../Incidents';
import { Graduation } from '../Graduation';

interface Section {
  key: string;
  label: string;
  render: (goTo: (tab: string) => void) => React.ReactNode;
}

const SECTIONS: Section[] = [
  { key: 'overview',     label: 'نظرة عامة',         render: (goTo) => <WorkspaceOverview onNavigate={goTo} /> },
  { key: 'requests',     label: '📥 طلبات التدريب الواردة', render: () => <HospitalReview /> },
  { key: 'capacity',     label: 'الطاقة الاستيعابية', render: () => <HospitalCapacity /> },
  { key: 'trainers',     label: 'المدربون',           render: (goTo) => <TrainerCards onNavigate={goTo} /> },
  { key: 'calls',        label: '🔔 النداءات',        render: () => <CallsHub /> },
  { key: 'acceptance',   label: 'سلسلة القبول',       render: () => <HospitalReview /> },
  { key: 'reassignment', label: 'إعادة الإسناد',      render: () => <TrainerReassignment /> },
  { key: 'leaves',       label: 'الإجازات',           render: () => <TrainerLeaveManagement /> },
  { key: 'logbook',      label: 'السجل السريري',      render: () => <LogbookPage /> },
  { key: 'incidents',    label: 'البلاغات',            render: () => <Incidents /> },
  { key: 'graduation',   label: 'التخرج',             render: () => <Graduation /> },
];

export const HospitalWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const initial = SECTIONS.some((s) => s.key === requested) ? requested! : 'overview';
  const [active, setActive] = useState(initial);

  const goTo = (tab: string) => {
    setActive(tab);
    setParams({ tab }, { replace: true });
  };

  const section = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        eyebrow="HOSPITAL OPERATIONAL WORKSPACE"
        icon={Stethoscope}
        title={user?.activeOrganization?.nameAr ?? 'مساحة عمل المستشفى'}
        subtitle="مركز العمليات — الطاقة الاستيعابية والمدربون والنداءات والتقييمات والسجل السريري والتخرج"
      />

      <Box sx={{ borderBottom: 1, borderColor: '#E2E8F0' }}>
        <Tabs
          value={active}
          onChange={(_, v) => goTo(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { color: '#64748B', fontWeight: 700, fontSize: 13.5, minHeight: 46 },
            '& .Mui-selected': { color: '#0F766E !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#0F766E', height: 3 },
          }}
        >
          {SECTIONS.map((s) => <Tab key={s.key} value={s.key} label={s.label} />)}
        </Tabs>
      </Box>

      <div>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <CircularProgress size={32} style={{ color: '#0F766E' }} />
          </div>
        }>
          {section.render(goTo)}
        </Suspense>
      </div>
    </div>
  );
};

export default HospitalWorkspace;
