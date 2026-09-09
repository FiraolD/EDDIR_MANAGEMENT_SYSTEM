import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const AppFooter: React.FC = () => (
  <footer className="flex flex-col gap-2 border-t border-border/70 bg-background/60 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-8">
    <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><span>EddirConnect workspace</span></div>
    <div className="flex items-center gap-3"><span>Role-based access enabled</span><span aria-hidden="true">•</span><span>© {new Date().getFullYear()} EddirConnect</span></div>
  </footer>
);