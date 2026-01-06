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
  // Email verification helpers
  isEmailVerified: boolean;
  requiresEmailVerification: boolean;
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

  // Check if user signed in with email (not Google/OAuth) and hasn't verified
  const isEmailProvider = user?.providerData?.some(p => p.providerId === 'password') ?? false;
  const isEmailVerified = user?.emailVerified ?? false;
  // Only require verification for email/password users, not OAuth users
  const requiresEmailVerification = isEmailProvider && !isEmailVerified;

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
    isEmailVerified,
    requiresEmailVerification,
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
