import React, { useEffect, useState } from 'react';
import { Building, CalendarDays, ChevronDown, Clock3, Globe, Menu, Moon, Sun, UserCog, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface AppHeaderProps {
  title: string;
  isSuperAdmin: boolean;
  user: { fullName?: string; email?: string; organizationName?: string } | null;
  roleBadge: { label: string; color: string };
  organizations: Array<{ id: string; name: string }>;
  loadingOrgs: boolean;
  selectedOrganizationId: string | null;
  language: string;
  theme: string;
  setLanguage: (language: 'en' | 'am' | 'ao') => void;
  toggleTheme: () => void;
  setActiveTab: (tab: string) => void;
  handleOrganizationSwitch: (orgId: string | null) => void;
  handleLogout: () => void;
  getInitials: (name: string) => string;
  onMobileMenu: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, isSuperAdmin, user, roleBadge, organizations, loadingOrgs, selectedOrganizationId, language, theme, setLanguage, toggleTheme, setActiveTab, handleOrganizationSwitch, handleLogout, getInitials, onMobileMenu }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : language === 'ao' ? 'om-ET' : 'en-ET', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : language === 'ao' ? 'om-ET' : 'en-ET', {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  }).format(now);

  return (
  <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-2 backdrop-blur-md md:px-8">
    <div className="flex items-center gap-3"><Button type="button" variant="ghost" size="icon" onClick={onMobileMenu} className="rounded-xl md:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></Button><h1 className="hidden text-lg font-bold capitalize text-foreground sm:block">{title}</h1></div>
    <div className="flex items-center gap-1 md:gap-3">
      <div className="hidden items-center gap-3 border-r border-border pr-3 text-muted-foreground lg:flex">
        <div className="flex items-center gap-1.5 text-xs font-medium"><CalendarDays className="h-3.5 w-3.5 text-primary" />{dateLabel}</div>
        <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums"><Clock3 className="h-3.5 w-3.5 text-primary" />{timeLabel}</div>
      </div>
      {isSuperAdmin ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="gap-2 rounded-xl border-2 border-primary/20"><Building className="h-4 w-4" /><span className="hidden max-w-40 truncate sm:inline">{loadingOrgs ? 'Loading...' : organizations.find((org) => org.id === selectedOrganizationId)?.name || 'All Organizations'}</span><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-h-60 w-56 overflow-y-auto rounded-xl"><DropdownMenuLabel>Switch Organization</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleOrganizationSwitch(null)}>All Organizations</DropdownMenuItem>{organizations.map((org) => <DropdownMenuItem key={org.id} onClick={() => handleOrganizationSwitch(org.id)}>{org.name}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu> : user?.organizationName ? <div className="hidden items-center gap-2 rounded-xl bg-muted/30 px-3 py-1.5 sm:flex"><Building className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{user.organizationName}</span></div> : null}
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5" aria-label="Select language"><Globe className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="rounded-xl">{([['en', 'English'], ['am', 'አማርኛ'], ['ao', 'Afaan Oromoo']] as const).map(([value, label]) => <DropdownMenuItem key={value} onClick={() => setLanguage(value)} className={cn('rounded-lg font-medium', language === value && 'bg-primary text-primary-foreground')}>{label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
      <Button type="button" variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl hover:bg-primary/5" aria-label="Toggle theme">{theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</Button>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 gap-2 rounded-xl pl-2 pr-1 md:gap-3 md:pl-3"><span className="hidden flex-col items-end text-right sm:flex"><span className="text-sm font-bold leading-none">{user?.fullName}</span><span className={cn('mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium', roleBadge.color)}>{roleBadge.label}</span></span><Avatar className="h-9 w-9 rounded-xl bg-primary text-primary-foreground"><AvatarFallback className="rounded-xl bg-primary font-black text-white">{getInitials(user?.fullName || 'User')}</AvatarFallback></Avatar></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56 rounded-xl"><DropdownMenuLabel className="font-normal"><div className="flex flex-col space-y-1"><p className="text-sm font-medium leading-none">{user?.fullName}</p><p className="text-xs leading-none text-muted-foreground">{user?.email}</p><p className="text-[10px] font-medium text-primary">{roleBadge.label}</p></div></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setActiveTab('settings')}><UserCog className="mr-2 h-4 w-4" />Profile Settings</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
  </header>
  );
};