import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import {
  Badge,
  IconButton,
  Popover,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';

export const NotificationCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count').catch(() => ({ data: { data: { count: 0 } } }));
      return res.data?.data || { count: 0 };
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications', { params: { limit: 10 } }).catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const unreadCount = unreadData?.count || 0;
  const notifications = notificationsData || [];

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      training_request: '#06b6d4',
      training_request_update: '#f59e0b',
      allocation: '#10b981',
      import: '#8b5cf6',
      system: '#ef4444',
    };
    return colors[type] || '#94a3b8';
  };

  return (
    <>
      <Tooltip title="الإشعارات">
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          style={{ color: '#94a3b8' }}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <Bell size={20} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          style: {
            width: '380px',
            maxHeight: '480px',
            backgroundColor: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
          },
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
            الإشعارات {unreadCount > 0 && <span style={{ fontSize: '12px', color: '#f59e0b' }}>({unreadCount} جديد)</span>}
          </div>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCheck size={14} />}
              onClick={() => markAllReadMutation.mutate()}
              style={{ fontSize: '11px', color: '#10b981' }}
            >
              قراءة الكل
            </Button>
          )}
        </div>

        <div style={{ maxHeight: '380px', overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <CircularProgress size={24} />
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((n: any) => (
              <div
                key={n.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  backgroundColor: n.isRead ? 'transparent' : 'rgba(6, 182, 212, 0.05)',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: n.isRead ? 'transparent' : getTypeColor(n.type),
                    marginTop: '6px',
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                      {n.titleAr}
                    </div>
                    {n.bodyAr && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                        {n.bodyAr}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                      {getTimeAgo(n.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              لا توجد إشعارات حالياً
            </div>
          )}
        </div>
      </Popover>
    </>
  );
};
