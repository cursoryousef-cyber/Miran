import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, Download, Filter, Eye, RefreshCw } from 'lucide-react';
import {
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { apiClient } from '../api/client';

export const AuditLogs: React.FC = () => {
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', search, entityType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (entityType) params.append('entityType', entityType);
      const res = await apiClient.get(`/audit-logs?${params.toString()}`);
      return res.data;
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            🛡️ سجلات التدقيق والمراقبة الأمنية (Audit Logs & Compliance)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            تتبع غير قابل للتغيير لكل عملية تمت في النظام (المستخدم، الوقت، IP، الجهاز، البيانات السابقة والحالية)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            style={{ borderColor: '#06b6d4', color: '#06b6d4', fontWeight: 700 }}
          >
            تصدير السجل (Excel / PDF)
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshCw size={18} />}
            onClick={() => refetch()}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
          >
            تحديث السجلات
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <TextField
          placeholder="بحث في اسم العملية، الكيان، أو عنوان IP..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '360px' }}
          InputProps={{
            startAdornment: <Search size={18} color="#94a3b8" style={{ marginLeft: '8px' }} />,
          }}
        />

        <FormControl size="small" style={{ minWidth: '180px' }}>
          <InputLabel id="entity-filter-label">تصفية حسب الكيان</InputLabel>
          <Select
            labelId="entity-filter-label"
            value={entityType}
            label="تصفية حسب الكيان"
            onChange={(e) => setEntityType(e.target.value)}
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="Organization">الجهات (Organization)</MenuItem>
            <MenuItem value="TraineeProfile">المتدربون (Trainee)</MenuItem>
            <MenuItem value="TrainerCall">النداءات (Calls)</MenuItem>
            <MenuItem value="Rotation">الروتيشنات (Rotations)</MenuItem>
          </Select>
        </FormControl>
      </div>

      {/* Audit Table */}
      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>نوع العملية (Action)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المستخدم (Actor)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الكيان (Entity)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>عنوان IP والجهاز</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>التاريخ والوقت</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                  <Chip label={log.action} color="primary" size="small" variant="outlined" style={{ fontWeight: 700 }} />
                </TableCell>
                <TableCell>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{log.actor?.person?.nameAr || 'المستخدم'}</div>
                  <div style={{ fontSize: '11px', color: '#06b6d4' }}>{log.actor?.email}</div>
                </TableCell>
                <TableCell>
                  <Chip label={log.entityType} size="small" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }} />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{log.entityId}</div>
                </TableCell>
                <TableCell style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  <div style={{ fontFamily: 'monospace', color: '#10b981' }}>{log.ipAddress}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.userAgent}
                  </div>
                </TableCell>
                <TableCell style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {new Date(log.createdAt).toLocaleString('ar-SA')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default AuditLogs;
