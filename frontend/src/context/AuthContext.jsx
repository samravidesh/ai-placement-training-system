import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const normalizeUser = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const normalizedId = value.id ?? value.userId ?? value.user_id ?? null;
  return {
    ...value,
    id: normalizedId
  };
};

const parseStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch (_error) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(parseStoredUser());
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token') && !parseStoredUser()));

  const adminEmails = useMemo(
    () =>
      String(import.meta.env.VITE_ADMIN_EMAILS || 'admin@example.com')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    []
  );

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      if (user) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const normalizedUser = normalizeUser(response.data.user);
        setUser(normalizedUser);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
      } catch (_error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token, user]);

  const login = ({ token: nextToken, user: nextUser }) => {
    const normalizedUser = normalizeUser(nextUser);
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(nextToken);
    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (nextUser) => {
    const normalizedUser = normalizeUser(nextUser);
    setUser(normalizedUser);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  const value = {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token),
    isAdmin: Boolean(user?.email && adminEmails.includes(String(user.email).toLowerCase())),
    login,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
