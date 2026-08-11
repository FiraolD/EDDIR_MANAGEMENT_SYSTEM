import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ChevronRight, 
  AlertTriangle,
  FileText,
  User,
  ShieldCheck,
  CreditCard,
  Plus,
  Info,
  Loader2,
  Clock
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { claimsAPI, membersAPI } from '@/services/api';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Claim {
  id: string;
  claim_number: string;
  member_id: string;
  member_name: string;
  member_number: string;
  deceased_name: string;
  relationship: string;
  date_of_death: string;
  date_reported: string;
  amount: number;
  status: string;
  priority: string;
  documents: string[];
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
}

const workflowSteps = [
  { id: 'reported', label: 'Reported', icon: AlertTriangle, color: 'text-amber-500' },
  { id: 'leader_approved', label: 'Leader Approval', icon: User, color: 'text-indigo-500' },
  { id: 'admin_approved', label: 'Admin Approval', icon: ShieldCheck, color: 'text-primary' },
  { id: 'processing', label: 'Payout Processing', icon: CreditCard, color: 'text-secondary' },
  { id: 'paid', label: 'Paid', icon: CheckCircle2, color: 'text-blue-500' },
];

export const Claims: React.FC = () => {
  const { t, selectedOrganizationId } = useAppContext();
  const { userRole } = usePermissions();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_payout: 0,
    paid_this_month: 0,
  });
  // ✅ Added pagination state (was missing)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  
  const [newClaim, setNewClaim] = useState({
    member_id: '',
    deceased_name: '',
    relationship: '',
    date_of_death: new Date().toISOString().split('T')[0],
    amount: '',
    notes: '',
  });

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, limit: pagination.limit };
      // ✅ Only send organization_id if user is Super Admin
      if (selectedOrganizationId && userRole === 'super_admin') {
        params.organization_id = selectedOrganizationId;
      }
      const response = await claimsAPI.getAll(params);
      const claims = (response.data.claims || []).map((claim: any) => ({
        ...claim,
        status: claim.status || claim.claim_status,
      }));
      setClaims(claims);
      setStats(response.data.stats || { total: 0, pending: 0, in_payout: 0, paid_this_month: 0 });
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (error: any) {
      console.error('Failed to fetch claims:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const params: any = { limit: 100 };
      // ✅ Only send organization_id if user is Super Admin
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
    fetchClaims();
    fetchMembers();
  }, [selectedOrganizationId]);

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaim.member_id || !newClaim.deceased_name || !newClaim.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await claimsAPI.create({
        ...newClaim,
        amount: parseFloat(newClaim.amount),
      });
      toast.success('Claim reported successfully');
      setIsAddModalOpen(false);
      setNewClaim({
        member_id: '',
        deceased_name: '',
        relationship: '',
        date_of_death: new Date().toISOString().split('T')[0],
        amount: '',
        notes: '',
      });
      fetchClaims();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to report claim');
    }
  };
/*
  const handleAdvanceClaim = async (id: string) => {
    const claim = claims.find(c => c.id === id);
    if (!claim) return;

    if (userRole === 'finance' && claim.status === 'processing') {
      if (!window.confirm('Confirm payout completion. Mark this claim as paid?')) return;
      try {
        await claimsAPI.pay(id);
        toast.success('Claim marked as paid');
        fetchClaims();
        return;
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to mark claim as paid');
        return;
      }
    }

    try {
      const response = await claimsAPI.advance(id);
      toast.success(`Claim advanced to ${response.data.status.replace('_', ' ')}`);
      fetchClaims();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to advance claim');
    }
  }; */
const [refreshKey, setRefreshKey] = useState(0);
const handleAdvanceClaim = async (id: string) => {
  const claimIndex = claims.findIndex(c => c.id === id);
  if (claimIndex === -1) return;

  const currentStep = getStatusStep(claims[claimIndex].status);
  const nextStep = workflowSteps[currentStep + 1];
  if (!nextStep) {
    toast.error('Cannot advance further');
    return;
  }

  // Optimistic update
  const optimisticClaims = [...claims];
  optimisticClaims[claimIndex] = { ...optimisticClaims[claimIndex], status: nextStep.id };
  setClaims(optimisticClaims);

  try {
    const response = await claimsAPI.advance(id);
    // Server confirms, maybe update with server response
    await fetchClaims(); // or setClaims with response
    toast.success(`Claim advanced to ${nextStep.label}`);
  } catch (error) {
    // Revert on error
    fetchClaims(); // refresh to actual state
    toast.error('Failed to advance claim');
  }
};






  const getStatusStep = (status: string) => {
    const index = workflowSteps.findIndex(step => step.id === status);
    return index >= 0 ? index : 0;
  };

  const canCreateClaim = userRole === 'edir_leader' || userRole === 'org_admin' || userRole === 'super_admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">{t('claim_queue')}</h2>
          <p className="text-muted-foreground font-medium">Monitor and process death benefit claims efficiently.</p>
        </div>
        {canCreateClaim && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl font-black h-12 shadow-lg shadow-primary/20 px-6 bg-primary hover:bg-primary/90">
                <Plus className="w-5 h-5 mr-2" />
                {t('report_death')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-[2rem] border-none shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreateClaim}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Report Death Claim</DialogTitle>
                  <DialogDescription className="font-medium">
                    File a new death benefit claim for a member.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 my-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Member *</Label>
                    <Select value={newClaim.member_id} onValueChange={(v) => setNewClaim({...newClaim, member_id: v})}>
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
                  <div className="space-y-2">
                    <Label className="font-bold">Deceased Name *</Label>
                    <Input
                      value={newClaim.deceased_name}
                      onChange={(e) => setNewClaim({...newClaim, deceased_name: e.target.value})}
                      placeholder="Full name of deceased"
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Relationship *</Label>
                      <Select value={newClaim.relationship} onValueChange={(v) => setNewClaim({...newClaim, relationship: v})}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">Self (Member)</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Date of Death *</Label>
                      <Input
                        type="date"
                        value={newClaim.date_of_death}
                        onChange={(e) => setNewClaim({...newClaim, date_of_death: e.target.value})}
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Claim Amount (ETB) *</Label>
                      <Input
                        type="number"
                        value={newClaim.amount}
                        onChange={(e) => setNewClaim({...newClaim, amount: e.target.value})}
                        placeholder="25000"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Additional Notes</Label>
                    <Textarea
                      value={newClaim.notes}
                      onChange={(e) => setNewClaim({...newClaim, notes: e.target.value})}
                      placeholder="Any additional information..."
                      className="rounded-xl"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full h-12 rounded-xl font-black">
                    Submit Claim
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Claims</p>
            <h3 className="text-2xl font-black mt-1 text-foreground">{stats.total}</h3>
            <div className="h-1 w-12 rounded-full bg-primary mt-3" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pending Approval</p>
            <h3 className="text-2xl font-black mt-1 text-foreground">{stats.pending}</h3>
            <div className="h-1 w-12 rounded-full bg-amber-500 mt-3" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">In Payout</p>
            <h3 className="text-2xl font-black mt-1 text-foreground">{stats.in_payout}</h3>
            <div className="h-1 w-12 rounded-full bg-indigo-500 mt-3" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Paid this Month</p>
            <h3 className="text-2xl font-black mt-1 text-foreground">ETB {stats.paid_this_month?.toLocaleString() || '0'}</h3>
            <div className="h-1 w-12 rounded-full bg-blue-500 mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {claims.map((claim) => (
              <motion.div
                key={claim.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-card border border-border/50 group">
                  <CardContent className="p-0">
                    <div className="p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                      <div className="space-y-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20">
                            {claim.member_name?.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-black text-foreground">{claim.member_name}</h3>
                              {claim.priority === 'high' && (
                                <Badge className="bg-red-500 hover:bg-red-600 text-white border-none text-[8px] font-black uppercase">Urgent</Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest w-fit mt-1 px-2 border-2 border-muted text-muted-foreground">
                              {claim.claim_number}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1.5 px-1">
                          <p className="text-sm text-muted-foreground font-medium">
                            {t('beneficiary_for')}: <span className="font-bold text-foreground">{claim.deceased_name}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            {t('reported_on')} {new Date(claim.date_reported).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Progress Workflow */}
                      <div className="flex-1 max-w-4xl px-8 hidden lg:block">
                        <div className="relative">
                          <div className="absolute top-5 left-8 right-8 h-1 bg-muted rounded-full -z-10" />
                          <div 
                            className="absolute top-5 left-8 h-1 bg-primary rounded-full -z-10 transition-all duration-700 ease-in-out"
                            style={{ width: `${(getStatusStep(claim.status) / (workflowSteps.length - 1)) * 88}%` }}
                          />
                          <div className="flex justify-between items-start">
                            {workflowSteps.map((step, idx) => {
                              const currentIdx = getStatusStep(claim.status);
                              const isCompleted = currentIdx > idx;
                              const isCurrent = currentIdx === idx;
                              return (
                                <div key={step.id} className="flex flex-col items-center gap-3 group/step">
                                  <div className={cn(
                                    "w-10 h-10 rounded-2xl border-4 flex items-center justify-center bg-card transition-all duration-500 shadow-sm",
                                    isCompleted ? "border-primary bg-primary text-white scale-90 opacity-80" : 
                                    isCurrent ? "border-primary bg-primary/5 text-primary scale-110 shadow-lg shadow-primary/20" : 
                                    "border-muted bg-muted/20 text-muted-foreground"
                                  )}>
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest text-center w-20 leading-tight transition-colors",
                                    isCurrent ? "text-primary" : isCompleted ? "text-primary/70" : "text-muted-foreground"
                                  )}>
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-row xl:flex-col items-center xl:items-end justify-between xl:justify-center gap-6 border-t xl:border-t-0 pt-6 xl:pt-0">
                        <div className="text-left xl:text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">{t('amount')}</p>
                          <p className="text-3xl font-black text-primary tracking-tighter">ETB {claim.amount.toLocaleString()}</p>
                        </div>

                        {claim.status !== 'paid' ? (
                          (userRole === 'finance' && claim.status === 'processing') ? (
                            <Button 
                              size="lg" 
                              onClick={() => handleAdvanceClaim(claim.id)}
                              className="rounded-2xl h-14 px-8 font-black shadow-xl shadow-green-200 hover:shadow-2xl active:scale-95 transition-all group bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Mark as Paid
                            </Button>
                          ) : (
                            (userRole === 'edir_leader' || userRole === 'org_admin' || userRole === 'super_admin') && (
                              <Button 
                                size="lg" 
                                onClick={() => handleAdvanceClaim(claim.id)}
                                className="rounded-2xl h-14 px-8 font-black shadow-xl shadow-primary/20 hover:shadow-2xl active:scale-95 transition-all group bg-primary text-white"
                              >
                                {t('advance')} <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                              </Button>
                            )
                          )
                        ) : (
                          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-6 py-3 rounded-2xl border-2 border-blue-100">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-black text-sm uppercase">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Mobile Status Bar */}
                    <div className="lg:hidden h-2.5 w-full bg-muted/30">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(getStatusStep(claim.status) + 1) / workflowSteps.length * 100}%` }}
                        className={cn("h-full bg-primary transition-all duration-700", claim.status === 'paid' && "bg-blue-500")} 
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Guidelines Card */}
      <Card className="border-none shadow-2xl rounded-[3rem] bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
        <CardContent className="p-12 flex flex-col md:flex-row items-center gap-10">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-[2rem] bg-white flex items-center justify-center shadow-xl">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center shadow-lg">
              <Info className="w-5 h-5 text-secondary-foreground" />
            </div>
          </div>
          <div className="text-center md:text-left space-y-3">
            <h4 className="font-black text-2xl tracking-tight text-foreground">{t('claim_guidelines')}</h4>
            <p className="text-muted-foreground font-medium max-w-xl leading-relaxed">
              Ensure all legal documents (death certificate, member ID, Kebele witness forms) are scanned and uploaded clearly to avoid delays in processing. Standard payout time is 2-3 business days after final approval.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
              <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold border-2 border-primary/20 text-primary">Download Form Templates</Button>
              <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold border-2 border-primary/20 text-primary">Full Documentation</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};