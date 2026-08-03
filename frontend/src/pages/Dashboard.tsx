import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  GraduationCap,
  Activity,
  Zap,
  TrendingUp,
  ShieldCheck,
  Award,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button, Chip } from '@mui/material';

const clusterData = [
  { name: 'تجمع الحدود الشمالية', trainees: 450, hospitals: 6, score: 94 },
  { name: 'تجمع الرياض الأول', trainees: 1200, hospitals: 14, score: 91 },
  { name: 'تجمع مكة المكرمة', trainees: 980, hospitals: 11, score: 88 },
  { name: 'تجمع الشرقية الصحي', trainees: 850, hospitals: 9, score: 95 },
  { name: 'تجمع عسير الصحي', trainees: 620, hospitals: 8, score: 89 },
];

const traineeLevelData = [
  { name: 'أطباء امتياز', value: 1450, color: '#10b981' },
  { name: 'أطباء مقيمون', value: 920, color: '#06b6d4' },
  { name: 'طلاب كليات', value: 810, color: '#6366f1' },
  { name: 'تمريض وأخصائيون', value: 540, color: '#f59e0b' },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Banner */}
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Chip label="نظام مؤسسي مفعّل" color="success" size="small" style={{ fontWeight: 700 }} />
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>المستقبل الوطني للتدريب الصحي</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            مرحباً بك في منصة مِران (Miran) — لوحة الإشراف الوطنية
          </h1>
          <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px', maxWidth: '600px' }}>
            إدارة كاملة للشجرة التنظيمية، التجمعات الصحية، التراخيص، سير العمل، ومؤشر الانضباط والتجاوب للنداءات.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => navigate('/organizations/wizard')}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
              fontWeight: 700,
            }}
          >
            معالج إنشاء جهة آلياً
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {[
          { title: 'إجمالي الجهات المسجلة', value: '48 جهة', icon: Building2, change: '+12%', color: '#10b981' },
          { title: 'المتدربون النشطون', value: '3,720 متدرب', icon: GraduationCap, change: '+8%', color: '#06b6d4' },
          { title: 'مؤشر الانضباط الوطني', value: '93.4%', icon: Award, change: '+2.1%', color: '#6366f1' },
          { title: 'النداءات المنفذة اليوم', value: '142 نداء', icon: Zap, change: '100% استجابة', color: '#f59e0b' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>{kpi.title}</span>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: `${kpi.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={20} color={kpi.color} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc' }}>{kpi.value}</span>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                  {kpi.change} <ArrowUpRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Cluster Distribution Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>أداء التجمعات الصحية ومؤشر الانضباط</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>مقارنة أعداد المتدربين ومعدل الانضباط والتجاوب</p>
            </div>
            <Chip label="مباشر" color="primary" variant="outlined" size="small" />
          </div>

          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }}
                />
                <Bar dataKey="trainees" name="عدد المتدربين" fill="#059669" radius={[8, 8, 0, 0]} />
                <Bar dataKey="score" name="مؤشر الانضباط %" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trainee Levels Pie Chart */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>توزيع المتدربين حسب المستوى</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>التصنيف السريري والأكاديمي</p>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={traineeLevelData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {traineeLevelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
            {traineeLevelData.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                <span style={{ color: '#cbd5e1' }}>{item.name}:</span>
                <span style={{ fontWeight: 700, color: '#fff' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
