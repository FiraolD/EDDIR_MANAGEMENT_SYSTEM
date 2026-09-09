import React from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppSidebarFooter } from '@/components/layout/AppSidebarFooter';

export interface AppNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppSidebarProps {
  collapsed: boolean;
  navItems: AppNavItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggle: () => void;
  onNavigate?: () => void;
}

const LOGO_URL = '/awash_logo.jpg';

export const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, navItems, activeTab, setActiveTab, onToggle, onNavigate }) => (
  <aside className={cn('group/sidebar flex h-full flex-col border-r border-border/80 bg-card shadow-[4px_0_24px_-20px_rgba(0,0,0,0.35)] transition-[width] duration-300 ease-in-out', collapsed ? 'w-20' : 'w-64')}>
    <div className={cn('relative flex h-20 shrink-0 items-center border-b border-border/70 bg-gradient-to-b from-primary/[0.04] to-transparent', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <img src={LOGO_URL} alt="Awash Logo" className="h-10 w-10 rounded-xl bg-white p-1 shadow-sm ring-1 ring-border/60 transition-transform duration-300 group-hover/sidebar:scale-105" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" aria-label="Workspace online" />
        </div>
        {!collapsed && <div className="flex min-w-0 flex-col"><span className="truncate text-lg font-black leading-tight tracking-tight text-primary">EddirConnect</span><span className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">SMART Insurance</span></div>}
      </div>
      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={onToggle} className={cn('h-9 w-9 shrink-0 rounded-xl text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary', collapsed && 'absolute left-[3.65rem] top-5 z-10 bg-card shadow-md ring-1 ring-border/70')} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}<span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span></Button></TooltipTrigger><TooltipContent side="right">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent></Tooltip></TooltipProvider>
    </div>
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const link = <button type="button" onClick={() => { setActiveTab(item.id); onNavigate?.(); }} className={cn('group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-left transition-all duration-200 hover:translate-x-0.5', collapsed ? 'justify-center' : 'justify-start', isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}><span className={cn('absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary transition-transform duration-200', isActive ? 'scale-y-100' : 'scale-y-0')} /><Icon className={cn('h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110', isActive ? 'text-primary-foreground' : 'group-hover:text-primary')} />{!collapsed && <span className="truncate text-sm font-semibold">{item.label}</span>}</button>;
        return collapsed ? <TooltipProvider key={item.id}><Tooltip delayDuration={200}><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right" className="rounded-lg">{item.label}</TooltipContent></Tooltip></TooltipProvider> : <React.Fragment key={item.id}>{link}</React.Fragment>;
      })}
    </nav>
    <AppSidebarFooter collapsed={collapsed} />
  </aside>
);