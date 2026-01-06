import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  signOut,
  onAuthStateChanged,
  resetPassword,
  resendVerificationEmail,
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = useCallback(async () => {
    if (user) {
      await user.reload();
      // Force re-render with updated user data
      setUser({ ...user } as User);
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signOut,
    resetPassword,
    resendVerificationEmail,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
