import { useAuthStore } from '../store/authStore';
import { hasAccess } from '../utils/rbac';

// Utility component to hide/show UI elements (like buttons) based on role
export default function RoleGuard({ children, allowedRoles }) {
  const { user } = useAuthStore();

  if (!user || !hasAccess(user.role, allowedRoles)) {
    return null;
  }

  return children;
}