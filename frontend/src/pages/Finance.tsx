import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Loader2,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { motion } from 'framer-motion';

interface Transaction {
  id: string;
  transaction_number: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  member_name: string;
  member_number: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  transaction_date: string;
  reference?: string;
}

interface PendingApproval {
  id: string;
  claim_number: string;
  member_name: string;
  amount: number;
  status: string;
  requested_at: string;
  requester_name: string;
}

export const Finance: React.FC = () => {
  const { t, user } = useAppContext();
  const { hasPermission, isSuperAdmin, isFinanceApprover, isFinanceProcessor, isFinanceRecon } = usePermissions();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({
    total_inflow: 0,
    total_outflow: 0,
    pending_approvals: 0,
    failed_transactions: 0
  });

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/transactions', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm || undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined
        }
      });
      setTransactions(response.data.transactions || []);
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error: any) {
      console.error('Fetch transactions error:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await api.get('/finance/pending-approvals');
      setPendingApprovals(response.data.pendingApprovals || []);
      setStats(prev => ({
        ...prev,
        pending_approvals: response.data.pendingApprovals?.length || 0
      }));
    } catch (error) {
      console.error('Fetch pending approvals error:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/transactions/stats');
      setStats(prev => ({
        ...prev,
        total_inflow: response.data.total_inflow || 0,
        total_outflow: response.data.total_outflow || 0,
        failed_transactions: response.data.failed_transactions || 0
      }));
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchPendingApprovals();
    fetchStats();
  }, [pagination.page, searchTerm, filterStatus]);

  const handleApprovePayment = async (transactionId: string) => {
    try {
      await api.post(`/finance/approve-payment/${transactionId}`, {
        comments: approvalComments
      });
      toast.success('Payment approved successfully');
      setIsApproveDialogOpen(false);
      setApprovalComments('');
      fetchTransactions();
      fetchPendingApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve payment');
    }
  };

  const handleRejectPayment = async (transactionId: string) => {
    try {
      await api.post(`/finance/reject-payment/${transactionId}`, {
        comments: approvalComments
      });
      toast.success('Payment rejected');
      setIsApproveDialogOpen(false);
      setApprovalComments('');
      fetchTransactions();
      fetchPendingApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject payment');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/transactions/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export started');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'credit' ? TrendingUp : TrendingDown;
  };

  const canApprove = isFinanceApprover || isSuperAdmin;
  const canProcess = isFinanceProcessor || isSuperAdmin;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Finance Module</h2>
          <p className="text-muted-foreground font-medium">Manage payments, approvals, and financial operations.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl border-2 font-bold h-12" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" className="rounded-2xl border-2 font-bold h-12" onClick={() => {
            fetchTransactions();
            fetchPendingApprovals();
            toast.info('Refreshed');
          }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Inflow</p>
                <h3 className="text-2xl font-black">ETB {stats.total_inflow.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-100">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Outflow</p>
                <h3 className="text-2xl font-black">ETB {stats.total_outflow.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending Approvals</p>
                <h3 className="text-2xl font-black">{stats.pending_approvals}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-100">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Failed Transactions</p>
                <h3 className="text-2xl font-black">{stats.failed_transactions}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      {(canApprove || isFinanceRecon) && pendingApprovals.length > 0 && (
        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-amber-50/50 border-2 border-amber-200/50">
          <CardHeader className="p-6 border-b border-amber-200/50">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-600" />
              <CardTitle className="text-xl font-black">Pending Approvals ({pendingApprovals.length})</CardTitle>
              <CardDescription>Actions requiring your review</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-100/30">
                    <TableHead>Claim</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((item) => (
                    <TableRow key={item.id} className="hover:bg-amber-50/50">
                      <TableCell>
                        <span className="font-mono text-sm">{item.claim_number}</span>
                      </TableCell>
                      <TableCell className="font-medium">{item.member_name}</TableCell>
                      <TableCell className="font-bold">ETB {item.amount.toLocaleString()}</TableCell>
                      <TableCell>{item.requester_name}</TableCell>
                      <TableCell>{new Date(item.requested_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => {
                            setApprovalComments('');
                            setIsApproveDialogOpen(true);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-card">
        <CardHeader className="p-6 border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-12 h-12 rounded-2xl bg-muted/20 border-none focus:bg-background transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-12 rounded-xl">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-12 rounded-xl">
                <Filter className="w-4 h-4 mr-2" />
                Filter
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
                  <TableRow className="bg-muted/20">
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => {
                    const TypeIcon = getTypeIcon(txn.type);
                    return (
                      <TableRow key={txn.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {txn.transaction_number}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{txn.member_name || 'System'}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "rounded-full px-2 py-1",
                            txn.type === 'credit' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {txn.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold">
                          ETB {txn.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{txn.payment_method?.replace('_', ' ') || 'N/A'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("rounded-full", getStatusColor(txn.status))}>
                            {txn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(txn.transaction_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedTransaction(txn);
                                setIsViewDetailsOpen(true);
                              }}>
                                View Details
                              </DropdownMenuItem>
                              {canApprove && txn.status === 'pending' && (
                                <DropdownMenuItem onClick={() => {
                                  setSelectedTransaction(txn);
                                  setIsApproveDialogOpen(true);
                                }}>
                                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination({...pagination, page: pagination.page - 1})}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({...pagination, page: pagination.page + 1})}
              className="rounded-xl"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{selectedTransaction.transaction_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={cn("rounded-full", getStatusColor(selectedTransaction.status))}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">ETB {selectedTransaction.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge className={cn(
                    "rounded-full",
                    selectedTransaction.type === 'credit' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {selectedTransaction.type}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Member</p>
                  <p className="font-medium">{selectedTransaction.member_name || 'System'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p>{new Date(selectedTransaction.transaction_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{selectedTransaction.description}</p>
              </div>
              {selectedTransaction.reference && (
                <div>
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="text-sm font-mono">{selectedTransaction.reference}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Review Transaction</DialogTitle>
            <DialogDescription>
              Approve or reject this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTransaction && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">ETB {selectedTransaction.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member</span>
                  <span>{selectedTransaction.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-sm">{selectedTransaction.transaction_number}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Add comments for this transaction..."
                className="rounded-xl"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTransaction && handleRejectPayment(selectedTransaction.id)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => selectedTransaction && handleApprovePayment(selectedTransaction.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};