import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const handleSignUp = async (email: string, password: string) => {
    await signUp(email, password);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleResetPassword = async (email: string) => {
    await resetPassword(email);
  };

  const handleResendVerificationEmail = async () => {
    await resendVerificationEmail();
  };

  const refreshUser = useCallback(async () => {
    if (user) {
      await user.reload();
      // Force re-render with updated user data
      setUser({ ...user } as User);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        resetPassword: handleResetPassword,
        resendVerificationEmail: handleResendVerificationEmail,
        refreshUser,
      }}
    >
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
