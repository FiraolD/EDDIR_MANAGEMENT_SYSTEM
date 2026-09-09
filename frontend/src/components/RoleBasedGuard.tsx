import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface RoleBasedGuardProps {
    children: React.ReactNode;
    resource: string;
    action: string;
    fallback?: React.ReactNode;
}

export const RoleBasedGuard: React.FC<RoleBasedGuardProps> = ({
    children,
    resource,
    action,
    fallback = null,
}) => {
    const { hasPermission, loading } = usePermissions();
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!hasPermission(`${resource}.${action}`)) {
        return <>{fallback}</>;
    }
    
    return <>{children}</>;
};