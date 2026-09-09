// src/hooks/usePermissions.ts
import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { api } from '@/services/api';

export const usePermissions = () => {
    const { user } = useAppContext();
    const [permissions, setPermissions] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string>('');

    // Role-based permissions mapping
    const rolePermissions: Record<string, string[]> = {
        'super_admin': ['*'],
        'finance_processor': [
            'payment.initiate', 'payment.view', 'payment.batch',
            'claim.view', 'contribution.view'
        ],
        'finance_approver': [
            'payment.approve', 'payment.view', 'payment.authorize',
            'claim.view', 'contribution.view'
        ],
        'finance_recon': [
            'reconciliation.view', 'reconciliation.match', 'reconciliation.discrepancy',
            'payment.view', 'claim.view'
        ],
        'finance_auditor': [
            'audit.view', 'audit.export', 'report.financial',
            'payment.view', 'claim.view', 'contribution.view'
        ],
        'org_admin': [
            'org.manage', 'member.create', 'member.read', 'member.update', 'member.delete',
            'leader.assign', 'claim.view', 'claim.approve_operational',
            'payment.verify', 'report.view'
        ],
        'claims_manager': [
            'claim.read', 'claim.review', 'claim.approve', 'claim.advance',
            'claim.fraud_assessment', 'claim.report'
        ],
        'org_leader': [
            'member.read', 'payment.record', 'claim.record',
            'user.manage', 'notification.view', 'org.view_own'
        ],
        'member': [
            'profile.view', 'profile.update', 'claim.view_own',
            'payment.view_own', 'contribution.view_own'
        ]
    };

    // Role display names
    const roleDisplayNames: Record<string, string> = {
        'super_admin': 'Super Admin',
        'finance_processor': 'Finance Processor',
        'finance_approver': 'Finance Approver',
        'finance_recon': 'Finance Reconciliation',
        'finance_auditor': 'Finance Auditor',
        'org_admin': 'Organization Admin',
        'claims_manager': 'Claims Manager',
        'org_leader': 'Edir Leader',
        'member': 'Member'
    };

    // Role icon mapping
    const roleIcons: Record<string, any> = {
        'super_admin': 'Shield',
        'finance_processor': 'DollarSign',
        'finance_approver': 'Lock',
        'finance_recon': 'Receipt',
        'finance_auditor': 'AuditLogs',
        'org_admin': 'Building',
        'claims_manager': 'FileCheck',
        'org_leader': 'Users',
        'member': 'User'
    };

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setRole('');
            return;
        }

        const normalizedRole = user.role === 'edir_leader' ? 'org_leader' : user.role || '';
        setRole(normalizedRole);
        const userPermissions = rolePermissions[normalizedRole] || [];
        setPermissions(new Set(userPermissions));
        setLoading(false);
    }, [user]);

    const hasPermission = (permission: string): boolean => {
        if (!user) return false;
        if (user.role === 'super_admin') return true;
        if (permissions.has('*')) return true;
        return permissions.has(permission);
    };

    const canAccess = (resource: string, action: string): boolean => {
        return hasPermission(`${resource}.${action}`);
    };

    const canAccessTab = (tab: string): boolean => {
        if (!user) return false;
        if (isSuperAdmin) return true;
        switch (tab) {
            case 'dashboard':
            case 'claims':
            case 'notifications':
            case 'settings':
                return true;
            case 'members':
                return hasPermission('member.read') || isOrgAdmin || isClaimsManager || isOrgLeader;
            case 'contributions':
                return hasPermission('contribution.read') || isOrgAdmin || isOrgLeader || isFinance;
            case 'claims-review':
                return isClaimsManager;
            case 'transactions':
            case 'reports':
                return isOrgAdmin || isFinance;
            case 'finance':
                return isFinance;
            case 'reconciliation':
                return isFinanceRecon;
            case 'audit':
                return isFinanceAuditor;
            case 'organizations':
            case 'users':
                return false;
            default:
                return false;
        }
    };

    const getRoleDisplayName = (roleName: string): string => {
        return roleDisplayNames[roleName] || roleName;
    };

    const getRoleIcon = (roleName: string): string => {
        return roleIcons[roleName] || 'User';
    };

    // Role checks
    const isSuperAdmin = role === 'super_admin';
    const isFinance = ['finance_processor', 'finance_approver', 'finance_recon', 'finance_auditor'].includes(role);
    const isFinanceProcessor = role === 'finance_processor';
    const isFinanceApprover = role === 'finance_approver';
    const isFinanceRecon = role === 'finance_recon';
    const isFinanceAuditor = role === 'finance_auditor';
    const isOrgAdmin = role === 'org_admin';
    const isClaimsManager = role === 'claims_manager';
    const isOrgLeader = role === 'org_leader';
    const isMember = role === 'member';
    const userRole = role;

    return {
        hasPermission,
        canAccess,
        canAccessTab,
        permissions,
        loading,
        role,
        userRole,
        getRoleDisplayName,
        getRoleIcon,
        isSuperAdmin,
        isFinance,
        isFinanceProcessor,
        isFinanceApprover,
        isFinanceRecon,
        isFinanceAuditor,
        isOrgAdmin,
        isClaimsManager,
        isOrgLeader,
        isMember
    };
};