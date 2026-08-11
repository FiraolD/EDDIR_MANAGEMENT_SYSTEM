import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  FileText, 
  History, 
  Bell, 
  Settings, 
  Menu, 
  LogOut,
  Globe,
  Sun,
  Moon,
  Building,
  ChevronDown,
  Shield,
  UserCog,
  BarChart
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { organizationsAPI } from '@/services/api';
import { toast } from 'sonner';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const LOGO_URL = "/awash_logo.jpg"; // or your logo path

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { t, theme, toggleTheme, language, setLanguage, user, logout, selectedOrganizationId, setSelectedOrganizationId } = useAppContext();
  const { userRole } = usePermissions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  
   useEffect(() => {
    if (userRole === 'super_admin') {
      const fetchOrgs = async () => {
        setLoadingOrgs(true);
        try {
          const response = await organizationsAPI.getAll({ limit: 100 });
          setOrganizations(response.data.organizations);
          // If no organization is selected, default to null (All Organizations)
          if (!selectedOrganizationId && response.data.organizations.length > 0) {
            // Leave null – means "All Organizations"
          }
        } catch (error) {
          console.error('Failed to fetch organizations:', error);
          toast.error('Could not load organizations');
        } finally {
          setLoadingOrgs(false);
        }
      };
      fetchOrgs();
    }
  }, [userRole]);

  const handleOrganizationSwitch = (orgId: string | null) => {
    setSelectedOrganizationId(orgId);
    const orgName = orgId ? organizations.find(o => o.id === orgId)?.name : 'All Organizations';
    toast.success(`Switched to ${orgName}`);
  };

  // Role-based navigation items
  const getNavItems = () => {
    const items: { id: string; label: string; icon: any; roles: string[] }[] = [];
    
    items.push({ id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, roles: ['super_admin', 'org_admin', 'edir_leader', 'finance'] });
    
    if (userRole === 'edir_leader' || userRole === 'org_admin' || userRole === 'super_admin') {
      items.push({ id: 'members', label: t('members'), icon: Users, roles: ['super_admin', 'org_admin', 'edir_leader'] });
    }
    
    items.push({ id: 'contributions', label: t('contributions'), icon: Wallet, roles: ['super_admin', 'org_admin', 'edir_leader', 'finance'] });
    items.push({ id: 'claims', label: t('claims'), icon: FileText, roles: ['super_admin', 'org_admin', 'edir_leader', 'finance'] });
    
    if (userRole === 'org_admin' || userRole === 'super_admin' || userRole === 'finance') {
      items.push({ id: 'transactions', label: 'Ledger', icon: History, roles: ['super_admin', 'org_admin', 'finance'] });
    }
    
    if (userRole === 'org_admin' || userRole === 'super_admin' || userRole === 'finance') {
      items.push({ id: 'reports', label: 'Reports', icon: BarChart, roles: ['super_admin', 'org_admin', 'finance'] });
    }
    
    if (userRole === 'super_admin') {
      items.push({ id: 'organizations', label: 'Organizations', icon: Building, roles: ['super_admin'] });
    }
    
    items.push({ id: 'notifications', label: t('notifications'), icon: Bell, roles: ['super_admin', 'org_admin', 'edir_leader', 'finance'] });
    items.push({ id: 'settings', label: t('settings'), icon: Settings, roles: ['super_admin', 'org_admin', 'edir_leader', 'finance'] });
    
    return items;
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = () => {
    switch (userRole) {
      case 'super_admin':
        return { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' };
      case 'org_admin':
        return { label: 'Org Admin', color: 'bg-indigo-100 text-indigo-700' };
      case 'finance':
        return { label: 'Finance', color: 'bg-green-100 text-green-700' };
      case 'edir_leader':
        return { label: 'Edir Leader', color: 'bg-blue-100 text-blue-700' };
      default:
        return { label: 'Member', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const roleBadge = getRoleBadge();

  const NavContent = () => (
    <div className="flex flex-col h-full py-4">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Awash Logo" className="w-10 h-10 rounded-xl shadow-sm bg-white p-1" />
          <div className="flex flex-col">
            <span className="font-black text-lg leading-tight tracking-tight text-primary">EddirConnect</span>
            <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-secondary"></span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <TooltipProvider key={item.id}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                    activeTab === item.id 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {activeTab === item.id && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute inset-0 bg-primary rounded-xl -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <item.icon className={cn("w-5 h-5 transition-colors", activeTab === item.id ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                  <span className="font-semibold text-sm">{item.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="rounded-xl">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </nav>

      <div className="px-4 mt-auto space-y-2">
        <div className="p-3 rounded-xl bg-muted/30 mb-2">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <AvatarFallback className="rounded-xl bg-primary text-white font-black">
                {getInitials(user?.fullName || 'User')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user?.fullName}</p>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", roleBadge.color)}>
                  {roleBadge.label}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="font-semibold">{t('logout')}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col shrink-0">
        <NavContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold capitalize hidden sm:block text-foreground">
              {t(activeTab)}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
       {userRole === 'super_admin' && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl border-2 border-primary/20">
          <Building className="w-4 h-4" />
          <span className="hidden sm:inline">
            {loadingOrgs ? 'Loading...' : organizations.find(o => o.id === selectedOrganizationId)?.name || 'All Organizations'}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl w-56 max-h-60 overflow-y-auto">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn("cursor-pointer", selectedOrganizationId === null && "bg-primary/10 text-primary font-semibold")}
          onClick={() => handleOrganizationSwitch(null)}
        >
          All Organizations
        </DropdownMenuItem>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            className={cn("cursor-pointer", selectedOrganizationId === org.id && "bg-primary/10 text-primary font-semibold")}
            onClick={() => handleOrganizationSwitch(org.id)}
          >
            {org.name}
          </DropdownMenuItem>
        ))}
        {organizations.length === 0 && !loadingOrgs && (
          <DropdownMenuItem disabled>No organizations found</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )}

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5">
                  <Globe className="w-5 h-5 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem 
                  onClick={() => setLanguage('en')} 
                  className={cn("rounded-lg font-medium cursor-pointer", language === 'en' ? 'bg-primary text-primary-foreground' : '')}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('am')} 
                  className={cn("rounded-lg font-medium cursor-pointer", language === 'am' ? 'bg-primary text-primary-foreground' : '')}
                >
                  አማርኛ
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('ao')} 
                  className={cn("rounded-lg font-medium cursor-pointer", language === 'ao' ? 'bg-primary text-primary-foreground' : '')}
                >
                  Afaan Oromoo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl hover:bg-primary/5">
              {theme === 'light' ? <Moon className="w-5 h-5 text-foreground" /> : <Sun className="w-5 h-5 text-foreground" />}
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-border cursor-pointer">
                  <div className="hidden sm:flex flex-col items-end text-right">
                    <span className="text-sm font-bold leading-none text-foreground">{user?.fullName}</span>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full mt-1", roleBadge.color)}>
                      {roleBadge.label}
                    </span>
                  </div>
                  <Avatar className="w-9 h-9 rounded-xl bg-primary text-primary-foreground">
                    <AvatarFallback className="rounded-xl bg-primary text-white font-black">
                      {getInitials(user?.fullName || 'User')}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => setActiveTab('settings')}>
                  <UserCog className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-muted/20">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-xl border-t border-border px-1 py-1 flex justify-around items-center h-16 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-300 min-w-[64px] h-full",
                activeTab === item.id ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1 rounded-lg transition-all",
                activeTab === item.id ? "bg-primary/10" : ""
              )}>
                <item.icon className={cn("w-6 h-6", activeTab === item.id && "fill-primary/10")} />
              </div>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};