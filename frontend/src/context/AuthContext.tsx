import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface UserOrg {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isPrimary?: boolean;
}

export interface UserProfile {
  id: string;
  personId: string;
  nameAr: string;
  nameEn?: string;
  email: string;
  activeOrganization: UserOrg;
  availableOrganizations: UserOrg[];
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: { user: UserProfile; tokens: { accessToken: string; refreshToken: string } }) => void;
  logout: () => void;
  switchOrganization: (orgId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = (data: { user: UserProfile; tokens: { accessToken: string; refreshToken: string } }) => {
    localStorage.setItem('access_token', data.tokens.accessToken);
    localStorage.setItem('refresh_token', data.tokens.refreshToken);
    localStorage.setItem('active_org_id', data.user.activeOrganization.id);
    localStorage.setItem('user_profile', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const switchOrganization = async (orgId: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/switch-org', { organizationId: orgId });
      const { activeOrganization, tokens } = res.data;

      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
      localStorage.setItem('active_org_id', activeOrganization.id);

      if (user) {
        const updatedUser: UserProfile = {
          ...user,
          activeOrganization,
        };
        localStorage.setItem('user_profile', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
