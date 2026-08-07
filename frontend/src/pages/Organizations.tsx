import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/rbac';
import {
  Building2, Plus, Search, CheckCircle2, AlertCircle, Archive, Clock, RefreshCw, Edit, Trash2, Eye,
  LayoutGrid, List, BedDouble, Users, Gauge,
} from 'lucide-react';
import {
  Button, TextField, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip, Skeleton
} from '@mui/material';
import {
  EmptyState, KpiCard, KpiGrid, Metric, MetricRow, PageHeader, StatBar, Surface,
  colour, radius, space,
} from '../components/ui';

export const Organizations: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [tabValue, setTabValue] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  // Modal States
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<any>(null);
  const [openDetails, setOpenDetails] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    nameAr: '',
    nameEn: '',
    organizationTypeId: '',
    cityAr: 'عرعر',
    regionAr: 'الحدود الشمالية',
    status: 'active',
  });

  const canCreate = hasPermission(user, 'create', 'organizations');
  const canUpdate = hasPermission(user, 'update', 'organizations');
  const canDelete = hasPermission(user, 'delete', 'organizations');

  // Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['organizations', search, tabValue, page, rowsPerPage],
    queryFn: async () => {
      const res = await apiClient.get('/organizations', {
        params: {
          search: search || undefined,
          status: tabValue !== 'all' ? tabValue : undefined,
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      return res.data;
    },
  });

  // Query Org Types
  const { data: orgTypes } = useQuery({
    queryKey: ['organization-types'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations/types');
      return res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/organizations', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setOpenCreate(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.patch(`/organizations/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setOpenEdit(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/organizations/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setDeleteId(null);
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      nameAr: '',
      nameEn: '',
      organizationTypeId: '',
      cityAr: 'عرعر',
      regionAr: 'الحدود الشمالية',
      status: 'active',
    });
  };

  const handleSaveCreate = () => {
    createMutation.mutate(formData);
  };

  const handleSaveUpdate = () => {
    if (!openEdit) return;
    updateMutation.mutate({ id: openEdit.id, payload: formData });
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active':
        return <Chip icon={<CheckCircle2 size={14} />} label="نشط" color="success" size="small" />;
      case 'draft':
        return <Chip icon={<Clock size={14} />} label="مسودة" color="warning" size="small" />;
      case 'suspended':
        return <Chip icon={<AlertCircle size={14} />} label="معلق" color="error" size="small" />;
      case 'archived':
        return <Chip icon={<Archive size={14} />} label="مؤرشف" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const rows = data?.data ?? [];
  const summary = rows.reduce(
    (acc: any, o: any) => {
      const capacity = o.capacity || 0;
      const accepted = o._count?.traineeProfiles || 0;
      acc.capacity += capacity;
      acc.accepted += accepted;
      if (o.status === 'active') acc.active += 1;
      if (capacity > 0 && accepted / capacity >= 0.8) acc.pressured += 1;
      return acc;
    },
    { capacity: 0, accepted: 0, active: 0, pressured: 0 },
  );
  const occupancyPct = summary.capacity > 0 ? Math.round((summary.accepted / summary.capacity) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'] }}>
      <PageHeader
        eyebrow="ORGANISATION DIRECTORY"
        icon={Building2}
        title="الجهات والتجمعات الصحية"
        subtitle="استعراض الجهات وسعتها ونسب إشغالها قبل الدخول إلى التفاصيل"
        actions={
          <>
            <Tooltip title="تحديث البيانات">
              <IconButton onClick={() => refetch()} sx={{ border: `1px solid ${colour.border}`, borderRadius: 2 }}>
                <RefreshCw size={17} color={colour.primary} />
              </IconButton>
            </Tooltip>
            <div style={{ display: 'inline-flex', border: `1px solid ${colour.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {([['cards', 'بطاقات', LayoutGrid], ['table', 'جدول', List]] as const).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5,
                    background: view === mode ? colour.primarySoft : colour.surface,
                    color: view === mode ? colour.primary : colour.muted,
                  }}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
            {canCreate && (
              <Button variant="contained" startIcon={<Plus size={17} />}
                onClick={() => { resetForm(); setOpenCreate(true); }}>
                إضافة جهة
              </Button>
            )}
          </>
        }
      />

      {/* Summary before detail — the page opens on numbers, not a grid of rows. */}
      <KpiGrid>
        <KpiCard label="الجهات المعروضة" value={data?.meta?.total ?? rows.length} icon={Building2} tone="primary" loading={isLoading} />
        <KpiCard label="جهات نشطة" value={summary.active} icon={CheckCircle2} tone="success" loading={isLoading} />
        <KpiCard label="السعة الإجمالية" value={summary.capacity} icon={BedDouble} tone="info" loading={isLoading} />
        <KpiCard label="المتدربون" value={summary.accepted} icon={Users} tone="violet" loading={isLoading} />
        <KpiCard label="نسبة الإشغال" value={`${occupancyPct}%`} icon={Gauge}
          tone={occupancyPct >= 90 ? 'danger' : occupancyPct >= 70 ? 'warning' : 'success'} loading={isLoading} />
        <KpiCard label="جهات تحت ضغط" value={summary.pressured} icon={AlertCircle}
          tone={summary.pressured ? 'warning' : 'success'} hint="إشغال 80% فأكثر" loading={isLoading} />
      </KpiGrid>

      <div className="glass-card" style={{ padding: `${space.lg}px ${space['2xl']}px`, display: 'flex', gap: space.lg, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="بحث بالاسم أو الرمز أو المدينة..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280, flex: '0 1 320px' }}
          InputProps={{ startAdornment: <Search size={17} color={colour.faint} style={{ marginLeft: 8 }} /> }}
        />
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)} variant="scrollable" scrollButtons="auto"
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontSize: 12.5, fontWeight: 700 } }}>
          <Tab label="الكل" value="all" />
          <Tab label="نشط" value="active" />
          <Tab label="مسودة" value="draft" />
          <Tab label="معلق" value="suspended" />
          <Tab label="مؤرشف" value="archived" />
        </Tabs>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gap: space.xl, gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))' }}>
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rounded" height={190} />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card" style={{ padding: 0 }}>
          <EmptyState icon={Building2} title="لا توجد جهات مطابقة" hint="جرّب تغيير كلمة البحث أو الحالة." />
        </div>
      ) : view === 'cards' ? (
        <div style={{ display: 'grid', gap: space.xl, gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', alignItems: 'stretch' }}>
          {rows.map((org: any) => {
            const capacity = org.capacity || 0;
            const accepted = org._count?.traineeProfiles || 0;
            const remaining = Math.max(0, capacity - accepted);
            return (
              <Surface key={org.id} padding={space.xl}>
                <div style={{ display: 'flex', gap: space.md, alignItems: 'flex-start', marginBottom: space.lg }}>
                  <div style={{ width: 40, height: 40, borderRadius: radius.md, background: colour.primarySoft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Building2 size={19} color={colour.primary} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: colour.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {org.nameAr}
                    </div>
                    <div style={{ fontSize: 11.5, color: colour.faint, marginTop: 2 }}>
                      {org.code} · {org.cityAr || '—'}
                    </div>
                  </div>
                  {getStatusChip(org.status)}
                </div>

                <StatBar label="الإشغال" value={accepted} max={capacity || 1} />

                <MetricRow min={84}>
                  <Metric label="السعة" value={capacity} tone="info" />
                  <Metric label="مقبولون" value={accepted} tone="success" />
                  <Metric label="متاح" value={remaining} tone={remaining === 0 ? 'danger' : 'neutral'} />
                </MetricRow>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginTop: 'auto', paddingTop: space.lg }}>
                  <span style={{ fontSize: 11.5, color: colour.muted }}>
                    {org._count?.trainerProfiles || 0} مدرب · {org._count?.departments || 0} قسم
                  </span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <Tooltip title="عرض التفاصيل">
                      <IconButton size="small" onClick={() => setOpenDetails(org)} sx={{ color: colour.info }}>
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                    {canUpdate && (
                      <Tooltip title="تعديل">
                        <IconButton size="small" sx={{ color: colour.warning }}
                          onClick={() => {
                            setOpenEdit(org);
                            setFormData({
                              code: org.code, nameAr: org.nameAr, nameEn: org.nameEn || '',
                              organizationTypeId: org.organizationTypeId || '',
                              cityAr: org.cityAr || 'عرعر', regionAr: org.regionAr || 'الحدود الشمالية',
                              status: org.status || 'active',
                            });
                          }}>
                          <Edit size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title="حذف">
                        <IconButton size="small" onClick={() => setDeleteId(org.id)} sx={{ color: colour.danger }}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      ) : (
        <div className="glass-card table-scroll">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: colour.canvas }}>
                {['الجهة', 'الرمز', 'المدينة', 'السعة', 'مقبولون', 'متاح', 'الإشغال', 'الحالة', ''].map((h) => (
                  <TableCell key={h} sx={{ color: colour.muted, fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((org: any) => {
                const capacity = org.capacity || 0;
                const accepted = org._count?.traineeProfiles || 0;
                const remaining = Math.max(0, capacity - accepted);
                const occupancy = capacity > 0 ? Math.min(100, Math.round((accepted / capacity) * 100)) : 0;
                return (
                  <TableRow key={org.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: colour.text, whiteSpace: 'nowrap' }}>{org.nameAr}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: colour.primary, fontWeight: 700 }}>{org.code}</TableCell>
                    <TableCell sx={{ color: colour.muted }}>{org.cityAr || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: colour.text }}>{capacity}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: colour.success }}>{accepted}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: remaining === 0 ? colour.danger : colour.muted }}>{remaining}</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: colour.subtle, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${occupancy}%`, height: '100%', background: occupancy >= 90 ? colour.danger : occupancy >= 70 ? colour.warning : colour.success }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: colour.text }}>{occupancy}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusChip(org.status)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton size="small" onClick={() => setOpenDetails(org)} sx={{ color: colour.info }}><Eye size={15} /></IconButton>
                      {canUpdate && (
                        <IconButton size="small" sx={{ color: colour.warning }}
                          onClick={() => {
                            setOpenEdit(org);
                            setFormData({
                              code: org.code, nameAr: org.nameAr, nameEn: org.nameEn || '',
                              organizationTypeId: org.organizationTypeId || '',
                              cityAr: org.cityAr || 'عرعر', regionAr: org.regionAr || 'الحدود الشمالية',
                              status: org.status || 'active',
                            });
                          }}><Edit size={15} /></IconButton>
                      )}
                      {canDelete && (
                        <IconButton size="small" onClick={() => setDeleteId(org.id)} sx={{ color: colour.danger }}><Trash2 size={15} /></IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TablePagination
        component="div"
        count={data?.meta?.total || 0}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[6, 12, 24, 48]}
        labelRowsPerPage="عدد العناصر:"
      />

      {/* Dialog: Create Org */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة جهة / تجمع صحي جديد</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <TextField label="رمز الجهة (Code)" fullWidth value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          <TextField label="الاسم بالعربية" fullWidth value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
          <TextField label="الاسم بالإنجليزية" fullWidth value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} />
          <FormControl fullWidth>
            <InputLabel>نوع الجهة</InputLabel>
            <Select value={formData.organizationTypeId} onChange={(e) => setFormData({ ...formData, organizationTypeId: e.target.value })}>
              {orgTypes?.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.nameAr}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="المدينة" fullWidth value={formData.cityAr} onChange={(e) => setFormData({ ...formData, cityAr: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>إلغاء</Button>
          <Button variant="contained" color="primary" onClick={handleSaveCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'جاري الحفظ...' : 'إنشاء الجهة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Edit Org */}
      <Dialog open={!!openEdit} onClose={() => setOpenEdit(null)} maxWidth="sm" fullWidth>
        <DialogTitle>تعديل بيانات الجهة</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <TextField label="الاسم بالعربية" fullWidth value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
          <TextField label="الاسم بالإنجليزية" fullWidth value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} />
          <FormControl fullWidth>
            <InputLabel>حالة دورة الحياة</InputLabel>
            <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <MenuItem value="active">نشط (Active)</MenuItem>
              <MenuItem value="draft">مسودة (Draft)</MenuItem>
              <MenuItem value="suspended">معلق (Suspended)</MenuItem>
              <MenuItem value="archived">مؤرشف (Archived)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(null)}>إلغاء</Button>
          <Button variant="contained" color="primary" onClick={handleSaveUpdate} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'جاري التحديث...' : 'تحديث البيانات'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Details */}
      <Dialog open={!!openDetails} onClose={() => setOpenDetails(null)} maxWidth="sm" fullWidth>
        <DialogTitle>تفاصيل الجهة المؤسسية</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
          <div><strong>اسم الجهة:</strong> {openDetails?.nameAr} ({openDetails?.nameEn})</div>
          <div><strong>الرمز:</strong> {openDetails?.code}</div>
          <div><strong>المدينة والمنطقة:</strong> {openDetails?.cityAr} - {openDetails?.regionAr}</div>
          <div><strong>الحالة:</strong> {openDetails?.status}</div>
          <div><strong>عدد المتدربين:</strong> {openDetails?._count?.traineeProfiles || 0}</div>
          <div><strong>عدد الأقسام السريرية:</strong> {openDetails?._count?.departments || 0}</div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetails(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>تأكيد حذف الجهة</DialogTitle>
        <DialogContent>هل أنت تأكد من رغبتك في حذف هذه الجهة؟ هذا الإجراء سيمسح السجلات المرتبطة بها.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
            تأكيد الحذف
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
