import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Search, 
  Calendar, 
  ArrowUpRight,
  ArrowLeftRight,
  ArrowDownRight,
  MoreHorizontal,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { transactionsAPI } from '@/services/api';

interface Transaction {
  id: string;
  transaction_number: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  member_name: string;
  member_number: string;
  payment_method: string;
  status: string;
  description: string;
  transaction_date: string;
}

export const Transactions: React.FC = () => {
  const { t, selectedOrganizationId } = useAppContext();
  const { userRole } = usePermissions();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_inflow: 0,
    total_outflow: 0,
    net_movement: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        type: typeFilter || undefined,
      };
      if (selectedOrganizationId) {
        params.organization_id = selectedOrganizationId;
      }
      const response = await transactionsAPI.getAll(params);
      setTransactions(response.data.transactions);
      setStats(response.data.stats);
      setPagination(response.data.pagination);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, searchTerm, typeFilter, selectedOrganizationId]);

  const handleExport = async () => {
    try {
      const response = await transactionsAPI.export();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Ledger exported successfully');
    } catch (error) {
      toast.error('Failed to export ledger');
    }
  };

  const handleReconcile = async () => {
    try {
      await transactionsAPI.reconcile();
      toast.success('Reconciliation completed successfully');
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to reconcile');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      contribution: 'bg-green-100 text-green-700',
      claim_payout: 'bg-red-100 text-red-700',
      registration: 'bg-blue-100 text-blue-700',
      service_fee: 'bg-purple-100 text-purple-700',
      utility: 'bg-orange-100 text-orange-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const canReconcile = userRole === 'finance' || userRole === 'super_admin';
  const canExport = userRole === 'finance' || userRole === 'org_admin' || userRole === 'super_admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">{t('transaction_ledger')}</h2>
          <p className="text-muted-foreground font-medium">{t('audit_trail')}</p>
        </div>
        <div className="flex gap-3">
          {canReconcile && (
            <Button 
              variant="outline" 
              className="rounded-2xl border-2 font-bold h-12 text-primary border-primary/20 hover:border-primary/50"
              onClick={handleReconcile}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Reconcile Ledger
            </Button>
          )}
          {canExport && (
            <Button 
              onClick={handleExport} 
              className="rounded-2xl font-black h-12 shadow-lg shadow-primary/20 px-6 bg-primary text-white hover:bg-primary/90"
            >
              <Download className="w-5 h-5 mr-2" />
              {t('export_csv')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-blue-50">
              <ArrowUpRight className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Inflow</p>
              <h3 className="text-2xl font-black tracking-tighter text-foreground">ETB {stats.total_inflow.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-red-50">
              <ArrowDownRight className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Outflow</p>
              <h3 className="text-2xl font-black tracking-tighter text-foreground">ETB {stats.total_outflow.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-primary/5">
              <ArrowLeftRight className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Net Movement</p>
              <h3 className="text-2xl font-black tracking-tighter text-foreground">ETB {stats.net_movement.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card border border-border/50">
        <CardHeader className="p-8 border-b border-muted/50">
          <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by ID, Member, or Category..." 
                className="pl-12 h-14 rounded-2xl bg-muted/30 border-none focus:bg-background transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <select 
                className="rounded-2xl h-14 px-6 border-2 font-bold bg-transparent border-primary/20 text-primary cursor-pointer"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="credit">Credit (Inflow)</option>
                <option value="debit">Debit (Outflow)</option>
              </select>
              <Button variant="outline" className="rounded-2xl h-14 border-2 font-bold px-6 gap-3 border-primary/20 text-primary">
                <Calendar className="w-4 h-4" />
                Date Range
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20 border-none h-14 font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                    <TableHead className="px-8">Txn ID</TableHead>
                    <TableHead>{t('member')}</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>{t('amount')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right px-8">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, idx) => (
                    <motion.tr 
                      key={txn.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group border-border/50 hover:bg-muted/10 transition-colors h-20"
                    >
                      <TableCell className="px-8">
                        <code className="text-[10px] bg-muted px-2 py-1 rounded-lg font-black font-mono uppercase text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {txn.transaction_number}
                        </code>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        <div>
                          {txn.member_name}
                          <div className="text-[10px] text-muted-foreground">{txn.member_number}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-lg font-bold text-[10px] uppercase tracking-tighter", getCategoryColor(txn.category))}>
                          {txn.category.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 font-black text-lg tracking-tighter">
                            {txn.type === 'credit' ? (
                              <span className="text-blue-600">+ ETB {txn.amount.toLocaleString()}</span>
                            ) : (
                              <span className="text-red-600">- ETB {txn.amount.toLocaleString()}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">{txn.description?.substring(0, 30)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-muted-foreground">
                        {new Date(txn.transaction_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg border-2 font-bold capitalize">
                          {txn.payment_method?.replace('_', ' ') || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
                          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            Page {pagination.page} of {pagination.totalPages} • {pagination.total} entries
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="rounded-xl h-11 border-2 font-bold px-6 text-primary border-primary/20"
              disabled={pagination.page === 1}
              onClick={() => setPagination({...pagination, page: pagination.page - 1})}
            >
              Previous
            </Button>
            <div className="flex items-center bg-muted/30 p-1 rounded-xl">
              <Button 
                size="sm" 
                className={cn("rounded-lg w-9 h-9 font-black", pagination.page === 1 && "bg-primary text-white")}
                variant={pagination.page === 1 ? "default" : "ghost"}
                onClick={() => setPagination({...pagination, page: 1})}
              >
                1
              </Button>
              {pagination.totalPages >= 2 && (
                <Button 
                  size="sm" 
                  variant={pagination.page === 2 ? "default" : "ghost"}
                  className={cn("rounded-lg w-9 h-9 font-black", pagination.page === 2 && "bg-primary text-white")}
                  onClick={() => setPagination({...pagination, page: 2})}
                >
                  2
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              className="rounded-xl h-11 border-2 font-bold px-6 text-primary border-primary/20"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({...pagination, page: pagination.page + 1})}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};