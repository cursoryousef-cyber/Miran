import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Wand2, CheckCircle2, Building2, User, ShieldCheck, Copy, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button, TextField, MenuItem, Stepper, Step, StepLabel, Alert } from '@mui/material';

export const OrganizationWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    organizationTypeId: '',
    parentId: '',
    code: '',
    nameAr: '',
    nameEn: '',
    cityAr: 'عرعر',
    regionAr: 'الحدود الشمالية',
    contactEmail: '',
    adminNameAr: '',
    adminEmail: '',
    adminNationalId: '',
    adminPhone: '',
  });

  // Fetch Org Types & Existing Parent Orgs
  const { data: orgTypes } = useQuery({
    queryKey: ['orgTypes'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations');
      return res.data;
    },
  });

  const steps = ['بيانات الجهة الأساسية', 'النوع والهيكل التنظيمي', 'الحساب الإداري التلقائي', 'التراخيص والإعدادات', 'الإنهاء ورابط التفعيل'];

  const handleNext = async () => {
    if (activeStep === 3) {
      // Execute Provisioning
      setError(null);
      try {
        const res = await apiClient.post('/organizations/provision-wizard', {
          organization: {
            organizationTypeId: formData.organizationTypeId || '90176846-9cf7-4e31-9257-2c976d8b9415', // fallback/selected
            parentId: formData.parentId || undefined,
            code: formData.code,
            nameAr: formData.nameAr,
            nameEn: formData.nameEn,
            cityAr: formData.cityAr,
            regionAr: formData.regionAr,
            contactEmail: formData.contactEmail || formData.adminEmail,
          },
          adminNameAr: formData.adminNameAr,
          adminEmail: formData.adminEmail,
          adminNationalId: formData.adminNationalId,
          adminPhone: formData.adminPhone,
        });

        setResultData(res.data);
        setActiveStep(4);
      } catch (err: any) {
        setError(err.response?.data?.message || 'حدث خطأ أثناء معالجة تزويد الجهة الآلي');
      }
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #059669 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
        }}>
          <Wand2 size={28} color="#fff" />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          معالج تزويد الجهات آلياً (Auto Provisioning Wizard)
        </h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
          تزويد آلي كامل: الجهة + الشجرة + الحساب الإداري + ترخيص الباقة + إرسال رابط التفعيل
        </p>
      </div>

      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel style={{ backgroundColor: 'transparent' }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel style={{ color: '#f8fafc' }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Form Container */}
      <div className="glass-card" style={{ padding: '32px' }}>
        {activeStep === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>1. البيانات الأساسية للجهة</h3>
            <TextField
              label="اسم الجهة بالعربية"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              placeholder="مثال: مستشفى عرعر المركزي الجديد"
              fullWidth
              required
            />
            <TextField
              label="اسم الجهة بالإنجليزية"
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              placeholder="e.g. New Arar Central Hospital"
              fullWidth
              required
            />
            <TextField
              label="رمز الجهة الفريد (Unique Code)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="مثال: HOSP-NACH-01"
              fullWidth
              required
            />
          </div>
        )}

        {activeStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>2. نوع الجهة والتابعيات والشجرة التنظيمية</h3>
            <TextField
              label="المدينة والمنطقة"
              value={formData.cityAr}
              onChange={(e) => setFormData({ ...formData, cityAr: e.target.value })}
              fullWidth
            />
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              سيتم إنشاء السجل في الشجرة الشجرية (Closure Table) وتعيين المسارات تلقائياً بدون تداخل.
            </p>
          </div>
        )}

        {activeStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>3. الحساب الإداري الافتراضي لمدير الجهة</h3>
            <TextField
              label="اسم المدير بالعربية"
              value={formData.adminNameAr}
              onChange={(e) => setFormData({ ...formData, adminNameAr: e.target.value })}
              placeholder="د. أحمد عبدالله العنزي"
              fullWidth
              required
            />
            <TextField
              label="البريد الإلكتروني للمدير (سيصل رابط التفعيل عليه)"
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              placeholder="admin@hospital.health.sa"
              type="email"
              fullWidth
              required
            />
            <TextField
              label="الهوية الوطنية / الإقامة"
              value={formData.adminNationalId}
              onChange={(e) => setFormData({ ...formData, adminNationalId: e.target.value })}
              fullWidth
            />
          </div>
        )}

        {activeStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>4. ملخص الترخيص والإعدادات التلقائية</h3>
            <div style={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399' }}>باقة التشغيل: Enterprise License (1 Year)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                تتضمن: 100 مستخدم إداري + 500 متدرب + 50 GB مساحة تخزينية + كافّة ميزات النظام والمستندات والنداءات.
              </div>
            </div>
          </div>
        )}

        {activeStep === 4 && resultData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center' }}>
            <CheckCircle2 size={64} color="#10b981" style={{ margin: '0 auto' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>تم إنشاء الجهة والحساب الإداري بنجاح!</h2>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '12px', textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>رابط تفعيل الحساب الصادر لمدير الجهة:</div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                <TextField
                  value={resultData.activationLink}
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true }}
                />
                <Button
                  variant="outlined"
                  onClick={() => copyToClipboard(resultData.activationLink)}
                  startIcon={<Copy size={16} />}
                >
                  {copied ? 'تم النسخ' : 'نسخ'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Buttons Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          {activeStep < 4 && (
            <Button disabled={activeStep === 0} onClick={handleBack} style={{ color: '#94a3b8' }}>
              السابق
            </Button>
          )}

          {activeStep < 4 && (
            <Button
              variant="contained"
              onClick={handleNext}
              style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700, marginRight: 'auto' }}
            >
              {activeStep === 3 ? 'إنشاء وتزويد الجهة الآن' : 'التالي'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
