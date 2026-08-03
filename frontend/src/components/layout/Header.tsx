import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building, LogOut, User, ChevronDown, Bell } from 'lucide-react';
import { Menu, MenuItem, IconButton, Avatar, Chip } from '@mui/material';

export const Header: React.FC = () => {
  const { user, switchOrganization, logout } = useAuth();
  const [orgAnchorEl, setOrgAnchorEl] = useState<null | HTMLElement>(null);
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null);

  const handleOrgClick = (event: React.MouseEvent<HTMLElement>) => {
    setOrgAnchorEl(event.currentTarget);
  };

  const handleUserClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserAnchorEl(event.currentTarget);
  };

  const handleSelectOrg = async (orgId: string) => {
    setOrgAnchorEl(null);
    if (orgId !== user?.activeOrganization.id) {
      await switchOrganization(orgId);
    }
  };

  return (
    <header style={{
      height: '72px',
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {/* Active Organization Context Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={handleOrgClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            color: '#f8fafc',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
        >
          <Building size={16} color="#10b981" />
          <span>الجهة الحالية:</span>
          <span style={{ color: '#34d399', fontWeight: 700 }}>
            {user?.activeOrganization?.nameAr || 'اختر الجهة'}
          </span>
          <ChevronDown size={14} color="#94a3b8" />
        </button>

        <Menu
          anchorEl={orgAnchorEl}
          open={Boolean(orgAnchorEl)}
          onClose={() => setOrgAnchorEl(null)}
          PaperProps={{
            style: {
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              marginTop: '8px',
              minWidth: '240px',
            },
          }}
        >
          <div style={{ padding: '8px 16px', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
            الجهات التابعة لحسابك (Multi-Org Context)
          </div>
          {user?.availableOrganizations?.map((org) => (
            <MenuItem
              key={org.id}
              onClick={() => handleSelectOrg(org.id)}
              selected={org.id === user.activeOrganization.id}
              style={{
                fontSize: '13px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{org.nameAr}</span>
              {org.id === user.activeOrganization.id && (
                <Chip label="نشط" size="small" color="success" style={{ height: '20px', fontSize: '10px' }} />
              )}
            </MenuItem>
          ))}
        </Menu>
      </div>

      {/* User Actions & Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <IconButton style={{ color: '#94a3b8' }}>
          <Bell size={20} />
        </IconButton>

        <button
          onClick={handleUserClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <Avatar style={{ backgroundColor: '#059669', width: 36, height: 36, fontSize: '14px', fontWeight: 700 }}>
            {user?.nameAr?.[0] || 'م'}
          </Avatar>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{user?.nameAr || 'المستخدم'}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{user?.email}</div>
          </div>
          <ChevronDown size={14} color="#94a3b8" />
        </button>

        <Menu
          anchorEl={userAnchorEl}
          open={Boolean(userAnchorEl)}
          onClose={() => setUserAnchorEl(null)}
          PaperProps={{
            style: {
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              marginTop: '8px',
            },
          }}
        >
          <MenuItem onClick={logout} style={{ fontSize: '13px', color: '#ef4444', gap: '8px' }}>
            <LogOut size={16} />
            تسجيل الخروج
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
};
