/* src/components/RoleGuard.tsx */
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

/**
 * Restricts the route for usability; backend authorization remains authoritative.
 */
export const RoleGuard = ({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: ReactNode;
}) => {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/workshops" replace />;
  return children;
};
