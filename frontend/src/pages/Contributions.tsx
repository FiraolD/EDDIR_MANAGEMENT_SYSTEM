import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ArrowUpRight, 
  CheckCircle2,
  Clock,
  TrendingUp,
  PieChart as PieIcon,
  Download,
  Loader2
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { contributionsAPI, membersAPI } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Contribution {
  id: string;
  member_id: string;
  member_name: string;
  member_number: string;
  amount: number;
  payment_method: string;
  transaction_ref: string;
  status: string;
  contribution_date: string;
  notes: string;
}

export const Contributions: React.FC = () => {
  const { t, selectedOrganizationId } = useAppContext();
  const { userRole } = usePermissions();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileData, setReconcileData] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    this_month: 0,
    this_year: 0,
    pending: 0,
    confirmed: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  
  const [newContribution, setNewContribution] = useState({
    member_id: '',
    amount: '',
    payment_method: '',
    contribution_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchContributions = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      };
      if (selectedOrganizationId && userRole === 'super_admin') {
        params.organization_id = selectedOrganizationId;
      }
      const response = await contributionsAPI.getAll(params);
      setContributions(response.data.contributions || []);
      setStats(response.data.stats || { total: 0, this_month: 0, this_year: 0, pending: 0, confirmed: 0 });
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error: any) {
      console.error('Failed to fetch contributions:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch contributions');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const params: any = { limit: 100 };
      if (selectedOrganizationId && userRole === 'super_admin') {
        params.organization_id = selectedOrganizationId;
      }
      const response = await membersAPI.getAll(params);
      setMembers(response.data.members || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  useEffect(() => {
    fetchContributions();
    fetchMembers();
  }, [pagination.page, searchTerm, statusFilter, selectedOrganizationId]);

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContribution.member_id || !newContribution.amount || !newContribution.payment_method) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await contributionsAPI.create({
        ...newContribution,
        amount: parseFloat(newContribution.amount),
      });
      toast.success('Contribution recorded successfully');
      setIsAddModalOpen(false);
      setNewContribution({
        member_id: '',
        amount: '',
        payment_method: '',
        contribution_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchContributions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record contribution');
    }
  };

  const handleReconcile = async () => {
    try {
      const response = await contributionsAPI.reconcile({});
      setReconcileData(response.data);
      setIsReconcileModalOpen(true);
    } catch (error: any) {
      toast.error('Failed to reconcile contributions');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const canAddContribution = userRole === 'edir_leader' || userRole === 'org_admin' || userRole === 'super_admin';
  const canReconcile = userRole === 'finance' || userRole === 'super_admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-foreground">{t('financial_overview')}</h2>
          <p className="text-muted-foreground font-medium">{t('manage_contributions')}</p>
        </div>
        <div className="flex gap-3">
          {canReconcile && (
            <Button 
              variant="outline" 
              className="rounded-2xl border-2 font-bold h-12 text-primary border-primary/20 hover:border-primary/50"
              onClick={handleReconcile}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Reconcile
            </Button>
          )}
          <Button variant="outline" className="rounded-2xl border-2 font-bold h-12 text-primary border-primary/20 hover:border-primary/50">
            <Download className="w-4 h-4 mr-2" /> Report
          </Button>
          {canAddContribution && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl font-black h-12 shadow-lg shadow-primary/20 px-6 bg-primary hover:bg-primary/90">
                  <Plus className="w-5 h-5 mr-2" />
                  {t('record_payment')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl p-8">
                <form onSubmit={handleAddContribution}>
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Record Contribution</DialogTitle>
                    <DialogDescription className="font-medium">
                      Enter contribution details for a member.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 my-6">
                    <div className="space-y-2">
                      <Label className="font-bold">Member *</Label>
                      <Select 
                        value={newContribution.member_id} 
                        onValueChange={(v) => setNewContribution({...newContribution, member_id: v})}
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.full_name} ({member.member_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold">Amount (ETB) *</Label>
                        <Input
                          type="number"
                          value={newContribution.amount}
                          onChange={(e) => setNewContribution({...newContribution, amount: e.target.value})}
                          placeholder="500"
                          className="h-12 rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Payment Method *</Label>
                        <Select 
                          value={newContribution.payment_method} 
                          onValueChange={(v) => setNewContribution({...newContribution, payment_method: v})}
                        >
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="telebirr">Telebirr</SelectItem>
                            <SelectItem value="cbe_birr">CBE Birr</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Date</Label>
                      <Input
                        type="date"
                        value={newContribution.contribution_date}
                        onChange={(e) => setNewContribution({...newContribution, contribution_date: e.target.value})}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Notes</Label>
                      <Input
                        value={newContribution.notes}
                        onChange={(e) => setNewContribution({...newContribution, notes: e.target.value})}
                        placeholder="Optional notes"
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-12 rounded-xl font-black">
                      Record Payment
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-primary text-primary-foreground rounded-[2rem] overflow-hidden">
          <CardContent className="p-8 relative">
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="flex justify-between items-start relative z-10">
              <div className="p-3 rounded-2xl bg-white/20">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                <span>Total</span>
              </div>
            </div>
            <div className="mt-8 relative z-10">
              <p className="text-sm font-bold opacity-80 uppercase tracking-widest">All Time</p>
              <h3 className="text-4xl font-black mt-2">ETB {stats.total.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-secondary text-secondary-foreground rounded-[2rem] overflow-hidden">
          <CardContent className="p-8 relative">
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="mt-8 relative z-10">
              <p className="text-sm font-bold opacity-80 uppercase tracking-widest">{t('this_month')}</p>
              <h3 className="text-4xl font-black mt-2">ETB {stats.this_month.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card rounded-[2rem] overflow-hidden border border-border/50">
          <CardContent className="p-8">
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700">
                <Clock className="w-6 h-6" />
              </div>
              <Badge className="bg-amber-500 text-white border-none font-bold">Pending</Badge>
            </div>
            <div className="mt-8">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Pending</p>
              <h3 className="text-4xl font-black mt-2 text-foreground">ETB {stats.pending.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card rounded-[2rem] overflow-hidden border border-border/50">
          <CardContent className="p-8">
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-2xl bg-blue-100 text-blue-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="p-2 rounded-xl bg-muted/50">
                <PieIcon className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-8">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">This Year</p>
              <h3 className="text-4xl font-black mt-2 text-foreground">ETB {stats.this_year.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contributions Table */}
      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card border border-border/50">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between border-b border-muted/50 p-8 gap-6">
          <div>
            <CardTitle className="text-xl font-black">{t('recent_history')}</CardTitle>
            <CardDescription className="font-medium">All contribution records</CardDescription>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={t('search') + "..."} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-2xl bg-muted/30 border-none focus:bg-background transition-all" 
              />
            </div>
            <select 
              className="rounded-xl h-12 px-4 border-2 font-bold bg-transparent border-primary/20 text-primary cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/20 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <th className="px-8 py-5">{t('member')}</th>
                    <th className="px-8 py-5">{t('amount')}</th>
                    <th className="px-8 py-5">{t('date')}</th>
                    <th className="px-8 py-5">{t('method')}</th>
                    <th className="px-8 py-5">Reference</th>
                    <th className="px-8 py-5">{t('status')}</th>
                    <th className="px-8 py-5 text-right">{t('action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {contributions.map((item, idx) => (
                    <motion.tr 
                      key={item.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-muted/10 transition-colors group cursor-pointer h-20"
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-black text-primary">
                            {item.member_name?.charAt(0) || 'M'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{item.member_name}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.member_number}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className="font-black text-lg text-foreground">ETB {item.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-4">
                        <span className="font-medium text-muted-foreground">{new Date(item.contribution_date).toLocaleDateString()}</span>
                      </td>
                      <td className="px-8 py-4">
                        <Badge variant="outline" className="rounded-lg font-bold border-2 border-muted text-foreground capitalize">
                          {item.payment_method?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-8 py-4">
                        <code className="text-[10px] font-mono text-muted-foreground">{item.transaction_ref || 'N/A'}</code>
                      </td>
                      <td className="px-8 py-4">
                        <Badge className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm", getStatusColor(item.status))}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <Button variant="ghost" size="sm" className="rounded-xl font-bold hover:bg-primary/10 hover:text-primary">
                          Details
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-8 flex justify-between items-center border-t border-muted/50">
            <p className="text-sm font-bold text-muted-foreground">
              Showing {contributions.length} of {pagination.total} records
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                disabled={pagination.page === 1}
                onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                className="rounded-xl"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                className="rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconcile Dialog */}
      <Dialog open={isReconcileModalOpen} onOpenChange={setIsReconcileModalOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Contribution Reconciliation</DialogTitle>
            <DialogDescription>
              Summary of contributions for reconciliation.
            </DialogDescription>
          </DialogHeader>
          {reconcileData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-black text-green-600">ETB {reconcileData.summary.confirmed_amount?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-black text-amber-600">ETB {reconcileData.summary.pending_amount?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-black text-red-600">ETB {reconcileData.summary.failed_amount?.toLocaleString() || '0'}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-xl font-bold">{reconcileData.summary.total_count || 0}</p>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsReconcileModalOpen(false)} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};