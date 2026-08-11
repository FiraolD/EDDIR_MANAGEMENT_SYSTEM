import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart } from 'lucide-react';

export const Reports: React.FC = () => {
  const { t } = useAppContext();
  const { userRole } = usePermissions();

  const canExport = userRole === 'super_admin' || userRole === 'org_admin' || userRole === 'finance';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Reports</h2>
          <p className="text-muted-foreground font-medium">Generate and download financial and operational reports.</p>
        </div>
        {canExport && (
          <Button className="rounded-2xl font-black h-12 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
            <Download className="w-5 h-5 mr-2" />
            Generate Report
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl rounded-3xl cursor-pointer hover:shadow-2xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Member Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">List of all members with their status and contribution totals.</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl rounded-3xl cursor-pointer hover:shadow-2xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-primary" />
              Contribution Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Monthly contribution trends and totals.</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl rounded-3xl cursor-pointer hover:shadow-2xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Claim Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Claim statuses, amounts, and payout tracking.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};