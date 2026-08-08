import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CardGrid, DataPageShell, EmptyState, EntityCard, MobileFab, ViewToggle } from '../components/ui';
import { Users as UsersIcon, MailCheck, KeyRound, UserPlus2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/rbac';
import {
  Users, Plus, Search, Filter, RefreshCw, Edit, Trash2, Eye, ShieldCheck, Mail, Phone, Lock
} from 'lucide-react';
import {
  Button, TextField, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';

export const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  // Modals
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<any>(null);
  const [openDetails, setOpenDetails] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nationalId: '',
    nameAr: '',
    nameEn: '',
    email: '',
    phone: '',
    password: 'Miran@Admin2024!',
    roleCode: 'trainee',
  });

  const canCreate = hasPermission(user, 'create', 'users');
  const canUpdate = hasPermission(user, 'update', 'users');
  const canDelete = hasPermission(user, 'delete', 'users');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['persons', search, page, rowsPerPage],
    queryFn: async () => {
      const res = await apiClient.get('/user-accounts', {
        params: {
          search: search || undefined,
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/user-accounts', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      setOpenCreate(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.patch(`/user-accounts/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      setOpenEdit(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/user-accounts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      setDeleteId(null);
    },
  });

  const resetForm = () => {
    setFormData({
      nationalId: '',
      nameAr: '',
      nameEn: '',
      email: '',
      phone: '',
      password: 'Miran@Admin2024!',
      roleCode: 'trainee',
    });
  };

  const accounts = data?.data ?? [];
  const activeCount = accounts.filter((u: any) => u.isActive !== false && u.status !== 'suspended').length;
  const verified = accounts.filter((u: any) => u.isEmailVerified).length;
  const withMfa = accounts.filter((u: any) => u.mfaEnabled).length;
  const neverLoggedIn = accounts.filter((u: any) => !u.lastLoginAt).length;

  return (
    <DataPageShell
      icon={UsersIcon}
      title="المستخدمون والحسابات"
      subtitle="إدارة حسابات المنصة وأدوارها وفق ضوابط الصلاحيات"
      loading={isLoading}
      stats={[
        { label: 'إجمالي الحسابات', value: data?.meta?.total ?? accounts.length, icon: UsersIcon, tone: 'primary' },
        { label: 'حسابات نشطة', value: activeCount, icon: ShieldCheck, tone: 'success' },
        { label: 'بريد موثّق', value: verified, icon: MailCheck, tone: 'info' },
        { label: 'مفعّل التحقق الثنائي', value: withMfa, icon: KeyRound, tone: 'violet' },
        { label: 'لم يسجّل دخول بعد', value: neverLoggedIn, icon: UserPlus2,
          tone: neverLoggedIn ? 'warning' : 'success' },
      ]}
      actions={
        <>
          <ViewToggle value={view} onChange={setView} />
          <Tooltip title="تحديث السجلات">
            <IconButton onClick={() => refetch()} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <RefreshCw size={17} color="#0F766E" />
            </IconButton>
          </Tooltip>
          {canCreate && (
            <Button variant="contained" startIcon={<Plus size={17} />}
              onClick={() => { resetForm(); setOpenCreate(true); }}>
              إضافة مستخدم
            </Button>
          )}
        </>
      }
    >

      <div className="glass-card" style={{ padding: '16px 24px' }}>
        <TextField
          placeholder="البحث باسم المستخدم أو البريد الإلكتروني أو الهوية الوطنية..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '400px' }}
          InputProps={{
            startAdornment: <Search size={18} color="#94a3b8" style={{ marginLeft: '8px' }} />,
          }}
        />
      </div>

      {view === 'cards' ? (
        accounts.length === 0 ? (
          <div className="glass-card"><EmptyState icon={UsersIcon} title="لا توجد حسابات مطابقة" hint="جرّب تغيير كلمة البحث." /></div>
        ) : (
          <CardGrid>
            {accounts.map((u: any) => (
              <EntityCard
                key={u.id}
                avatarText={(u.person?.nameAr ?? u.email ?? '?').trim().slice(0, 2)}
                tone={u.isActive === false ? 'neutral' : 'primary'}
                title={u.person?.nameAr || u.email}
                subtitle={u.email}
                badges={[
                  { label: u.isActive === false ? 'معلّق' : 'نشط', tone: u.isActive === false ? 'danger' : 'success' },
                  ...(u.isEmailVerified ? [{ label: 'بريد موثّق', tone: 'info' as const }] : []),
                  ...(u.mfaEnabled ? [{ label: '2FA', tone: 'violet' as const }] : []),
                  ...(u.roles ?? []).map((r: any) => ({ label: r.role?.nameAr || r.role?.code || String(r), tone: 'neutral' as const })),
                ]}
                footnote={u.person?.nationalId ? `هوية ${u.person.nationalId}` : (u.lastLoginAt ? `آخر دخول ${String(u.lastLoginAt).slice(0, 10)}` : 'لم يسجّل دخول بعد')}
                actions={[
                  { label: 'عرض التفاصيل', icon: Eye, onClick: () => setOpenDetails(u), tone: 'info' },
                  { label: 'تعديل', icon: Edit, tone: 'warning', visible: canUpdate,
                    onClick: () => {
                      setOpenEdit(u);
                      setFormData({
                        nationalId: u.person?.nationalId || '', nameAr: u.person?.nameAr || '',
                        nameEn: u.person?.nameEn || '', email: u.email || '',
                        phone: u.person?.phone || '', password: '',
                        roleCode: u.roles?.[0]?.role?.code || 'trainee',
                      });
                    } },
                  { label: 'حذف', icon: Trash2, onClick: () => setDeleteId(u.id), tone: 'danger', visible: canDelete },
                ]}
              />
            ))}
          </CardGrid>
        )
      ) : (
      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow style={{ backgroundColor: '#F8FAFC' }}>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>اسم المستخدم</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الهوية الوطنية</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>البريد الإلكتروني</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الأدوار النشطة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحالة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700, textAlign: 'center' }}>العمليات (RBAC)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} style={{ textAlign: 'center', color: '#475569' }}>جاري التحميل...</TableCell></TableRow>
            ) : data?.data?.length === 0 ? (
              <TableRow><TableCell colSpan={6} style={{ textAlign: 'center', color: '#64748B' }}>لا توجد حسابات مطابقة.</TableCell></TableRow>
            ) : (
              data?.data?.map((u: any) => (
                <TableRow key={u.id} hover>
                  <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>
                    {u.person?.nameAr || u.email}
                    {u.person?.nameEn && <div style={{ fontSize: '11px', color: '#64748b' }}>{u.person.nameEn}</div>}
                  </TableCell>
                  <TableCell style={{ fontFamily: 'monospace' }}>{u.person?.nationalId || '—'}</TableCell>
                  <TableCell style={{ color: '#0891B2' }}>{u.email}</TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {u.roles?.map((r: any, idx: number) => (
                        <Chip key={idx} label={r.role?.nameAr || r} size="small" color="primary" variant="outlined" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><Chip label={u.isActive ? "نشط" : "معلق"} color={u.isActive ? "success" : "error"} size="small" /></TableCell>
                  <TableCell style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small" onClick={() => setOpenDetails(u)} style={{ color: '#2563EB' }}>
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>

                      {canUpdate && (
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setOpenEdit(u);
                              setFormData({
                                nationalId: u.person?.nationalId || '',
                                nameAr: u.person?.nameAr || '',
                                nameEn: u.person?.nameEn || '',
                                email: u.email || '',
                                phone: u.person?.phone || '',
                                password: '',
                                roleCode: u.roles?.[0]?.role?.code || 'trainee',
                              });
                            }}
                            style={{ color: '#D97706' }}
                          >
                            <Edit size={16} />
                          </IconButton>
                        </Tooltip>
                      )}

                      {canDelete && (
                        <Tooltip title="حذف">
                          <IconButton size="small" onClick={() => setDeleteId(u.id)} style={{ color: '#DC2626' }}>
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

      <TablePagination
        component="div"
        count={data?.meta?.total || 0}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="عدد الصفوف:"
        />
      </TableContainer>
      )}

      {/* Dialog: Create */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة مستخدم وحساب دخول جديد</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <TextField label="الهوية الوطنية (10 أرقام)" fullWidth value={formData.nationalId} onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} />
          <TextField label="الاسم بالعربية" fullWidth value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
          <TextField label="الاسم بالإنجليزية" fullWidth value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} />
          <TextField label="البريد الإلكتروني" type="email" fullWidth value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <TextField label="كلمة المرور الإبتدائية" type="password" fullWidth value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          <FormControl fullWidth>
            <InputLabel>الدور القيادي / التدريبي (RBAC Role)</InputLabel>
            <Select value={formData.roleCode} onChange={(e) => setFormData({ ...formData, roleCode: e.target.value })}>
              <MenuItem value="platform_owner">مدير المنصة الوطنية (Platform Owner)</MenuItem>
              <MenuItem value="system_admin">مدير النظام التنفيذي (System Admin)</MenuItem>
              <MenuItem value="org_manager">مدير الجهة / المستشفى / الجامعة (Org Manager)</MenuItem>
              <MenuItem value="academic_supervisor">مشرف الامتياز والأكاديمي (Academic Supervisor)</MenuItem>
              <MenuItem value="training_supervisor">مشرف التدريب الميداني (Training Supervisor)</MenuItem>
              <MenuItem value="trainer">استشاري ومدرب سريري (Trainer)</MenuItem>
              <MenuItem value="trainee">طبيب امتياز / متدرب (Trainee)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>إلغاء</Button>
          <Button variant="contained" color="primary" onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'جاري الإنشاء...' : 'حفظ ونشر الحساب'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Edit */}
      <Dialog open={!!openEdit} onClose={() => setOpenEdit(null)} maxWidth="sm" fullWidth>
        <DialogTitle>تعديل بيانات الحساب والصلاحيات</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <TextField label="الاسم بالعربية" fullWidth value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
          <TextField label="البريد الإلكتروني" type="email" fullWidth value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(null)}>إلغاء</Button>
          <Button variant="contained" color="primary" onClick={() => openEdit && updateMutation.mutate({ id: openEdit.id, payload: formData })}>
            تحديث الحساب
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Details */}
      <Dialog open={!!openDetails} onClose={() => setOpenDetails(null)}>
        <DialogTitle>تفاصيل المستخدم الكاملة</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px' }}>
          <div><strong>الاسم:</strong> {openDetails?.person?.nameAr} ({openDetails?.person?.nameEn || '—'})</div>
          <div><strong>البريد:</strong> {openDetails?.email}</div>
          <div><strong>الهوية الوطنية:</strong> {openDetails?.person?.nationalId || '—'}</div>
          <div><strong>الحالة:</strong> {openDetails?.isActive ? "نشط" : "معلق"}</div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetails(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Delete */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>تأكيد حذف الحساب</DialogTitle>
        <DialogContent>هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً؟</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
            تأكيد الحذف
          </Button>
        </DialogActions>
      </Dialog>
      {canCreate && (
        <MobileFab label="إضافة مستخدم" icon={Plus} onClick={() => { resetForm(); setOpenCreate(true); }} />
      )}

    </DataPageShell>
  );
};
