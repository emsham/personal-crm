import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
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

        {/* Auth card */}
        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

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
                minLength={6}
                className="w-full px-4 py-3.5 input-dark rounded-xl focus:ring-2 focus:ring-violet-500/50 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
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
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
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
