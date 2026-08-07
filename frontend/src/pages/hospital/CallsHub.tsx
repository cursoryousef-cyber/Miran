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
  notified:           { label: 'مُبلَّغ',         color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  acknowledged:       { label: 'أكّد الاستلام',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  self_arrived:       { label: 'في الطريق',       color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  confirmed_arrived:  { label: 'وصل ✓',           color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  no_show:            { label: 'لم يحضر',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const CALL_TYPE_META: Record<string, { label: string; icon: string; accent: string }> = {
  urgent:           { label: 'حالة عاجلة',           icon: '🚨', accent: '#ef4444' },
  interesting_case: { label: 'حالة مثيرة للاهتمام', icon: '🔬', accent: '#f59e0b' },
  skill_training:   { label: 'تدريب على مهارة',     icon: '🩺', accent: '#06b6d4' },
  teaching_round:   { label: 'راوند تعليمي',        icon: '📚', accent: '#8b5cf6' },
  general:          { label: 'عام',                  icon: '📢', accent: '#10b981' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export const CallsHub: React.FC = () => {
  const { primaryRole } = useAuth();
  const qc = useQueryClient();

  const isTrainer = ['trainer', 'org_manager', 'platform_owner', 'hospital_administrator',
    'training_supervisor', 'cluster_administrator'].includes(primaryRole ?? '');
  const isTrainee = primaryRole === 'trainee';

  // Launch form state
  const [launching, setLaunching] = useState(false);
  const [launchMsg, setLaunchMsg] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // ── Trainer: active calls ──────────────────────────────────────────────────
  const { data: activeData, refetch: refetchActive } = useQuery({
    queryKey: ['calls-active'],
    queryFn: async () => {
      const r = await apiClient.get('/calls/active');
      return r.data?.data as TrainerCall[] ?? [];
    },
    refetchInterval: isTrainer ? 8000 : false,
    enabled: isTrainer,
  });

  // ── Trainer: history ──────────────────────────────────────────────────────
  const { data: historyData } = useQuery({
    queryKey: ['calls-history'],
    queryFn: async () => {
      const r = await apiClient.get('/calls/history?limit=20');
      return r.data?.data as TrainerCall[] ?? [];
    },
    enabled: isTrainer,
  });

  // ── Trainer: diligence scores ─────────────────────────────────────────────
  const { data: diligenceData } = useQuery({
    queryKey: ['calls-diligence'],
    queryFn: async () => {
      const r = await apiClient.get('/calls/diligence');
      return r.data?.data ?? [];
    },
    enabled: isTrainer,
  });

  // ── Trainee: incoming calls ───────────────────────────────────────────────
  const { data: incomingData, refetch: refetchIncoming } = useQuery({
    queryKey: ['calls-my-incoming'],
    queryFn: async () => {
      const r = await apiClient.get('/calls/my-incoming');
      return r.data?.data ?? [];
    },
    refetchInterval: isTrainee ? 10000 : false,
    enabled: isTrainee,
  });

  const activeIncoming = (incomingData ?? []).filter((p: any) => p.call?.status === 'active');

  // ── Launch a call ─────────────────────────────────────────────────────────
  const handleLaunch = async () => {
    const callType = (document.getElementById('launch-type') as HTMLInputElement)?.value ?? 'urgent';
    const customTitle = (document.getElementById('launch-title') as HTMLInputElement)?.value;
    const note = (document.getElementById('launch-note') as HTMLTextAreaElement)?.value;
    const location = (document.getElementById('launch-location') as HTMLInputElement)?.value;
    const expectedMinutes = parseInt((document.getElementById('launch-minutes') as HTMLInputElement)?.value ?? '15');

    setLaunching(true);
    setLaunchMsg(null);
    try {
      const r = await apiClient.post('/calls/launch', { callType, customTitle, note, location, expectedMinutes });
      setLaunchMsg(`✅ تم إطلاق النداء — تم إشعار ${r.data?.data?.traineesNotified ?? 0} متدرب`);
      refetchActive();
      qc.invalidateQueries({ queryKey: ['calls-history'] });
    } catch (e: any) {
      setLaunchMsg(`❌ ${e?.response?.data?.message ?? 'حدث خطأ'}`);
    } finally {
      setLaunching(false);
    }
  };

  // ── End a call ───────────────────────────────────────────────────────────
  const handleEnd = async (callId: string) => {
    setEnding(callId);
    try {
      await apiClient.post(`/calls/${callId}/end`, {});
      refetchActive();
      qc.invalidateQueries({ queryKey: ['calls-history'] });
      qc.invalidateQueries({ queryKey: ['calls-diligence'] });
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'حدث خطأ أثناء إنهاء النداء');
    } finally {
      setEnding(null);
    }
  };

  // ── Trainer confirms trainee arrived ─────────────────────────────────────
  const handleConfirmArrival = async (callId: string, traineeProfileId: string) => {
    setConfirming(traineeProfileId);
    try {
      await apiClient.post(`/calls/${callId}/confirm-arrival`, { traineeProfileId });
      refetchActive();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'خطأ');
    } finally {
      setConfirming(null);
    }
  };

  // ── Trainee responds ────────────────────────────────────────────────────
  const handleTraineeResponse = async (callId: string, action: 'ack' | 'on-way' | 'arrived') => {
    try {
      await apiClient.post(`/calls/${callId}/${action}`, {});
      refetchIncoming();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'خطأ');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── TRAINEE VIEW ─────────────────────────────────────────────────── */}
      {isTrainee && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Active call alert */}
          {activeIncoming.length > 0 && activeIncoming.map((p: any) => {
            const meta = CALL_TYPE_META[p.call?.callType] ?? CALL_TYPE_META.general;
            return (
              <div key={p.id} className="glass-card" style={{
                padding: 24, border: `2px solid ${meta.accent}`,
                background: `linear-gradient(135deg, ${meta.accent}18, rgba(15,23,42,0.95))`,
                animation: 'pulse 2s infinite',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Radio size={22} color={meta.accent} />
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>
                    {meta.icon} {p.call?.customTitle ?? meta.label}
                  </span>
                  <Chip label="نداء نشط" size="small" sx={{ background: meta.accent + '30', color: meta.accent, fontWeight: 700, ml: 'auto' }} />
                </div>
                {p.call?.note && <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 12px' }}>{p.call.note}</p>}
                {p.call?.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                    <MapPin size={14} /> {p.call.location}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {p.state === 'notified' && (
                    <Button variant="contained" size="small"
                      onClick={() => handleTraineeResponse(p.call.id, 'ack')}
                      style={{ background: '#f59e0b', fontWeight: 700 }}>
                      ✅ تأكيد الاستلام
                    </Button>
                  )}
                  {p.state === 'acknowledged' && (
                    <Button variant="contained" size="small"
                      onClick={() => handleTraineeResponse(p.call.id, 'on-way')}
                      style={{ background: '#06b6d4', fontWeight: 700 }}>
                      🚶 أنا في الطريق
                    </Button>
                  )}
                  {p.state === 'self_arrived' && (
                    <Button variant="contained" size="small"
                      onClick={() => handleTraineeResponse(p.call.id, 'arrived')}
                      style={{ background: '#10b981', fontWeight: 700 }}>
                      📍 وصلت
                    </Button>
                  )}
                  {p.state === 'confirmed_arrived' && (
                    <Chip label="✓ تم تأكيد وصولك من المدرب" sx={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 700 }} />
                  )}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
                  حالتك: <strong style={{ color: STATE_META[p.state]?.color }}>{STATE_META[p.state]?.label ?? p.state}</strong>
                </div>
              </div>
            );
          })}

          {activeIncoming.length === 0 && (
            <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
              <Phone size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 700 }}>لا توجد نداءات نشطة في الوقت الحالي</p>
            </div>
          )}

          {/* My call history */}
          {(incomingData ?? []).filter((p: any) => p.call?.status === 'ended').length > 0 && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>سجل النداءات السابقة</h3>
              {(incomingData ?? []).filter((p: any) => p.call?.status === 'ended').slice(0, 10).map((p: any) => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                      {CALL_TYPE_META[p.call?.callType]?.icon} {p.call?.customTitle ?? CALL_TYPE_META[p.call?.callType]?.label ?? p.call?.callType}
                    </span>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {new Date(p.notifiedAt).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                  <Chip
                    label={STATE_META[p.state]?.label ?? p.state}
                    size="small"
                    sx={{ background: STATE_META[p.state]?.bg, color: STATE_META[p.state]?.color, fontWeight: 700 }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TRAINER / SUPERVISOR VIEW ────────────────────────────────────── */}
      {isTrainer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Active Calls Grid ─────────────────────────────────────────── */}
          {(activeData ?? []).length > 0 && (activeData ?? []).map((call) => (
            <div key={call.id} className="glass-card" style={{
              padding: 24,
              border: `2px solid ${CALL_TYPE_META[call.callType]?.accent ?? '#f59e0b'}50`,
              background: `linear-gradient(135deg, ${CALL_TYPE_META[call.callType]?.accent ?? '#f59e0b'}10, rgba(15,23,42,0.95))`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Chip label="نشط الآن" size="small" sx={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 700 }} />
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                      {CALL_TYPE_META[call.callType]?.icon} {call.customTitle ?? CALL_TYPE_META[call.callType]?.label}
                    </span>
                  </div>
                  {call.note && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>{call.note}</p>}
                  {call.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      <MapPin size={12} /> {call.location}
                    </div>
                  )}
                </div>
                <Button
                  variant="outlined" size="small"
                  disabled={ending === call.id}
                  onClick={() => handleEnd(call.id)}
                  startIcon={<PhoneOff size={14} />}
                  style={{ borderColor: '#ef4444', color: '#ef4444', fontWeight: 700 }}>
                  {ending === call.id ? 'جارٍ الإنهاء...' : 'إنهاء النداء'}
                </Button>
              </div>

              {/* Live stats bar */}
              {call.participants.length > 0 && (() => {
                const stats = {
                  total: call.participants.length,
                  acked: call.participants.filter(p => ['acknowledged','self_arrived','confirmed_arrived'].includes(p.state)).length,
                  arrived: call.participants.filter(p => ['self_arrived','confirmed_arrived'].includes(p.state)).length,
                  confirmed: call.participants.filter(p => p.state === 'confirmed_arrived').length,
                };
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'مُبلَّغ', val: stats.total, color: '#94a3b8' },
                      { label: 'أكّد', val: stats.acked, color: '#f59e0b' },
                      { label: 'في الطريق', val: stats.arrived, color: '#06b6d4' },
                      { label: 'وصل', val: stats.confirmed, color: '#10b981' },
                    ].map(s => (
                      <div key={s.label} style={{ padding: '10px 12px', background: `${s.color}12`, borderRadius: 8, textAlign: 'center', border: `1px solid ${s.color}30` }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Participant grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
                {call.participants.map((p) => {
                  const meta = STATE_META[p.state] ?? { label: p.state, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
                  return (
                    <div key={p.id} style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: meta.bg, border: `1px solid ${meta.color}30`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{p.traineeProfile?.person?.nameAr ?? '—'}</div>
                        <div style={{ fontSize: 11, color: meta.color, marginTop: 2 }}>{meta.label}</div>
                      </div>
                      {(p.state === 'self_arrived') && (
                        <Tooltip title="تأكيد الوصول الفعلي">
                          <button
                            disabled={confirming === p.traineeProfile?.person?.nameAr}
                            onClick={() => handleConfirmArrival(call.id, (p as any).traineeProfileId ?? p.id)}
                            style={{
                              background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981',
                              borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#10b981', fontSize: 11, fontWeight: 700,
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

          {/* ── Launch Form ───────────────────────────────────────────────── */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={18} color="#f59e0b" /> إطلاق نداء جديد
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 14 }}>
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ color: '#94a3b8' }}>نوع النداء</InputLabel>
                <Select defaultValue="urgent" inputProps={{ id: 'launch-type' }}
                  sx={{ color: '#f8fafc', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                  {Object.entries(CALL_TYPE_META).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v.icon} {v.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label="عنوان النداء (اختياري)" size="small" fullWidth
                inputProps={{ id: 'launch-title' }}
                sx={{ '& label': { color: '#94a3b8' }, '& input': { color: '#f8fafc' } }} />
              <TextField label="الموقع" size="small" fullWidth
                inputProps={{ id: 'launch-location' }}
                sx={{ '& label': { color: '#94a3b8' }, '& input': { color: '#f8fafc' } }} />
              <TextField label="المدة المتوقعة (دقيقة)" size="small" type="number" defaultValue={15} fullWidth
                inputProps={{ id: 'launch-minutes', min: 5, max: 120 }}
                sx={{ '& label': { color: '#94a3b8' }, '& input': { color: '#f8fafc' } }} />
            </div>
            <TextField label="ملاحظة للمتدربين" size="small" fullWidth multiline rows={2}
              inputProps={{ id: 'launch-note' }}
              sx={{ mb: 2, '& label': { color: '#94a3b8' }, '& textarea': { color: '#f8fafc' } }} />
            {launchMsg && (
              <div style={{ marginBottom: 12, color: launchMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                {launchMsg}
              </div>
            )}
            <Button variant="contained" disabled={launching} onClick={handleLaunch}
              startIcon={<Zap size={16} />}
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', fontWeight: 700, minWidth: 160 }}>
              {launching ? 'جارٍ الإطلاق...' : 'إطلاق النداء 🔔'}
            </Button>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
              ⚠️ هذه الأداة تعليمية وقياسية — ليست نظام استدعاء طوارئ سريرياً
            </p>
          </div>

          {/* ── Diligence Leaderboard ─────────────────────────────────────── */}
          {(diligenceData ?? []).length > 0 && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#8b5cf6" /> مؤشر الحرص — ترتيب المتدربين
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(diligenceData ?? []).slice(0, 10).map((d: any, idx: number) => (
                  <div key={d.traineeProfileId} style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 80px 80px 80px 90px',
                    alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: idx === 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                    borderRadius: 8, border: `1px solid ${idx === 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    <span style={{ fontSize: 13, color: idx < 3 ? '#f59e0b' : '#94a3b8', fontWeight: 800 }}>#{idx + 1}</span>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>{d.nameAr}</span>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>أكّد</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{d.ackRate}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>حضر</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#06b6d4' }}>{d.arrivalRate}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>نداءات</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>{d.totalCalls}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>الحرص</div>
                      <LinearProgress variant="determinate" value={d.diligenceScore}
                        sx={{
                          height: 6, borderRadius: 3,
                          background: 'rgba(255,255,255,0.1)',
                          '& .MuiLinearProgress-bar': {
                            background: d.diligenceScore >= 80 ? '#10b981' : d.diligenceScore >= 50 ? '#f59e0b' : '#ef4444',
                          },
                        }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: d.diligenceScore >= 80 ? '#10b981' : d.diligenceScore >= 50 ? '#f59e0b' : '#ef4444', marginTop: 2 }}>
                        {d.diligenceScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Call History Table ─────────────────────────────────────────── */}
          {(historyData ?? []).length > 0 && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="#94a3b8" /> سجل النداءات
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['النوع', 'العنوان', 'التاريخ', 'الحالة', 'المشاركون', 'وصلوا', 'نسبة الوصول'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(historyData ?? []).map((c: TrainerCall) => {
                      const meta = CALL_TYPE_META[c.callType] ?? CALL_TYPE_META.general;
                      const s = (c as any).stats ?? { total: 0, arrived: 0, arrivalRatePct: 0 };
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 12px', color: meta.accent }}>{meta.icon} {meta.label}</td>
                          <td style={{ padding: '8px 12px', color: '#f8fafc' }}>{c.customTitle ?? '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{new Date(c.launchedAt).toLocaleDateString('ar-SA')}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <Chip label={c.status === 'ended' ? 'منتهٍ' : 'نشط'} size="small"
                              sx={{ background: c.status === 'ended' ? 'rgba(148,163,184,0.15)' : 'rgba(16,185,129,0.15)', color: c.status === 'ended' ? '#94a3b8' : '#10b981', fontWeight: 700 }} />
                          </td>
                          <td style={{ padding: '8px 12px', color: '#f8fafc', textAlign: 'center' }}>{s.total}</td>
                          <td style={{ padding: '8px 12px', color: '#06b6d4', textAlign: 'center' }}>{s.arrived}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ color: s.arrivalRatePct >= 80 ? '#10b981' : s.arrivalRatePct >= 50 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
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
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <Phone size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>لم يُطلق أي نداء بعد</p>
              <p style={{ margin: '8px 0 0', fontSize: 13 }}>استخدم النموذج أعلاه لإطلاق أول نداء</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CallsHub;
