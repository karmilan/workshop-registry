/* src/components/ProtectedRoute.tsx */
import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth-context';

/**
 * Wraps a route element and ensures the user is authenticated.
 * If not, redirects to /login preserving the intended location.
 */
export const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="feedback" role="status">Checking your session…</main>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
