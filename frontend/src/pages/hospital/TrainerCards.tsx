import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import {
  Chip, CircularProgress, Collapse, Dialog, DialogContent, DialogTitle,
  IconButton, LinearProgress, MenuItem, TextField, Tooltip,
} from '@mui/material';
import {
  ArrowRightLeft, CalendarOff, ChevronDown, ChevronUp, Eye, Search,
  UserCog, UserPlus, Users,
} from 'lucide-react';

/**
 * Trainer cards for the hospital workspace.
 *
 * Reads the aggregated `/trainers/workspace-cards` feed — qualification,
 * capacity, occupancy, current trainees and leave in one call — and routes every
 * action back to the existing workflows rather than reimplementing them.
 */

const LEAVE_LABELS: Record<string, string> = {
  annual_leave: 'إجازة سنوية',
  emergency_leave: 'إجازة اضطرارية',
  sick_leave: 'إجازة مرضية',
  maternity_leave: 'إجازة أمومة',
  training_course: 'دورة تدريبية',
  conference: 'مؤتمر',
  temporary_assignment: 'انتداب مؤقت',
  transfer: 'نقل',
  retirement: 'تقاعد',
  resignation: 'استقالة',
};

const barColour = (pct: number) => (pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981');

export const TrainerCards: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [profile, setProfile] = useState<any | null>(null);

  const { data: trainers, isLoading } = useQuery({
    queryKey: ['trainer-cards'],
    queryFn: async () => {
      const res = await apiClient.get('/trainers/workspace-cards').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of trainers ?? []) if (t.department) map.set(t.department.id, t.department.nameAr);
    return [...map.entries()];
  }, [trainers]);

  const visible = useMemo(() => {
    const needle = search.trim();
    return (trainers ?? []).filter((t: any) => {
      const matchesDept = deptFilter === 'all' || t.department?.id === deptFilter;
      const matchesName = !needle || `${t.nameAr ?? ''} ${t.nameEn ?? ''}`.includes(needle);
      return matchesDept && matchesName;
    });
  }, [trainers, search, deptFilter]);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><CircularProgress /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="بحث باسم المدرب" value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <Search size={16} style={{ marginLeft: 8, color: '#64748b' }} /> }}
          sx={{ minWidth: 240 }}
        />
        <TextField
          size="small" select label="القسم" value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)} sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">كل الأقسام</MenuItem>
          {departments.map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}
        </TextField>
        <div style={{ marginRight: 'auto', fontSize: 13, color: '#94a3b8' }}>
          {visible.length} مدرب
        </div>
      </div>

      {visible.length === 0 && (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
          لا يوجد مدربون مطابقون
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {visible.map((t: any) => {
          const isOpen = expanded === t.id;
          return (
            <div key={t.id} className="glass-card" style={{
              padding: 20,
              border: t.onLeave ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserCog size={16} color="#8b5cf6" />
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc' }}>{t.nameAr}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    {t.department?.nameAr ?? 'بدون قسم'}{t.titleAr ? ` — ${t.titleAr}` : ''}
                  </div>
                </div>
                {t.onLeave && (
                  <Chip size="small" icon={<CalendarOff size={13} />} label="في إجازة"
                    sx={{ background: 'rgba(245,158,11,0.18)', color: '#fbbf24', fontWeight: 700 }} />
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: '#94a3b8' }}>الإشغال</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 700 }}>
                    {t.occupied}/{t.maxTrainees} — متاح {t.available}
                  </span>
                </div>
                <LinearProgress
                  variant="determinate" value={Math.min(100, t.occupancyPercentage)}
                  sx={{
                    height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)',
                    '& .MuiLinearProgress-bar': { backgroundColor: barColour(t.occupancyPercentage), borderRadius: 4 },
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                {t.qualifiedPrograms.length === 0 && (
                  <span style={{ fontSize: 11, color: '#f87171' }}>غير مؤهل لأي برنامج</span>
                )}
                {t.qualifiedPrograms.map((p: any) => (
                  <Chip key={p.id} size="small" label={p.nameAr}
                    sx={{ background: 'rgba(6,182,212,0.15)', color: '#67e8f9', fontSize: 11 }} />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14, fontSize: 11, color: '#64748b' }}>
                <span>روتيشنات: <strong style={{ color: '#cbd5e1' }}>{t.rotationCount}</strong></span>
                <span>متدربون حاليون: <strong style={{ color: '#cbd5e1' }}>{t.currentTrainees.length}</strong></span>
              </div>

              {t.leave && (
                <div style={{
                  marginTop: 12, padding: 10, borderRadius: 8,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                    {LEAVE_LABELS[t.leave.leaveType] ?? t.leave.leaveType}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {String(t.leave.startDate).slice(0, 10)} → {String(t.leave.endDate).slice(0, 10)} • {t.leave.status}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    البديل: {t.leave.replacementTrainerNameAr ?? 'غير محدد'}
                    {t.leave.autoReassigned ? ' • إعادة إسناد تلقائية' : ''}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' }}>
                <Tooltip title="عرض الملف">
                  <IconButton size="small" onClick={() => setProfile(t)} sx={{ color: '#06b6d4' }}>
                    <Eye size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="المتدربون الحاليون">
                  <IconButton size="small" onClick={() => setExpanded(isOpen ? null : t.id)} sx={{ color: '#10b981' }}>
                    {isOpen ? <ChevronUp size={16} /> : <Users size={16} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="إسناد متدرب — من الطلبات الواردة">
                  <IconButton size="small" onClick={() => onNavigate('requests')} sx={{ color: '#f59e0b' }}>
                    <UserPlus size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="إعادة إسناد المتدربين">
                  <IconButton size="small" onClick={() => onNavigate('reassignment')} sx={{ color: '#a78bfa' }}>
                    <ArrowRightLeft size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="إدارة الإجازات">
                  <IconButton size="small" onClick={() => onNavigate('leaves')} sx={{ color: '#fbbf24' }}>
                    <CalendarOff size={16} />
                  </IconButton>
                </Tooltip>
              </div>

              <Collapse in={isOpen}>
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                  {t.currentTrainees.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#64748b' }}>لا يوجد متدربون حالياً</div>
                  ) : t.currentTrainees.map((c: any) => (
                    <div key={c.rotationId} style={{
                      padding: '8px 10px', marginBottom: 6, borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>{c.nameAr ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {c.departmentNameAr} • {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
                      </div>
                    </div>
                  ))}
                </div>
              </Collapse>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(profile)} onClose={() => setProfile(null)} maxWidth="sm" fullWidth>
        <DialogTitle>ملف المدرب — {profile?.nameAr}</DialogTitle>
        <DialogContent dividers>
          {profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div><strong>القسم:</strong> {profile.department?.nameAr ?? '—'}</div>
              <div><strong>المسمى:</strong> {profile.titleAr ?? '—'}</div>
              <div><strong>الجوال:</strong> {profile.phone ?? '—'}</div>
              <div><strong>البريد:</strong> {profile.email ?? '—'}</div>
              <div><strong>السعة القصوى:</strong> {profile.maxTrainees}</div>
              <div><strong>الإشغال الحالي:</strong> {profile.occupied} ({profile.occupancyPercentage}%)</div>
              <div><strong>المقاعد المتاحة:</strong> {profile.available}</div>
              <div><strong>عدد الروتيشنات:</strong> {profile.rotationCount}</div>
              <div>
                <strong>البرامج المؤهل لها:</strong>{' '}
                {profile.qualifiedPrograms.length
                  ? profile.qualifiedPrograms.map((p: any) => p.nameAr).join('، ')
                  : 'لا يوجد'}
              </div>
              <div>
                <strong>حالة الإجازة:</strong>{' '}
                {profile.leave
                  ? `${LEAVE_LABELS[profile.leave.leaveType] ?? profile.leave.leaveType} (${profile.leave.status})`
                  : 'على رأس العمل'}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerCards;
