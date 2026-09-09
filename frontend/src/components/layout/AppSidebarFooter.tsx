import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppSidebarFooterProps {
  collapsed: boolean;
}

export const AppSidebarFooter: React.FC<AppSidebarFooterProps> = ({ collapsed }) => (
  <footer className={cn('mt-auto border-t border-border/70 p-4', collapsed && 'px-2')}>
    <div className={cn('flex items-center gap-2 text-muted-foreground', collapsed ? 'justify-center' : 'px-2')}>
      <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
      {!collapsed && <span className="text-[11px] font-medium tracking-wide">Secure workspace</span>}
    </div>
  </footer>
);