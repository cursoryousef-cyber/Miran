import { UsersRound, CheckCircle2, UserCog, GraduationCap, AlertTriangle, Edit, ShieldAlert } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { Badge, CardGrid, DataPageShell, EmptyState, EntityCard, Surface, TableCard, ViewToggle } from '../components/ui';
import { colour, font, radius, space } from '../components/ui/tokens';
import { Button } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemberRole { id: string; code: string; nameAr: string; }
interface OrgMember {
  id: string;
  email: string;
  username?: string;
  isActive: boolean;
  nameAr?: string;
  nameEn?: string;
  nationalId?: string;
  phone?: string;
  roles: MemberRole[];
  isPrimary?: boolean;
}
interface RoleDef { id: string; code: string; nameAr: string; nameEn?: string; }
interface DeptDef { id: string; code?: string; nameAr: string; }

// ── Role Color Map ─────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  org_manager:        { bg: 'rgba(5,150,105,0.15)',   text: '#059669' },
  academic_supervisor:{ bg: 'rgba(139,92,246,0.15)',  text: '#6D28D9' },
  trainer:            { bg: 'rgba(6,182,212,0.15)',   text: '#0E7490' },
  trainee:            { bg: 'rgba(59,130,246,0.15)',  text: '#2563EB' },
};
const getRoleColor = (code: string) => ROLE_COLORS[code] || { bg: '#F1F5F9', text: '#94a3b8' };

const ROLE_LABELS: Record<string, string> = {
  org_manager: 'مدير الجهة',
  academic_supervisor: 'مشرف أكاديمي',
  trainer: 'مدرب',
  trainee: 'متدرب',
};

// ── OrgMembers Page ───────────────────────────────────────────────────────────
export const OrgMembersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('orgId') || '';

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [departments, setDepartments] = useState<DeptDef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [membersRes, rolesRes, deptsRes] = await Promise.all([
        apiClient.get('/org-members'),
        apiClient.get('/org-members/roles/available'),
        apiClient.get('/org-members/departments'),
      ]);
      setMembers(membersRes.data?.data || membersRes.data || []);
      setRoles(rolesRes.data?.data || []);
      setDepartments(deptsRes.data?.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'فشل تحميل البيانات');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredMembers = members.filter((m) => {
    const matchRole = !filterRole || m.roles.some((r) => r.code === filterRole);
    const matchSearch = !search ||
      (m.nameAr || '').includes(search) ||
      m.email.includes(search) ||
      (m.nationalId || '').includes(search);
    return matchRole && matchSearch;
  });

  const [editMember, setEditMember] = useState<OrgMember | null>(null);

  const handleDeactivate = async (id: string) => {
    if (!window.confirm('هل تريد تعطيل هذا الحساب؟')) return;
    try {
      await apiClient.delete(`/org-members/${id}`);
      setSuccessMsg('تم تعطيل الحساب');
      loadData();
    } catch (e: any) {
      setError(e.response?.data?.message || 'فشل التعطيل');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await apiClient.patch(`/org-members/${id}/activate`);
      setSuccessMsg('تم إعادة تفعيل الحساب بنجاح');
      loadData();
    } catch (e: any) {
      setError(e.response?.data?.message || 'فشل التفعيل');
    }
  };

  const roleFilterOptions = [
    { label: 'الكل', value: '' },
    { label: 'مدير الجهة', value: 'org_manager' },
    { label: 'مشرف أكاديمي', value: 'academic_supervisor' },
    { label: 'مدرب', value: 'trainer' },
    { label: 'متدرب', value: 'trainee' },
  ];

  const activeMembers = members.filter((m: any) => m.isActive !== false).length;
  const trainerMembers = members.filter((m: any) => (m.roles ?? []).some((r: any) => (r.code ?? r) === 'trainer')).length;
  const traineeMembers = members.filter((m: any) => (m.roles ?? []).some((r: any) => (r.code ?? r) === 'trainee')).length;
  const withoutDept = members.filter((m: any) => !m.departmentId && !m.department).length;

  const [view, setView] = useState<'cards' | 'table'>('cards');

  return (
    <DataPageShell
      icon={UsersRound}
      title="أعضاء الجهة"
      subtitle="إضافة وتعديل وتعطيل الأعضاء وتعيين أدوارهم وفق ضوابط الصلاحيات"
      stats={[
        { label: 'إجمالي الأعضاء', value: members.length, icon: UsersRound, tone: 'primary' },
        { label: 'أعضاء نشطون', value: activeMembers, icon: CheckCircle2, tone: 'success' },
        { label: 'المدربون', value: trainerMembers, icon: UserCog, tone: 'violet' },
        { label: 'المتدربون', value: traineeMembers, icon: GraduationCap, tone: 'info' },
        { label: 'بلا قسم', value: withoutDept, icon: AlertTriangle, tone: withoutDept ? 'warning' : 'success' },
      ]}
      toolbar={
        <div style={{ display: 'flex', gap: space.md, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {roleFilterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterRole(opt.value)}
                style={{
                  padding: '6px 14px', borderRadius: radius.md, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: font.caption, transition: 'all 0.2s', fontFamily: 'inherit',
                  background: filterRole === opt.value ? colour.primary : colour.canvas,
                  color: filterRole === opt.value ? '#ffffff' : colour.muted,
                  boxShadow: filterRole === opt.value ? '0 2px 8px rgba(15,118,110,0.25)' : 'none',
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="بحث بالاسم أو الهوية أو البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 220, padding: `${space.sm}px ${space.md}px`,
              background: colour.canvas, border: `1px solid ${colour.border}`,
              borderRadius: radius.md, color: colour.text, fontSize: font.body, outline: 'none',
              fontFamily: 'inherit',
            }}
          />

          <ViewToggle value={view} onChange={setView} />

          <Button
            variant="contained"
            onClick={() => setShowAddModal(true)}
            sx={{ background: colour.primary, fontWeight: 700, borderRadius: 2, marginRight: 'auto' }}
          >
            إضافة عضو جديد +
          </Button>
        </div>
      }
    >
      {error && (
        <div style={{ padding: space.md, background: colour.dangerSoft, borderRadius: radius.sm, color: colour.danger, fontWeight: 700 }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: space.md, background: colour.successSoft, borderRadius: radius.sm, color: colour.success, fontWeight: 700 }}>
          {successMsg}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: space['3xl'], color: colour.primary }}>
          <div style={{ fontSize: font.sectionTitle, fontWeight: 700 }}>⏳ جاري التحميل...</div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <Surface>
          <EmptyState icon={UsersRound} title="لا يوجد أعضاء مطابقون" hint="جرّب تغيير فلتر الدور أو كلمات البحث." />
        </Surface>
      ) : view === 'cards' ? (
        <CardGrid min={320}>
          {filteredMembers.map((member) => {
            const primaryRoleObj = member.roles[0];
            const roleCode = primaryRoleObj?.code || 'trainee';
            return (
              <EntityCard
                key={member.id}
                icon={roleCode === 'trainer' ? UserCog : roleCode === 'academic_supervisor' ? GraduationCap : UsersRound}
                tone={roleCode === 'org_manager' ? 'primary' : roleCode === 'trainer' ? 'violet' : roleCode === 'academic_supervisor' ? 'warning' : 'info'}
                title={member.nameAr || member.email}
                subtitle={member.username ? `@${member.username}` : member.email}
                badges={[
                  { label: member.isActive ? 'نشط' : 'معطل', tone: member.isActive ? 'success' : 'danger' },
                  ...member.roles.map((r) => ({ label: ROLE_LABELS[r.code] || r.nameAr, tone: 'info' as const })),
                ]}
                metrics={[
                  { label: 'الهوية الوطنية', value: member.nationalId || '—', tone: 'neutral' },
                  { label: 'رقم الجوال', value: member.phone || '—', tone: 'neutral' },
                ]}
                actions={[
                  { label: 'تعديل', icon: Edit, tone: 'warning', onClick: () => setEditMember(member) },
                  {
                    label: member.isActive ? 'تعطيل' : 'تفعيل',
                    icon: member.isActive ? ShieldAlert : CheckCircle2,
                    tone: member.isActive ? 'danger' : 'success',
                    onClick: () => member.isActive ? handleDeactivate(member.id) : handleActivate(member.id),
                  },
                ]}
              />
            );
          })}
        </CardGrid>
      ) : (
        <TableCard>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colour.subtle, borderBottom: `1px solid ${colour.border}` }}>
                {['الاسم', 'البريد الإلكتروني', 'الهوية', 'الأدوار', 'الحالة', 'الإجراءات'].map((h) => (
                  <th key={h} style={{ padding: `${space.md}px ${space.lg}px`, textAlign: 'right', fontSize: font.caption, fontWeight: 700, color: colour.muted, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, idx) => (
                <tr key={member.id} style={{
                  borderBottom: idx < filteredMembers.length - 1 ? `1px solid ${colour.border}` : 'none',
                }}>
                  <td style={{ padding: `${space.md}px ${space.lg}px` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: colour.primarySoft,
                        display: 'grid', placeItems: 'center',
                        fontSize: font.label, fontWeight: 700, color: colour.primary,
                      }}>
                        {(member.nameAr || member.email)[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: colour.text, fontSize: font.body }}>
                          {member.nameAr || '—'}
                        </div>
                        <div style={{ fontSize: font.caption, color: colour.muted }}>{member.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: `${space.md}px ${space.lg}px`, color: colour.muted, fontSize: font.body }}>{member.email}</td>
                  <td style={{ padding: `${space.md}px ${space.lg}px`, color: colour.muted, fontSize: font.caption, fontFamily: 'monospace' }}>
                    {member.nationalId || '—'}
                  </td>
                  <td style={{ padding: `${space.md}px ${space.lg}px` }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {member.roles.map((role) => (
                        <Badge key={role.id} label={ROLE_LABELS[role.code] || role.nameAr} tone="info" />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: `${space.md}px ${space.lg}px` }}>
                    <Badge label={member.isActive ? 'نشط' : 'معطل'} tone={member.isActive ? 'success' : 'danger'} />
                  </td>
                  <td style={{ padding: `${space.md}px ${space.lg}px` }}>
                    <div style={{ display: 'flex', gap: space.sm }}>
                      <Button size="small" variant="outlined" onClick={() => setEditMember(member)} sx={{ borderColor: colour.warning, color: colour.warning, fontWeight: 700 }}>
                        تعديل
                      </Button>
                      {member.isActive ? (
                        <Button size="small" variant="outlined" onClick={() => handleDeactivate(member.id)} sx={{ borderColor: colour.danger, color: colour.danger, fontWeight: 700 }}>
                          تعطيل
                        </Button>
                      ) : (
                        <Button size="small" variant="outlined" onClick={() => handleActivate(member.id)} sx={{ borderColor: colour.success, color: colour.success, fontWeight: 700 }}>
                          تفعيل
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          roles={roles}
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); setSuccessMsg('تم إضافة العضو بنجاح'); loadData(); }}
        />
      )}

      {/* Edit Member Modal */}
      {editMember && (
        <EditMemberModal
          member={editMember}
          roles={roles}
          onClose={() => setEditMember(null)}
          onSuccess={() => { setEditMember(null); setSuccessMsg('تم تعديل بيانات العضو بنجاح'); loadData(); }}
        />
      )}
    </DataPageShell>
  );
};

// ── Edit Member Modal ──────────────────────────────────────────────────────────
interface EditMemberModalProps {
  member: OrgMember;
  roles: RoleDef[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, roles, onClose, onSuccess }) => {
  const [nameAr, setNameAr] = useState(member.nameAr || '');
  const [phone, setPhone] = useState(member.phone || '');
  const [roleCode, setRoleCode] = useState(member.roles[0]?.code || 'trainee');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await apiClient.patch(`/org-members/${member.id}`, {
        nameAr,
        phone,
        roleCode,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تعديل البيانات');
    }
    setIsLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: '#F8FAFC',
    border: '1px solid #E2E8F0', borderRadius: '10px',
    color: '#0F172A', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', width: '100%', maxWidth: '500px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>تعديل بيانات العضو</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '20px' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>البريد الإلكتروني</label>
            <input style={{ ...inputStyle, opacity: 0.6 }} value={member.email} disabled />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#0F766E', fontWeight: 600, marginBottom: '6px' }}>الاسم بالعربية</label>
            <input style={inputStyle} value={nameAr} onChange={e => setNameAr(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>رقم الجوال</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#7E22CE', fontWeight: 600, marginBottom: '6px' }}>الدور في الجهة</label>
            <select style={inputStyle} value={roleCode} onChange={e => setRoleCode(e.target.value)}>
              {roles.map(r => <option key={r.id} value={r.code}>{r.nameAr}</option>)}
            </select>
          </div>
          {error && <div style={{ color: '#DC2626', fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '10px', color: '#64748B', cursor: 'pointer' }}>إلغاء</button>
            <button type="submit" disabled={isLoading} style={{ flex: 2, padding: '10px', background: '#0F766E', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Add Member Modal ───────────────────────────────────────────────────────────
interface AddMemberModalProps {
  roles: RoleDef[];
  departments: DeptDef[];
  onClose: () => void;
  onSuccess: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ roles, departments, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    nameAr: '', nationalId: '', email: '', phone: '',
    roleCode: 'trainee', departmentId: '', traineeNumber: '', level: 'intern',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameAr || !form.nationalId || !form.email) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await apiClient.post('/org-members', {
        ...form,
        departmentId: form.departmentId || undefined,
        traineeNumber: form.traineeNumber || undefined,
        level: form.roleCode === 'trainee' ? form.level : undefined,
      });
      onSuccess();
    } catch (e: any) {
      setError(e.response?.data?.message || 'فشل إضافة العضو');
    }
    setIsLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: '#F8FAFC',
    border: '1px solid #E2E8F0', borderRadius: '10px',
    color: '#0F172A', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        {/* Modal Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>إضافة عضو جديد للجهة</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '22px' }}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#0F766E', fontWeight: 600, marginBottom: '6px' }}>الاسم بالعربية *</label>
              <input style={inputStyle} value={form.nameAr} onChange={e => setForm({...form, nameAr: e.target.value})} placeholder="مثال: أحمد محمد العتيبي" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>رقم الهوية *</label>
              <input style={inputStyle} value={form.nationalId} onChange={e => setForm({...form, nationalId: e.target.value})} placeholder="1012345678" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>رقم الجوال</label>
              <input style={inputStyle} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+966501234567" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>البريد الإلكتروني *</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="user@miran.health" />
            </div>

            {/* Role */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#7E22CE', fontWeight: 600, marginBottom: '6px' }}>الدور</label>
              <select style={{ ...inputStyle }} value={form.roleCode} onChange={e => setForm({...form, roleCode: e.target.value})}>
                {roles.map(r => <option key={r.id} value={r.code}>{r.nameAr}</option>)}
              </select>
            </div>

            {/* Department (for trainer/trainee) */}
            {(form.roleCode === 'trainer' || form.roleCode === 'trainee') && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>القسم</label>
                <select style={{ ...inputStyle }} value={form.departmentId} onChange={e => setForm({...form, departmentId: e.target.value})}>
                  <option value="">اختر قسماً</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.nameAr}</option>)}
                </select>
              </div>
            )}

            {/* Trainee specific fields */}
            {form.roleCode === 'trainee' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#0891B2', fontWeight: 600, marginBottom: '6px' }}>رقم المتدرب</label>
                  <input style={inputStyle} value={form.traineeNumber} onChange={e => setForm({...form, traineeNumber: e.target.value})} placeholder="11028" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#0891B2', fontWeight: 600, marginBottom: '6px' }}>المستوى</label>
                  <select style={{ ...inputStyle }} value={form.level} onChange={e => setForm({...form, level: e.target.value})}>
                    <option value="intern">امتياز</option>
                    <option value="resident">مقيم</option>
                    <option value="student">طالب</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {error && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#FEE2E2', borderRadius: '10px', color: '#DC2626', fontSize: '13px' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px', background: '#F1F5F9',
              border: '1px solid #E2E8F0', borderRadius: '10px',
              color: '#64748B', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
            }}>إلغاء</button>
            <button type="submit" disabled={isLoading} style={{
              flex: 2, padding: '12px', background: isLoading ? '#99F6E4' : '#0F766E',
              border: 'none', borderRadius: '10px', color: '#fff',
              cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px',
              boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)',
            }}>
              {isLoading ? 'جاري الإضافة...' : 'إضافة العضو'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrgMembersPage;
