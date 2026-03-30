import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasAccess } from '../utils/rbac';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasAccess(user.role, allowedRoles)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}