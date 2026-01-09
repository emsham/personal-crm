import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthState, signIn, signUp, signOut, resetPassword, resendVerificationEmail } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Email verification helpers
  isEmailVerified: boolean;
  requiresEmailVerification: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    await signIn(email, password);
  }, []);

  const handleSignUp = useCallback(async (email: string, password: string) => {
    await signUp(email, password);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  const handleResetPassword = useCallback(async (email: string) => {
    await resetPassword(email);
  }, []);

  const handleResendVerificationEmail = useCallback(async () => {
    await resendVerificationEmail();
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

  const value = useMemo(() => ({
    user,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    resendVerificationEmail: handleResendVerificationEmail,
    refreshUser,
    isEmailVerified,
    requiresEmailVerification,
  }), [user, loading, handleSignIn, handleSignUp, handleSignOut, handleResetPassword, handleResendVerificationEmail, refreshUser, isEmailVerified, requiresEmailVerification]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
