import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, TextField, Select, MenuItem, FormControl,
  InputLabel, Chip, LinearProgress, Tooltip,
} from '@mui/material';
import {
  Phone, PhoneOff, CheckCircle2, Clock, MapPin,
  TrendingUp, Users, Zap, AlertCircle, Radio,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallStats {
  total: number;
  acked: number;
  arrived: number;
  confirmedArrived: number;
  noShow: number;
  ackRatePct: number;
  arrivalRatePct: number;
  avgAckTime: string;
}

interface Participant {
  id: string;
  state: string;
  ackAt: string | null;
  notifiedAt: string | null;
  confirmedAt: string | null;
  traineeProfile: { person: { nameAr: string } };
}

interface TrainerCall {
  id: string;
  callType: string;
  customTitle: string | null;
  note: string | null;
  location: string | null;
  status: string;
  launchedAt: string;
  endedAt: string | null;
  participants: Participant[];
  stats?: CallStats;
}

// ─── State badge helpers ──────────────────────────────────────────────────────

const STATE_META: Record<string, { label: string; color: string; bg: string }> = {
  notified:           { label: 'مُبلَّغ',         color: '#64748B', bg: '#F1F5F9' },
  acknowledged:       { label: 'أكّد الاستلام',   color: '#B45309', bg: '#FEF3C7' },
  self_arrived:       { label: 'في الطريق',       color: '#0891B2', bg: '#CFFAFE' },
  confirmed_arrived:  { label: 'وصل ✓',           color: '#0F766E', bg: '#CCFBF1' },
  no_show:            { label: 'لم يحضر',         color: '#DC2626', bg: '#FEE2E2' },
};

const CALL_TYPE_META: Record<string, { label: string; icon: string; accent: string }> = {
  urgent:           { label: 'حالة عاجلة',           icon: '🚨', accent: '#DC2626' },
  interesting_case: { label: 'حالة مثيرة للاهتمام', icon: '🔬', accent: '#B45309' },
  skill_training:   { label: 'تدريب على مهارة',     icon: '🩺', accent: '#0891B2' },
  teaching_round:   { label: 'راوند تعليمي',        icon: '📚', accent: '#7E22CE' },
  general:          { label: 'عام',                  icon: '📢', accent: '#0F766E' },
};

export const CallsHub: React.FC = () => {
  const { primaryRole } = useAuth();
  const qc = useQueryClient();

  const isTrainer = ['trainer', 'org_manager', 'platform_owner', 'hospital_administrator',
    'training_supervisor', 'cluster_administrator'].includes(primaryRole ?? '');
  const isTrainee = primaryRole === 'trainee';

  const [launching, setLaunching] = useState(false);
  const [launchMsg, setLaunchMsg] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const { data: activeData, refetch: refetchActive } = useQuery({
    queryKey: ['calls-active'],
    queryFn: async () => {
      const r = await apiClient.get('/calls/active');
      return r.data?.data as TrainerCall[] ?? [];
    },
    refetchInterval: isTrainer ? 8000 : false,
    enabled: isTrainer,
  });

  const { data: historyData } = useQuery({
    queryKey: ['calls-history'],
    queryFn: async () => {
      const r = await apiClient.get('/calls/history?limit=20');
      return r.data?.data as TrainerCall[] ?? [];
    },
    enabled: isTrainer,
  });

  const { data: diligenceData } = useQuery({
    queryKey: ['calls-diligence'],
    queryFn: async () => {
      const r = await apiClient.get('/calls/diligence');
      return r.data?.data ?? [];
    },
    enabled: isTrainer,
  });

  const { data: incomingData, refetch: refetchIncoming } = useQuery({
    queryKey: ['calls-my-incoming'],
    queryFn: async () => {
      const r = await apiClient.get('/calls/my-incoming');
      return r.data?.data ?? [];
    },
    refetchInterval: isTrainee ? 6000 : false,
    enabled: isTrainee,
  });

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchMsg(null);
    try {
      const typeEl = (document.getElementById('launch-type') as HTMLInputElement)?.value || 'urgent';
      const titleEl = (document.getElementById('launch-title') as HTMLInputElement)?.value || '';
      const locationEl = (document.getElementById('launch-location') as HTMLInputElement)?.value || '';
      const noteEl = (document.getElementById('launch-note') as HTMLTextAreaElement)?.value || '';
      const minutesEl = Number((document.getElementById('launch-minutes') as HTMLInputElement)?.value) || 15;

      const res = await apiClient.post('/calls/launch', {
        callType: typeEl,
        customTitle: titleEl || undefined,
        location: locationEl || undefined,
        note: noteEl || undefined,
        expectedMinutes: minutesEl,
      });

      const notified = res.data?.data?.notifiedCount ?? 0;
      setLaunchMsg(`✅ تم إطلاق النداء بنجاح وتنبيه ${notified} متدرباً`);
      refetchActive();
      qc.invalidateQueries({ queryKey: ['calls-history'] });
    } catch (e: any) {
      setLaunchMsg(`❌ ${e.response?.data?.message || 'تعذر إطلاق النداء'}`);
    } finally {
      setLaunching(false);
    }
  };

  const handleEnd = async (callId: string) => {
    setEnding(callId);
    try {
      await apiClient.post(`/calls/${callId}/end`);
      refetchActive();
      qc.invalidateQueries({ queryKey: ['calls-history'] });
    } catch (e: any) {
      alert(e.response?.data?.message || 'تعذر إنهاء النداء');
    } finally {
      setEnding(null);
    }
  };

  const handleConfirmArrival = async (callId: string, traineeProfileId: string) => {
    setConfirming(traineeProfileId);
    try {
      await apiClient.post(`/calls/${callId}/confirm-arrival`, { traineeProfileId });
      refetchActive();
    } catch (e: any) {
      alert(e.response?.data?.message || 'تعذر تأكيد الوصول');
    } finally {
      setConfirming(null);
    }
  };

  const handleAck = async (callId: string) => {
    try {
      await apiClient.post(`/calls/${callId}/ack`);
      refetchIncoming();
    } catch (e: any) {
      alert(e.response?.data?.message || 'تعذر تأكيد الاستلام');
    }
  };

  const handleArrived = async (callId: string) => {
    try {
      await apiClient.post(`/calls/${callId}/arrived`);
      refetchIncoming();
    } catch (e: any) {
      alert(e.response?.data?.message || 'تعذر تسجيل الوصول');
    }
  };

  const activeIncoming = (incomingData ?? []).filter((p: any) => p.call?.status === 'active');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        borderRadius: 16, border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Radio size={20} color="#0F766E" />
            <span style={{ fontSize: 12, color: '#0F766E', fontWeight: 700 }}>مركز النداءات الميدانية السريعة</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            {isTrainer ? 'إطلاق ومتابعة النداءات السريرية (Live Call Dispatch)' : 'النداءات الواردة (My Incoming Calls)'}
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            تنبيه استدعاء لحظي لجميع أطباء الامتياز بالأقسام السريرية واستجابة مباشرة مع حساب مؤشر الحرص
          </p>
        </div>

        {isTrainer && (activeData ?? []).length > 0 && (
          <Chip
            icon={<Radio size={14} color="#0F766E" />}
            label={`${activeData!.length} نداء نشط الآن`}
            sx={{ backgroundColor: '#CCFBF1', color: '#0F766E', fontWeight: 800, fontSize: 13, padding: '4px 8px' }}
          />
        )}
      </div>

      {/* ── TRAINEE VIEW ─────────────────────────────────────────────────── */}
      {isTrainee && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activeIncoming.map((p: any) => {
            const c: TrainerCall = p.call;
            const meta = CALL_TYPE_META[c.callType] ?? CALL_TYPE_META.general;
            const stateMeta = STATE_META[p.state] ?? STATE_META.notified;

            return (
              <div key={p.id} className="glass-card" style={{
                padding: 24, border: `2px solid ${meta.accent}`,
                background: `#FFFFFF`, borderRadius: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{meta.icon}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                        {c.customTitle ?? meta.label}
                      </span>
                    </div>
                    {c.note && <p style={{ margin: '8px 0 0', fontSize: 13.5, color: '#334155' }}>{c.note}</p>}
                    {c.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: '#64748B', marginTop: 6 }}>
                        <MapPin size={13} color="#0F766E" /> {c.location}
                      </div>
                    )}
                  </div>
                  <Chip label={stateMeta.label} sx={{ background: stateMeta.bg, color: stateMeta.color, fontWeight: 800 }} />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  {p.state === 'notified' && (
                    <Button variant="contained" onClick={() => handleAck(c.id)}
                      style={{ background: '#0F766E', fontWeight: 700, borderRadius: 10 }}>
                      تأكيد الاستلام ✋
                    </Button>
                  )}
                  {['notified', 'acknowledged'].includes(p.state) && (
                    <Button variant="contained" onClick={() => handleArrived(c.id)}
                      style={{ background: '#0891B2', fontWeight: 700, borderRadius: 10 }}>
                      أنا في الطريق / وصلت 🏃
                    </Button>
                  )}
                  {['self_arrived', 'confirmed_arrived'].includes(p.state) && (
                    <Chip label="تم تسليم الاستجابة بنجاح ✓" color="success" sx={{ fontWeight: 700 }} />
                  )}
                </div>
              </div>
            );
          })}

          {activeIncoming.length === 0 && (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
              <Phone size={36} style={{ margin: '0 auto 12px', opacity: 0.4, color: '#0F766E' }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0F172A' }}>لا توجد نداءات نشطة في الوقت الحالي</p>
            </div>
          )}
        </div>
      )}

      {/* ── TRAINER / SUPERVISOR VIEW ────────────────────────────────────── */}
      {isTrainer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Active Calls Grid */}
          {(activeData ?? []).length > 0 && (activeData ?? []).map((call) => (
            <div key={call.id} className="glass-card" style={{
              padding: 24,
              border: `2px solid ${CALL_TYPE_META[call.callType]?.accent ?? '#0F766E'}`,
              backgroundColor: '#FFFFFF', borderRadius: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Chip label="نشط الآن" size="small" sx={{ background: '#CCFBF1', color: '#0F766E', fontWeight: 800 }} />
                    <span style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                      {CALL_TYPE_META[call.callType]?.icon} {call.customTitle ?? CALL_TYPE_META[call.callType]?.label}
                    </span>
                  </div>
                  {call.note && <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#475569' }}>{call.note}</p>}
                  {call.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B', marginTop: 4 }}>
                      <MapPin size={12} color="#0F766E" /> {call.location}
                    </div>
                  )}
                </div>
                <Button
                  variant="outlined" size="small"
                  disabled={ending === call.id}
                  onClick={() => handleEnd(call.id)}
                  startIcon={<PhoneOff size={14} />}
                  style={{ borderColor: '#EF4444', color: '#EF4444', fontWeight: 700, borderRadius: 10 }}>
                  {ending === call.id ? 'جارٍ الإنهاء...' : 'إنهاء النداء'}
                </Button>
              </div>

              {call.participants.length > 0 && (() => {
                const stats = {
                  total: call.participants.length,
                  acked: call.participants.filter(p => ['acknowledged','self_arrived','confirmed_arrived'].includes(p.state)).length,
                  arrived: call.participants.filter(p => ['self_arrived','confirmed_arrived'].includes(p.state)).length,
                  confirmed: call.participants.filter(p => p.state === 'confirmed_arrived').length,
                };
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'مُبلَّغ', val: stats.total, color: '#64748B', bg: '#F1F5F9' },
                      { label: 'أكّد', val: stats.acked, color: '#B45309', bg: '#FEF3C7' },
                      { label: 'في الطريق', val: stats.arrived, color: '#0891B2', bg: '#CFFAFE' },
                      { label: 'وصل', val: stats.confirmed, color: '#0F766E', bg: '#CCFBF1' },
                    ].map(s => (
                      <div key={s.label} style={{ padding: '10px 12px', background: s.bg, borderRadius: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 10 }}>
                {call.participants.map((p) => {
                  const meta = STATE_META[p.state] ?? { label: p.state, color: '#64748B', bg: '#F1F5F9' };
                  return (
                    <div key={p.id} style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: meta.bg, border: `1px solid ${meta.color}20`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{p.traineeProfile?.person?.nameAr ?? '—'}</div>
                        <div style={{ fontSize: 11, color: meta.color, marginTop: 2, fontWeight: 700 }}>{meta.label}</div>
                      </div>
                      {(p.state === 'self_arrived') && (
                        <Tooltip title="تأكيد الوصول الفعلي">
                          <button
                            disabled={confirming === p.traineeProfile?.person?.nameAr}
                            onClick={() => handleConfirmArrival(call.id, (p as any).traineeProfileId ?? p.id)}
                            style={{
                              background: '#0F766E', border: 'none',
                              borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: '#FFFFFF', fontSize: 11, fontWeight: 700,
                            }}>
                            تأكيد ✓
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Launch Form */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={18} color="#0F766E" /> إطلاق نداء جديد
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 16 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>نوع النداء</InputLabel>
                <Select defaultValue="urgent" inputProps={{ id: 'launch-type' }} label="نوع النداء">
                  {Object.entries(CALL_TYPE_META).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v.icon} {v.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label="عنوان النداء (اختياري)" size="small" fullWidth inputProps={{ id: 'launch-title' }} />
              <TextField label="الموقع" size="small" fullWidth inputProps={{ id: 'launch-location' }} />
              <TextField label="المدة المتوقعة (دقيقة)" size="small" type="number" defaultValue={15} fullWidth inputProps={{ id: 'launch-minutes', min: 5, max: 120 }} />
            </div>
            <TextField label="ملاحظة للمتدربين" size="small" fullWidth multiline rows={2} inputProps={{ id: 'launch-note' }} sx={{ mb: 2 }} />
            {launchMsg && (
              <div style={{ marginBottom: 12, color: launchMsg.startsWith('✅') ? '#0F766E' : '#DC2626', fontWeight: 700, fontSize: 13 }}>
                {launchMsg}
              </div>
            )}
            <Button variant="contained" disabled={launching} onClick={handleLaunch}
              startIcon={<Zap size={16} />}
              style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)', fontWeight: 700, minWidth: 160, borderRadius: 12 }}>
              {launching ? 'جارٍ الإطلاق...' : 'إطلاق النداء 🔔'}
            </Button>
          </div>

          {/* Diligence Leaderboard */}
          {(diligenceData ?? []).length > 0 && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#0F766E" /> مؤشر الحرص — ترتيب المتدربين
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(diligenceData ?? []).slice(0, 10).map((d: any, idx: number) => (
                  <div key={d.traineeProfileId} style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 80px 80px 80px 90px',
                    alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: idx === 0 ? '#F0FDF4' : '#F8FAFC',
                    borderRadius: 10, border: `1px solid ${idx === 0 ? '#99F6E4' : '#E2E8F0'}`,
                  }}>
                    <span style={{ fontSize: 13, color: idx < 3 ? '#0F766E' : '#64748B', fontWeight: 800 }}>#{idx + 1}</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{d.nameAr}</span>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748B' }}>أكّد</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#B45309' }}>{d.ackRate}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748B' }}>حضر</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0891B2' }}>{d.arrivalRate}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748B' }}>نداءات</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>{d.totalCalls}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>الحرص</div>
                      <LinearProgress variant="determinate" value={d.diligenceScore}
                        sx={{
                          height: 6, borderRadius: 3,
                          background: '#E2E8F0',
                          '& .MuiLinearProgress-bar': {
                            background: d.diligenceScore >= 80 ? '#0F766E' : d.diligenceScore >= 50 ? '#F59E0B' : '#DC2626',
                          },
                        }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: d.diligenceScore >= 80 ? '#0F766E' : d.diligenceScore >= 50 ? '#F59E0B' : '#DC2626', marginTop: 2 }}>
                        {d.diligenceScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call History Table */}
          {(historyData ?? []).length > 0 && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="#0F766E" /> سجل النداءات
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                      {['النوع', 'العنوان', 'التاريخ', 'الحالة', 'المشاركون', 'وصلوا', 'نسبة الوصول'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(historyData ?? []).map((c: TrainerCall) => {
                      const meta = CALL_TYPE_META[c.callType] ?? CALL_TYPE_META.general;
                      const s = (c as any).stats ?? { total: 0, arrived: 0, arrivalRatePct: 0 };
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 12px', color: meta.accent, fontWeight: 700 }}>{meta.icon} {meta.label}</td>
                          <td style={{ padding: '10px 12px', color: '#0F172A' }}>{c.customTitle ?? '—'}</td>
                          <td style={{ padding: '10px 12px', color: '#64748B' }}>{new Date(c.launchedAt).toLocaleDateString('ar-SA')}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <Chip label={c.status === 'ended' ? 'منتهٍ' : 'نشط'} size="small"
                              sx={{ background: c.status === 'ended' ? '#F1F5F9' : '#CCFBF1', color: c.status === 'ended' ? '#64748B' : '#0F766E', fontWeight: 700 }} />
                          </td>
                          <td style={{ padding: '10px 12px', color: '#0F172A', textAlign: 'center', fontWeight: 700 }}>{s.total}</td>
                          <td style={{ padding: '10px 12px', color: '#0891B2', textAlign: 'center', fontWeight: 700 }}>{s.arrived}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ color: s.arrivalRatePct >= 80 ? '#0F766E' : s.arrivalRatePct >= 50 ? '#B45309' : '#DC2626', fontWeight: 700 }}>
                              {s.arrivalRatePct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {(activeData ?? []).length === 0 && (historyData ?? []).length === 0 && (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
              <Phone size={40} style={{ margin: '0 auto 12px', opacity: 0.4, color: '#0F766E' }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#0F172A' }}>لم يُطلق أي نداء بعد</p>
              <p style={{ margin: '8px 0 0', fontSize: 13 }}>استخدم النموذج أعلاه لإطلاق أول نداء</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CallsHub;
