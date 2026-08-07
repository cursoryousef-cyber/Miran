import React, { useState, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Tab, Box, CircularProgress } from '@mui/material';
import { Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import { WorkspaceOverview } from './WorkspaceOverview';
import { TrainerCards } from './TrainerCards';
const CallsHub = lazy(() => import('./CallsHub').then(m => ({ default: m.CallsHub })));

// Existing pages are mounted as sections rather than reimplemented, so every
// workflow they own — capacity editing, acceptance, reassignment, leave,
// logbook, incidents, graduation — keeps behaving exactly as before.
import { HospitalCapacity } from '../HospitalCapacity';
import { HospitalReview } from '../HospitalReview';
import { AcceptanceChain } from '../AcceptanceChain';
import { TrainerReassignment } from '../TrainerReassignment';
import { TrainerLeaveManagement } from '../TrainerLeaveManagement';
import { LogbookPage } from '../Logbook';
import { Incidents } from '../Incidents';
import { Graduation } from '../Graduation';

/**
 * The hospital operational workspace — one page for everything a hospital runs.
 *
 * The tab key lives in the query string so a section can be linked to directly
 * and survives a refresh, which is what lets the old standalone routes redirect
 * here without losing their destination.
 */

interface Section {
  key: string;
  label: string;
  render: (goTo: (tab: string) => void) => React.ReactNode;
}

const SECTIONS: Section[] = [
  { key: 'overview',     label: 'نظرة عامة',         render: (goTo) => <WorkspaceOverview onNavigate={goTo} /> },
  { key: 'capacity',     label: 'الطاقة الاستيعابية', render: () => <HospitalCapacity /> },
  { key: 'trainers',     label: 'المدربون',           render: (goTo) => <TrainerCards onNavigate={goTo} /> },
  { key: 'calls',        label: '🔔 النداءات',        render: () => <CallsHub /> },
  { key: 'requests',     label: 'الطلبات الواردة',    render: () => <HospitalReview /> },
  { key: 'acceptance',   label: 'سلسلة القبول',       render: () => <AcceptanceChain /> },
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
      <div
        className="glass-card"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Stethoscope size={20} color="#f59e0b" />
          <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>Hospital Operational Workspace</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          {user?.activeOrganization?.nameAr ?? 'مساحة عمل المستشفى'}
        </h1>
        <p style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6 }}>
          مركز العمليات — السعة والمدربون والنداءات والطلبات والروتيشنات والتقييمات والتخرج في مكان واحد
        </p>
      </div>

      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Tabs
          value={active}
          onChange={(_, v) => goTo(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { color: '#94a3b8', fontWeight: 700, fontSize: 13, minHeight: 44 },
            '& .Mui-selected': { color: '#f59e0b !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#f59e0b' },
          }}
        >
          {SECTIONS.map((s) => <Tab key={s.key} value={s.key} label={s.label} />)}
        </Tabs>
      </Box>

      <div>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <CircularProgress size={30} style={{ color: '#f59e0b' }} />
          </div>
        }>
          {section.render(goTo)}
        </Suspense>
      </div>
    </div>
  );
};

export default HospitalWorkspace;
