import { PropsWithChildren, createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { onUnauthorized, setAuthToken } from '../api/client';

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('logger_token'));

  useEffect(() => {
    setAuthToken(token);
    if (token) {
      localStorage.setItem('logger_token', token);
    } else {
      localStorage.removeItem('logger_token');
    }
  }, [token]);

  const logout = useCallback(() => {
    setToken(null);
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      logout();
    });
  }, [logout]);

  const login = useCallback((newToken: string) => {
    setToken(newToken);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    isAuthenticated: Boolean(token),
    login,
    logout
  }), [login, logout, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
