import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from './ui/button';

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
    const { can, loading } = usePermissions();
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!can(resource, action)) {
        return <>{fallback}</>;
    }
    
    return <>{children}</>;
};

// Example usage in a page:
<RoleBasedGuard resource="leader" action="create">
    <Button>Add Member</Button>
</RoleBasedGuard>




