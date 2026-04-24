import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type Props = { children: ReactNode };

export function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-600 text-sm font-medium">Loading…</p>
      </div>
    );
  }

  if (!session) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/login?return=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
