import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building, LogOut, User, ChevronDown, Menu as MenuIcon } from 'lucide-react';
import { Menu, MenuItem, IconButton, Avatar, Chip } from '@mui/material';
import { NotificationCenter } from '../NotificationCenter';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
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
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Drawer Trigger Button */}
        {onMobileMenuToggle && (
          <IconButton
            onClick={onMobileMenuToggle}
            sx={{ display: { xs: 'flex', lg: 'none' }, color: '#0F766E' }}
            aria-label="فتح القائمة"
          >
            <MenuIcon size={22} />
          </IconButton>
        )}

        {/* Active Organization Context Switcher */}
        <button
          onClick={handleOrgClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            backgroundColor: '#CCFBF1',
            border: '1px solid #99F6E4',
            borderRadius: '12px',
            color: '#0F766E',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            transition: 'all 0.15s ease',
          }}
        >
          <Building size={16} color="#0F766E" />
          <span>الجهة الحالية:</span>
          <span style={{ color: '#0D9488', fontWeight: 800 }}>
            {user?.activeOrganization?.nameAr || 'اختر الجهة'}
          </span>
          <ChevronDown size={14} color="#0F766E" />
        </button>

        <Menu
          anchorEl={orgAnchorEl}
          open={Boolean(orgAnchorEl)}
          onClose={() => setOrgAnchorEl(null)}
          PaperProps={{
            style: {
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              marginTop: '8px',
              minWidth: '240px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          <div style={{ padding: '8px 16px', fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
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
                <Chip label="نشط" size="small" style={{ height: '20px', fontSize: '10px', backgroundColor: '#CCFBF1', color: '#0F766E', fontWeight: 700 }} />
              )}
            </MenuItem>
          ))}
        </Menu>
      </div>

      {/* User Actions Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <NotificationCenter />

        <div style={{ height: '24px', width: '1px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

        <div
          onClick={handleUserClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '10px',
          }}
        >
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#0F766E', fontSize: 14, fontWeight: 700 }}>
            {user?.nameAr?.charAt(0) || 'U'}
          </Avatar>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              {user?.nameAr || 'المستخدم'}
            </span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>{user?.email}</span>
          </div>
          <ChevronDown size={14} color="#64748B" />
        </div>

        <Menu
          anchorEl={userAnchorEl}
          open={Boolean(userAnchorEl)}
          onClose={() => setUserAnchorEl(null)}
          PaperProps={{
            style: {
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              marginTop: '8px',
              minWidth: '200px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          <MenuItem onClick={logout} style={{ fontSize: '13px', color: '#EF4444', display: 'flex', gap: '8px', fontWeight: 700 }}>
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
};
