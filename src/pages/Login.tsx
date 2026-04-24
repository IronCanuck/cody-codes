import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { resolveAuthEmail } from '../lib/auth-identities';
import { supabase } from '../lib/supabase';

function defaultAfterLoginPath(): string {
  return '/consaltyapp';
}

export function Login() {
  const { session, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const returnTo = searchParams.get('return') || defaultAfterLoginPath();

  useEffect(() => {
    document.title = 'Sign in · Cody Codes';
  }, []);

  useEffect(() => {
    if (!authLoading && session) {
      navigate(returnTo, { replace: true });
    }
  }, [authLoading, session, navigate, returnTo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = resolveAuthEmail(username);
    if (!email) {
      setError('That username or email is not recognized.');
      return;
    }
    setSubmitting(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    navigate(returnTo, { replace: true });
  };

  if (authLoading || session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm font-medium">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 text-sm font-semibold"
          >
            <span className="text-cody-finnish">←</span> Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-jd-green-600 rounded-full p-3 shadow-md">
              <Leaf className="text-jd-yellow-400" size={28} strokeWidth={2.2} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 tracking-tight">
            Sign in
          </h1>
          <p className="text-center text-slate-600 text-sm mt-2">
            Consalty and other apps on this site require an account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="login-username"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Username or email
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cody-finnish focus:border-transparent"
                placeholder="Ironcanuck19 or your email"
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cody-finnish focus:border-transparent"
                disabled={submitting}
                required
              />
            </div>

            {error && (
              <p
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-cody-finnish text-white font-semibold py-3 shadow-sm hover:bg-cody-finnish-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogIn size={18} strokeWidth={2.25} aria-hidden />
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
