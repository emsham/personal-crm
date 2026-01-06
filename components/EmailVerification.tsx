import React, { useState } from 'react';
import { Mail, Loader2, RefreshCw, LogOut, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EmailVerification: React.FC = () => {
  const { user, resendVerificationEmail, refreshUser, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await resendVerificationEmail();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (err) {
      // Ignore refresh errors
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      // Ignore sign out errors
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background elements */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and branding */}
        <div className="text-center mb-10">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
              <Sparkles size={36} className="text-white" />
            </div>
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 opacity-20 blur-xl animate-pulse-slow" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Nexus</h1>
          <p className="text-slate-400">AI-Powered Personal CRM</p>
        </div>

        {/* Verification card */}
        <div className="glass-strong rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Mail size={32} className="text-amber-400" />
          </div>

          <h2 className="text-xl font-bold text-white mb-3">Verify your email</h2>

          <p className="text-slate-400 mb-6">
            We sent a verification link to{' '}
            <span className="text-white font-medium">{user?.email}</span>.
            Please check your inbox and click the link to verify your account.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm backdrop-blur-sm flex items-center justify-center gap-2">
              <CheckCircle size={18} />
              Verification email sent! Check your inbox.
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {refreshing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <RefreshCw size={18} />
                  I've verified my email
                </>
              )}
            </button>

            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full py-3.5 glass text-slate-300 font-semibold rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Mail size={18} />
                  Resend verification email
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-slate-300 transition-colors text-sm flex items-center justify-center gap-2 mx-auto"
            >
              <LogOut size={16} />
              Sign out and use a different account
            </button>
          </div>
        </div>

        {/* Help text */}
        <p className="mt-8 text-center text-xs text-slate-600">
          Didn't receive the email? Check your spam folder or try resending.
        </p>
      </div>
    </div>
  );
};

export default EmailVerification;
