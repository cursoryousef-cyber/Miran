import { UsersRound, CheckCircle2, UserCog, GraduationCap, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataPageShell } from '../components/ui';
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
    >
        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.15)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginTop: '12px' }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.15)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', marginTop: '12px' }}>
            {successMsg}
          </div>
        )}

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Role Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {roleFilterOptions.map((opt) => (
            <button key={opt.value} onClick={() => setFilterRole(opt.value)} style={{
              padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '13px', transition: 'all 0.2s',
              background: filterRole === opt.value ? 'linear-gradient(135deg,#059669,#0891B2)' : '#F1F5F9',
              color: filterRole === opt.value ? '#fff' : '#94a3b8',
              boxShadow: filterRole === opt.value ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
            }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="بحث بالاسم أو الهوية أو البريد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '240px', padding: '10px 16px',
            background: '#F1F5F9', border: '1px solid #E2E8F0',
            borderRadius: '10px', color: '#0F172A', fontSize: '14px', outline: 'none',
          }}
        />

        {/* Add Button */}
        <button onClick={() => setShowAddModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px',
          background: 'linear-gradient(135deg,#059669,#0891B2)', border: 'none',
          borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px',
          cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.4)',
        }}>
          <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          إضافة عضو جديد
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الأعضاء', count: members.length, color: '#059669' },
          { label: 'مدراء', count: members.filter(m => m.roles.some(r => r.code === 'org_manager')).length, color: '#059669' },
          { label: 'مشرفون', count: members.filter(m => m.roles.some(r => r.code === 'academic_supervisor')).length, color: '#6D28D9' },
          { label: 'مدربون', count: members.filter(m => m.roles.some(r => r.code === 'trainer')).length, color: '#0E7490' },
          { label: 'متدربون', count: members.filter(m => m.roles.some(r => r.code === 'trainee')).length, color: '#2563EB' },
        ].map((stat) => (
          <div key={stat.label} style={{
            flex: 1, minWidth: '120px', padding: '16px', textAlign: 'center',
            background: '#F8FAFC', borderRadius: '12px',
            border: `1px solid ${stat.color}30`,
          }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: stat.color }}>{stat.count}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#059669' }}>
          <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ جاري التحميل...</div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <div style={{ fontSize: '18px' }}>لا يوجد أعضاء</div>
        </div>
      ) : (
        <div style={{ background: 'rgba(15,23,42,0.7)', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                {['الاسم', 'البريد الإلكتروني', 'الهوية', 'الأدوار', 'الحالة', 'الإجراءات'].map((h) => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, idx) => (
                <tr key={member.id} style={{
                  borderBottom: idx < filteredMembers.length - 1 ? '1px solid #F1F5F9' : 'none',
                  transition: 'background 0.15s',
                }}>
                  {/* Name */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'linear-gradient(135deg,rgba(5,150,105,0.3),rgba(6,182,212,0.3))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: 700, color: '#059669',
                      }}>
                        {(member.nameAr || member.email)[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>
                          {member.nameAr || '—'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{member.username}</div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td style={{ padding: '16px 20px', color: '#64748B', fontSize: '14px' }}>{member.email}</td>

                  {/* National ID */}
                  <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px', fontFamily: 'monospace' }}>
                    {member.nationalId || '—'}
                  </td>

                  {/* Roles */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {member.roles.length === 0 ? (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>بدون دور</span>
                      ) : member.roles.map((role) => {
                        const c = getRoleColor(role.code);
                        return (
                          <span key={role.id} style={{
                            padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                            background: c.bg, color: c.text,
                          }}>
                            {ROLE_LABELS[role.code] || role.nameAr}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      background: member.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: member.isActive ? '#059669' : '#DC2626',
                    }}>
                      {member.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setEditMember(member)} style={{
                        padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.3)',
                        background: 'rgba(6,182,212,0.1)', color: '#0E7490', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                      }}>
                        تعديل
                      </button>

                      {member.isActive ? (
                        <button onClick={() => handleDeactivate(member.id)} style={{
                          padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.1)', color: '#DC2626', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                        }}>
                          تعطيل
                        </button>
                      ) : (
                        <button onClick={() => handleActivate(member.id)} style={{
                          padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)',
                          background: 'rgba(16,185,129,0.1)', color: '#059669', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                        }}>
                          تفعيل
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
