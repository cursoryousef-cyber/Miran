import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, DataPageShell, CardGrid, EmptyState, EntityCard, ViewToggle } from '../components/ui';
import { Shield, Plus, Lock, Key, CheckCircle, Edit, Trash2, UserCog, Layers } from 'lucide-react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Alert,
} from '@mui/material';
import { apiClient } from '../api/client';

export const RolesManagement: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: rolesData, refetch: refetchRoles, isLoading: isLoadingRoles, isError: isErrorRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles-permissions/roles');
      return res.data;
    },
  });

  const { data: permsData, isLoading: isLoadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await apiClient.get('/roles-permissions/permissions');
      return res.data;
    },
  });

  const handleCreateRole = async () => {
    try {
      await apiClient.post('/roles-permissions/roles', {
        code: newRoleCode,
        nameAr: newRoleName,
        permissions: selectedPermissions,
      });
      setOpenModal(false);
      setNewRoleCode('');
      setNewRoleName('');
      setSelectedPermissions([]);
      refetchRoles();
    } catch (err) {
      console.error('Failed to create role', err);
    }
  };

  const togglePermission = (code: string) => {
    if (selectedPermissions.includes(code)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== code));
    } else {
      setSelectedPermissions([...selectedPermissions, code]);
    }
  };

  const roles: any[] = rolesData?.data ?? [];
  const perms: any[] = permsData?.data ?? [];
  const systemRoles = roles.filter((r: any) => r.isSystem).length;
  const customRoles = roles.length - systemRoles;
  const permGroups = new Set(perms.map((p: any) => p.resource ?? p.category).filter(Boolean)).size;

  return (
    <DataPageShell
        title="🔑 إدارة الأدوار والصلاحيات الديناميكية (Dynamic RBAC Engine)"
        subtitle="تخصيص الأدوار، ربط الصلاحيات، وإدارة مستويات الوصول التشغيلية والسحابية بكل مرونة"
        actions={<>
          <ViewToggle value={view} onChange={setView} />

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setOpenModal(true)}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
        >
          إنشاء دور جديد (Custom Role)
        </Button>
        </>}
        loading={isLoadingRoles}
        stats={[
          { label: 'الأدوار', value: roles.length, icon: Key, tone: 'primary' },
          { label: 'أدوار النظام', value: systemRoles, icon: Shield, tone: 'info' },
          { label: 'أدوار مخصصة', value: customRoles, icon: UserCog, tone: 'violet' },
          { label: 'الصلاحيات', value: perms.length, icon: Lock, tone: 'neutral' },
          { label: 'مجموعات الصلاحيات', value: permGroups, icon: Layers, tone: 'success' },
        ]}
    >

      {(isLoadingRoles || isLoadingPerms) && <LinearProgress sx={{ borderRadius: 1 }} />}
      {isErrorRoles && <Alert severity="error">تعذر تحميل الأدوار من الخادم</Alert>}

      {/* Roles Table */}
      {view === 'cards' ? (
        (roles).length === 0 ? (
          <div className="glass-card"><EmptyState icon={Key} title="لا توجد أدوار" /></div>
        ) : (
          <CardGrid>
            {roles.map((r: any) => (
              <EntityCard
                key={r.id}
                icon={Key}
                tone={r.isSystem ? 'info' : 'violet'}
                title={r.nameAr ?? r.code}
                subtitle={r.code}
                badges={[
                  { label: r.isSystem ? 'دور نظام' : 'دور مخصص', tone: r.isSystem ? 'info' : 'violet' },
                  ...(r.scope ? [{ label: r.scope, tone: 'neutral' as const }] : []),
                ]}
                metrics={[{ label: 'الصلاحيات', value: r.permissions?.length ?? r._count?.permissions ?? 0, tone: 'primary' }]}
              />
            ))}
          </CardGrid>
        )
      ) : (
      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>اسم الدور (Role Name)</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الرمز التمييزي (Code)</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>المستوى الهيكلي</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الصلاحيات المرتبطة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>عدد المستخدمين</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rolesData?.data?.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>
                  {r.nameAr}
                  {r.isSystem && <Chip label="دور سيادي" size="small" color="success" variant="outlined" style={{ marginRight: '8px' }} />}
                </TableCell>
                <TableCell style={{ fontFamily: 'monospace', color: '#0891B2' }}>{r.code}</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#D97706' }}>المستوى {r.hierarchyLevel}</TableCell>
                <TableCell style={{ maxWidth: '300px' }}>
                  <Chip label={`${r.rolePermissions?.length || 0} صلاحيات مفعلة`} size="small" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#059669', fontWeight: 700 }} />
                </TableCell>
                <TableCell style={{ fontWeight: 700 }}>{r._count?.userRoles || 0} مستخدمين</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* Create Role Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ backgroundColor: '#FFFFFF', color: '#0F172A', fontWeight: 800, borderBottom: '1px solid #E2E8F0' }}>
          إنشاء دور جديد وتخصيص الصلاحيات
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '20px' }}>
          <TextField
            label="رمز الدور (Code e.g. custom_supervisor)"
            variant="outlined"
            size="small"
            fullWidth
            value={newRoleCode}
            onChange={(e) => setNewRoleCode(e.target.value)}
          />
          <TextField
            label="اسم الدور بالعربية (e.g. مشرف تدريب ميداني)"
            variant="outlined"
            size="small"
            fullWidth
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />

          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>اختيار الصلاحيات المرتبطة:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {permsData?.data?.map((p: any) => (
                <FormControlLabel
                  key={p.code}
                  control={
                    <Checkbox
                      checked={selectedPermissions.includes(p.code)}
                      onChange={() => togglePermission(p.code)}
                      style={{ color: '#0F766E' }}
                    />
                  }
                  label={`${p.nameAr} (${p.code})`}
                  sx={{ color: '#0F172A' }}
                />
              ))}
            </div>
          </div>
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#FFFFFF', padding: '16px 24px', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => setOpenModal(false)} style={{ color: '#64748B' }}>إلغاء</Button>
          <Button onClick={handleCreateRole} variant="contained" style={{ background: '#0F766E', fontWeight: 700, borderRadius: '10px' }}>
            حفظ الدور
          </Button>
        </DialogActions>
      </Dialog>
    </DataPageShell>
  );
};

export default RolesManagement;
