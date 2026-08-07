import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ShieldCheck, Plus, Play, CheckCircle2, XCircle } from 'lucide-react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, TextField, Alert, LinearProgress } from '@mui/material';

export const Policies: React.FC = () => {
  const [testResource, setTestResource] = useState('organization');
  const [testAction, setTestAction] = useState('create');
  const [evalResult, setEvalResult] = useState<any>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const res = await apiClient.get('/policies');
      return res.data;
    },
  });

  const handleEvaluate = async () => {
    try {
      const res = await apiClient.post('/policies/evaluate', {
        resource: testResource,
        action: testAction,
      });
      setEvalResult(res.data);
    } catch (err: any) {
      setEvalResult({ allowed: false, reason: err.response?.data?.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            سياسات التحكم بالوصول (Policy Engine ABAC)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            سياسات مرنة مبنية على الخصائص (Attribute-Based Access Control) بدلاً من الشروط الثابتة في الكود
          </p>
        </div>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
        >
          إضافة سياسة وصول جديدة
        </Button>
      </div>

      {isLoading && <LinearProgress sx={{ borderRadius: 1 }} />}
      {isError && <Alert severity="error">تعذر تحميل السياسات من الخادم</Alert>}

      {/* Policy Evaluator Debugger Card */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          مُقيّم ومُختبر السياسات المباشر (Policy Evaluation Debugger)
        </h3>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <TextField
            label="المورد (Resource)"
            size="small"
            value={testResource}
            onChange={(e) => setTestResource(e.target.value)}
          />
          <TextField
            label="الإجراء (Action)"
            size="small"
            value={testAction}
            onChange={(e) => setTestAction(e.target.value)}
          />
          <Button
            variant="contained"
            startIcon={<Play size={16} />}
            onClick={handleEvaluate}
            style={{ height: '40px' }}
          >
            اختبار وتقييم القرار
          </Button>
        </div>

        {evalResult && (
          <Alert severity={evalResult.allowed ? 'success' : 'error'} style={{ borderRadius: '10px' }}>
            النتيجة: {evalResult.allowed ? 'سماح بالوصول (ALLOW)' : 'حجب الوصول (DENY)'} — {evalResult.reason}
          </Alert>
        )}
      </div>

      {/* Policies Table */}
      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>رمز السياسة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم السياسة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المورد</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الإجراء</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>التأثير (Effect)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الأولوية</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell style={{ fontFamily: 'monospace', fontWeight: 700, color: '#06b6d4' }}>{p.code}</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>{p.nameAr}</TableCell>
                <TableCell>{p.resource}</TableCell>
                <TableCell>{p.action}</TableCell>
                <TableCell>
                  <Chip
                    label={p.effect === 'allow' ? 'سماح (ALLOW)' : 'حجب (DENY)'}
                    color={p.effect === 'allow' ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell style={{ fontWeight: 700 }}>{p.priority}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
