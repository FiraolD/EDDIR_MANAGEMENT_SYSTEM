import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Wallet, FileText, History, Bell, Settings, Building, BarChart, CreditCard, ClipboardList } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { organizationsAPI } from '@/services/api';
import { toast } from 'sonner';
import { AppFooter } from '@/components/layout/AppFooter';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppNavItem, AppSidebar } from '@/components/layout/AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { t, theme, toggleTheme, language, setLanguage, user, logout, selectedOrganizationId, setSelectedOrganizationId } = useAppContext();
  const { canAccessTab, role, isSuperAdmin } = usePermissions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchOrgs = async () => {
      setLoadingOrgs(true);
      try {
        const response = await organizationsAPI.getAll({ limit: 100 });
        setOrganizations(response.data.organizations);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
        toast.error('Could not load organizations');
      } finally {
        setLoadingOrgs(false);
      }
    };
    fetchOrgs();
  }, [isSuperAdmin]);

  const handleOrganizationSwitch = (orgId: string | null) => {
    setSelectedOrganizationId(orgId);
    const orgName = orgId ? organizations.find((org) => org.id === orgId)?.name : 'All Organizations';
    toast.success(`Switched to ${orgName}`);
  };

  const getNavItems = (): AppNavItem[] => {
    const items: AppNavItem[] = [{ id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard }];
    if (canAccessTab('members')) items.push({ id: 'members', label: t('members'), icon: Users });
    if (canAccessTab('contributions')) items.push({ id: 'contributions', label: t('contributions'), icon: Wallet });
    items.push({ id: 'claims', label: t('claims'), icon: FileText });
    if (canAccessTab('claims-review')) items.push({ id: 'claims-review', label: 'Claims Review', icon: ClipboardList });
    if (canAccessTab('transactions')) items.push({ id: 'transactions', label: 'Ledger', icon: History });
    if (canAccessTab('finance')) items.push({ id: 'finance', label: 'Finance', icon: CreditCard });
    if (canAccessTab('reports')) items.push({ id: 'reports', label: 'Reports', icon: BarChart });
    if (canAccessTab('organizations')) {
      items.push({ id: 'organizations', label: 'Organizations', icon: Building });
    }
    items.push({ id: 'notifications', label: t('notifications'), icon: Bell });
    items.push({ id: 'settings', label: t('settings'), icon: Settings });
    return items;
  };

  const navItems = getNavItems();
  const handleLogout = async () => { await logout(); };
  const getInitials = (name: string) => name ? name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) : '??';
  const getRoleBadge = () => {
    switch (role) {
      case 'super_admin': return { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' };
      case 'org_admin': return { label: 'Org Admin', color: 'bg-indigo-100 text-indigo-700' };
      case 'claims_manager': return { label: 'Claims Manager', color: 'bg-cyan-100 text-cyan-700' };
      case 'finance_processor': return { label: 'Finance Processor', color: 'bg-emerald-100 text-emerald-700' };
      case 'finance_approver': return { label: 'Finance Approver', color: 'bg-teal-100 text-teal-700' };
      case 'finance_recon': return { label: 'Finance Recon', color: 'bg-blue-100 text-blue-700' };
      case 'finance_auditor': return { label: 'Finance Auditor', color: 'bg-rose-100 text-rose-700' };
      case 'org_leader': return { label: 'Edir Leader', color: 'bg-blue-100 text-blue-700' };
      default: return { label: 'Member', color: 'bg-gray-100 text-gray-700' };
    }
  };
  const roleBadge = getRoleBadge();
  const sidebar = <AppSidebar collapsed={isSidebarCollapsed} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onToggle={() => setIsSidebarCollapsed((collapsed) => !collapsed)} onNavigate={() => setIsSidebarOpen(false)} />;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-background md:flex-row">
      <aside className="hidden shrink-0 md:flex">{sidebar}</aside>
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}><SheetContent side="left" className="w-72 p-0"><AppSidebar collapsed={false} navItems={navItems} activeTab={activeTab} setActiveTab={setActiveTab} onToggle={() => setIsSidebarCollapsed((collapsed) => !collapsed)} onNavigate={() => setIsSidebarOpen(false)} /></SheetContent></Sheet>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader title={t(activeTab)} isSuperAdmin={isSuperAdmin} user={user} roleBadge={roleBadge} organizations={organizations} loadingOrgs={loadingOrgs} selectedOrganizationId={selectedOrganizationId} language={language} theme={theme} setLanguage={setLanguage} toggleTheme={toggleTheme} setActiveTab={setActiveTab} handleOrganizationSwitch={handleOrganizationSwitch} handleLogout={handleLogout} getInitials={getInitials} onMobileMenu={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-muted/20 pb-24 md:pb-8"><div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div><AppFooter /></main>
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 px-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden">
          {navItems.slice(0, 5).map((item) => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => setActiveTab(item.id)} className={cn('flex h-full min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-300', activeTab === item.id ? 'text-primary' : 'text-muted-foreground')}><div className={cn('rounded-lg p-1', activeTab === item.id && 'bg-primary/10')}><Icon className="h-6 w-6" /></div><span className="text-[10px] font-bold">{item.label}</span></button>; })}
        </nav>
      </div>
    </div>
  );
};
