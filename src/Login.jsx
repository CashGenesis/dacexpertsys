import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { loginWithCredentials, loginWithGoogle } from './services/api';
import { useAuth } from './context/AuthContext';
import LogoCirclesBackground from './components/LogoCirclesBackground';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleRoleRedirect = (role) => {
    const normalizedRole = String(role || '').toLowerCase();

    if (normalizedRole === 'student') {
      navigate('/student-dashboard');
      return;
    }
    if (normalizedRole === 'warden') {
      navigate('/warden-dashboard');
      return;
    }
    if (normalizedRole === 'chief_warden') {
      navigate('/chief-dashboard');
      return;
    }
    if (normalizedRole === 'dsw') {
      navigate('/dsw-dashboard');
      return;
    }
    if (normalizedRole === 'admin') {
      navigate('/admin-dashboard');
      return;
    }

    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const payload = await loginWithCredentials(email, password);
      login(payload);
      handleRoleRedirect(payload?.user?.role);
    } catch (err) {
      setAuthError(err?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || googleInitializedRef.current) return;

    const loadScript = () =>
      new Promise((resolve, reject) => {
        if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
        document.body.appendChild(script);
      });

    loadScript()
      .then(() => {
        if (!window.google || googleInitializedRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              setAuthError('');
              setGoogleLoading(true);
              const payload = await loginWithGoogle(response.credential);
              login(payload);
              handleRoleRedirect(payload?.user?.role);
            } catch (err) {
              setAuthError(err?.message || 'Google login failed');
            } finally {
              setGoogleLoading(false);
            }
          },
        });

        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            shape: 'pill',
          });
        }

        googleInitializedRef.current = true;
      })
      .catch((err) => {
        setAuthError(err?.message || 'Google login failed');
      });
  }, [googleClientId, login]);

  return (
    <div className="relative overflow-hidden min-h-dvh w-full bg-[#eef0f8] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased text-slate-800">
      {/* Drifting circles in the BMU logo colours */}
      <LogoCirclesBackground />

      <div className="relative z-10 w-full max-w-5xl rounded-[28px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 lg:min-h-[640px] ring-1 ring-white/70 shadow-[0_40px_90px_-30px_rgba(30,27,75,0.35)]">

        {/* ── LEFT PANEL: campus photo with the university identity ── */}
        <div className="lg:col-span-6 relative overflow-hidden flex flex-col justify-between gap-6 sm:gap-10 p-6 sm:p-12 min-h-[220px] sm:min-h-[260px] text-white">
          <img
            src="/login-campus.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none scale-[1.02]"
          />
          {/* Light at the top so the campus shows, deep indigo at the bottom for the text */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#1e1b4b]/45 via-[#1e1b4b]/25 to-[#141235]/90" />

          {/* University identity */}
          <div className="relative z-10 flex items-center justify-center gap-3">
            <span className="h-12 w-12 rounded-2xl bg-white/95 shadow-lg shadow-black/10 flex items-center justify-center">
              <img src="/favicon.png" alt="BML Munjal University logo" className="h-9 w-9 object-contain" />
            </span>
            <div>
              <h2 className="text-base font-semibold leading-tight tracking-tight drop-shadow-sm">
                DAC Expert System
              </h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                BML Munjal University
              </span>
            </div>
          </div>

          <div className="relative z-10 mt-auto">
            <h1 className="text-2xl sm:text-[32px] font-semibold tracking-tight leading-[1.15] text-center drop-shadow-sm">
              Streamline Disciplinary Actions Across Campus.
            </h1>
            <p className="hidden sm:block mt-4 text-sm text-white/80 text-center max-w-sm mx-auto leading-relaxed">
              Institutional incident tracking, multi-tier committee escalations, and policy retrieval in one unified workspace.
            </p>

            {/* Footer note */}
            <div className="mt-8 pt-4 border-t border-white/20 flex items-center justify-between text-[11px] font-medium text-white/70">
              <span>&copy; {new Date().getFullYear()} BMU</span>
              <span>Disciplinary Portal</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: sign-in (75% opaque glass over the moving circles) ── */}
        <div className="lg:col-span-6 flex flex-col justify-center bg-white/75 backdrop-blur-xl px-6 py-10 sm:px-12 sm:py-12">
          <div className="max-w-sm w-full mx-auto">
            <div className="mb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3d3793]">Sign in</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#14122e] tracking-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter your university credentials to access the DAC system.
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  role="alert"
                  className="mb-5 px-3.5 py-3 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
                >
                  <span className="material-symbols-outlined text-[18px] text-rose-600 mt-px">error</span>
                  <span>{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    mail
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@bmu.edu.in"
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/80 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm shadow-slate-900/[0.02] focus:outline-none focus:border-[#3d3793] focus:bg-white focus:ring-4 focus:ring-[#3d3793]/10 transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    lock
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-11 pr-11 rounded-xl bg-white/80 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm shadow-slate-900/[0.02] focus:outline-none focus:border-[#3d3793] focus:bg-white focus:ring-4 focus:ring-[#3d3793]/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#3d3793] hover:bg-slate-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#3d3793] hover:bg-[#2f2a7a] text-white text-sm font-semibold shadow-lg shadow-[#3d3793]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3d3793]/25"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span>Sign in</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-7 flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* Google Sign In Container */}
            <div className="w-full flex justify-center">
              {googleClientId ? (
                <div ref={googleButtonRef} className="w-full flex justify-center" />
              ) : (
                <p className="text-xs text-center text-slate-400">
                  Google sign-in is not configured.
                </p>
              )}
            </div>

            {googleLoading && (
              <p className="mt-3 text-xs text-center text-slate-500 flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                Signing in with Google…
              </p>
            )}

            <p className="mt-10 text-xs text-slate-500 text-center">
              Trouble signing in? Contact the Office of the Dean, Student Welfare.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
