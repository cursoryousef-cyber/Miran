import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/rbac';
import {
  Building2, Plus, Search, Filter, CheckCircle2, AlertCircle, Archive, Clock, RefreshCw, Edit, Trash2, Eye
} from 'lucide-react';
import {
  Button, TextField, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip
} from '@mui/material';

export const Organizations: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [tabValue, setTabValue] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            إدارة الجهات والتجمعات الصحية
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            CRUD كامل موصل بالـ Backend بضوابط RBAC و Pagination حقيقي
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={() => refetch()} style={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>

          {canCreate && (
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => { resetForm(); setOpenCreate(true); }}
              style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
            >
              إضافة جهة جديدة
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar & Lifecycle Tabs */}
      <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="البحث باسم الجهة أو الرمز أو المدينة..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '320px' }}
            InputProps={{
              startAdornment: <Search size={18} color="#94a3b8" style={{ marginLeft: '8px' }} />,
            }}
          />

          <Tabs
            value={tabValue}
            onChange={(_, val) => setTabValue(val)}
            textColor="primary"
            indicatorColor="primary"
            style={{ marginRight: 'auto' }}
          >
            <Tab label="جميع الجهات" value="all" />
            <Tab label="نشط (Active)" value="active" />
            <Tab label="مسودة (Draft)" value="draft" />
            <Tab label="معلق (Suspended)" value="suspended" />
            <Tab label="مؤرشف (Archived)" value="archived" />
          </Tabs>
        </div>
      </div>

      {/* Organizations Table */}
      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم الجهة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرمز (Code)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>نوع الجهة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المدينة/المنطقة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>حالة دورة الحياة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>العدد (المتدربون / الأقسام)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>العمليات (RBAC)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} style={{ textAlign: 'center', color: '#cbd5e1' }}>جاري التحميل من Production Backend...</TableCell></TableRow>
            ) : data?.data?.length === 0 ? (
              <TableRow><TableCell colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>لا توجد جهات مطابقة لشروط البحث.</TableCell></TableRow>
            ) : (
              data?.data?.map((org: any) => (
                <TableRow key={org.id} hover>
                  <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(5, 150, 105, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Building2 size={16} color="#10b981" />
                      </div>
                      <div>
                        <div>{org.nameAr}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{org.nameEn}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell style={{ fontFamily: 'monospace', fontWeight: 700, color: '#06b6d4' }}>{org.code}</TableCell>
                  <TableCell><Chip label={org.organizationType?.nameAr || 'جهة'} size="small" variant="outlined" /></TableCell>
                  <TableCell style={{ color: '#cbd5e1' }}>{org.cityAr ? `${org.cityAr} (${org.regionAr || ''})` : '—'}</TableCell>
                  <TableCell>{getStatusChip(org.status)}</TableCell>
                  <TableCell style={{ color: '#94a3b8', fontSize: '13px' }}>
                    {org._count?.traineeProfiles || 0} متدرب / {org._count?.departments || 0} أقسام
                  </TableCell>
                  <TableCell style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small" onClick={() => setOpenDetails(org)} style={{ color: '#3b82f6' }}>
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>

                      {canUpdate && (
                        <Tooltip title="تعديل الجهة">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setOpenEdit(org);
                              setFormData({
                                code: org.code,
                                nameAr: org.nameAr,
                                nameEn: org.nameEn || '',
                                organizationTypeId: org.organizationTypeId || '',
                                cityAr: org.cityAr || 'عرعر',
                                regionAr: org.regionAr || 'الحدود الشمالية',
                                status: org.status || 'active',
                              });
                            }}
                            style={{ color: '#f59e0b' }}
                          >
                            <Edit size={16} />
                          </IconButton>
                        </Tooltip>
                      )}

                      {canDelete && (
                        <Tooltip title="حذف الجهة">
                          <IconButton size="small" onClick={() => setDeleteId(org.id)} style={{ color: '#ef4444' }}>
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
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="عدد الصفوف:"
        />
      </TableContainer>

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
