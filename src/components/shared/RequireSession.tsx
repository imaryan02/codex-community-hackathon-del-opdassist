import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { getStoredSession, type AppRole } from "../../lib/session";

type RequireSessionProps = {
  allowedRoles?: AppRole[];
  children: ReactElement;
};

export function RequireSession({
  allowedRoles,
  children,
}: RequireSessionProps) {
  const session = getStoredSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
