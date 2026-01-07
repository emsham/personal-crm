import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, User, Loader2, ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NeuralCanvas } from './landing';

interface AuthPageProps {
  mode?: 'login' | 'signup';
}

// Password requirements checker
const PasswordRequirements: React.FC<{ password: string }> = ({ password }) => {
  const requirements = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ], [password]);

  const allMet = requirements.every(r => r.met);

  return (
    <div className={`mt-3 p-3 rounded-xl transition-all ${allMet ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800/50 border border-slate-700/50'}`}>
      <div className="grid grid-cols-2 gap-2">
        {requirements.map((req, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs transition-all ${
              req.met ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {req.met ? (
              <Check size={14} className="text-emerald-400 flex-shrink-0" />
            ) : (
              <X size={14} className="text-slate-600 flex-shrink-0" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AuthPage: React.FC<AuthPageProps> = ({ mode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword } = useAuth();

  // Sync isSignUp state with mode prop when route changes
  useEffect(() => {
    setIsSignUp(mode === 'signup');
    setError('');
    setSuccess('');
  }, [mode]);

  // Get redirect destination after auth
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const isPasswordValid = useMemo(() => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    );
  }, [password]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isSignUp && !isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        // Sign up redirects to email verification via ProtectedRoute
      } else {
        await signInWithEmail(email, password);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative bg-[#0a0a0f]">
      {/* Neural canvas background - matches landing page */}
      <NeuralCanvas className="absolute inset-0 z-0 opacity-60" />
      {/* Background elements */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and branding */}
        <div className="text-center mb-10">
          <div className="relative inline-block mb-6">
            <img
              src="/tethru-app-icon.svg"
              alt="tethru"
              className="w-20 h-20 rounded-2xl shadow-2xl shadow-violet-500/30"
            />
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500 opacity-20 blur-xl animate-pulse-slow" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">tethru</h1>
          <p className="text-slate-400">AI-Powered Personal CRM</p>
        </div>

        {/* Auth card */}
        <div className="glass-strong rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">
            {isForgotPassword ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm backdrop-blur-sm">
              {success}
            </div>
          )}

          {isForgotPassword ? (
            // Forgot Password Form
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <p className="text-slate-400 text-sm mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Mail size={12} /> Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 input-dark rounded-xl focus:ring-2 focus:ring-violet-500/50 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <p className="mt-6 text-center text-sm text-slate-500">
                Remember your password?{' '}
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </form>
          ) : (
            // Sign In / Sign Up Form
            <>
              <form onSubmit={handleEmailAuth} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Mail size={12} /> Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3.5 input-dark rounded-xl focus:ring-2 focus:ring-violet-500/50 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Lock size={12} /> Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    minLength={8}
                    className="w-full px-4 py-3.5 input-dark rounded-xl focus:ring-2 focus:ring-violet-500/50 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {isSignUp && <PasswordRequirements password={password} />}
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                        setSuccess('');
                      }}
                      className="text-xs text-slate-500 hover:text-violet-400 transition-colors mt-1"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (isSignUp && !isPasswordValid)}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : isSignUp ? (
                    <>
                      <User size={20} /> Create Account
                      <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="my-8 flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">or continue with</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-3.5 glass text-slate-300 font-semibold rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="group-hover:text-white transition-colors">Continue with Google</span>
              </button>

              <p className="mt-8 text-center text-sm text-slate-500">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <Link
                  to={isSignUp ? '/login' : '/signup'}
                  className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-600">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
