import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/apiClient';

export interface User {
  id: string;
  username: string;
  role: string;
  email?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User, accessToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      // First try to check current session
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          // If we have a user but no access token in memory yet,
          // apiClient will handle it on first request failure via /refresh
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Auth check failed', e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (userData: User, accessToken: string) => {
    setUser(userData);
    apiClient.setAccessToken(accessToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Logout failed', e);
    }
    setUser(null);
    apiClient.setAccessToken(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
