import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { api } from '@/services/api';

export const usePermissions = () => {
  const { user } = useAppContext();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Define role-based permissions
      const rolePermissions: Record<string, string[]> = {
        'super_admin': [
          'dashboard.view', 'member.create', 'member.read', 'member.update', 'member.delete',
          'contribution.create', 'contribution.read', 'contribution.update',
          'claim.create', 'claim.read', 'claim.update', 'claim.approve',
          'report.read', 'report.export',
          'organization.create', 'organization.read', 'organization.update', 'organization.delete',
                  'finance.reconcile', 'finance.pay_claims',
          'user.manage', 'system.configure'
        ],
        'org_admin': [
          'dashboard.view', 'member.create', 'member.read', 'member.update',
          'contribution.create', 'contribution.read', 'contribution.update',
          'claim.create', 'claim.read', 'claim.update', 'claim.approve_admin',
          'report.read', 'report.export'
        ],
            'finance': [
        'claim.read', 'claim.pay',
        'contribution.read', 'contribution.reconcile',
        'transaction.read', 'transaction.reconcile',
        'report.read', 'report.export'
    ],
        'edir_leader': [
          'dashboard.view', 'member.read', 'member.create',
          'contribution.create', 'contribution.read',
          'claim.create', 'claim.read', 'claim.approve_leader'
        ],
        'member': [
          'dashboard.view', 'member.read.own',
          'contribution.create', 'contribution.read.own',
          'claim.create', 'claim.read.own'
        ]
      };
      
      const userPermissions = rolePermissions[user.role] || [];
      setPermissions(new Set(userPermissions));
      setLoading(false);
    };
    
    fetchPermissions();
  }, [user]);

  const can = (resource: string, action: string): boolean => {
    if (user?.role === 'super_admin') return true;
    return permissions.has(`${resource}.${action}`);
  };

  const canAny = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.some(check => can(check.resource, check.action));
  };

  const canAll = (checks: Array<{ resource: string; action: string }>): boolean => {
    return checks.every(check => can(check.resource, check.action));
  };

  return { can, canAny, canAll, permissions, loading, userRole: user?.role };
};