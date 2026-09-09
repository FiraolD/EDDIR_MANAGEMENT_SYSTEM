import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  Clock,
  Search,
  Filter,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  RefreshCw,
  FileCheck
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

interface Claim {
  id: string;
  claim_number: string;
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
  notes: string;
  created_at: string;
}

interface ClaimStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  high_priority: number;
}

export const ClaimReview: React.FC = () => {
  const { t, user } = useAppContext();
  const { hasPermission, isSuperAdmin, isClaimsManager } = usePermissions();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject'>('approve');
  const [reviewComments, setReviewComments] = useState('');
  const [fraudRisk, setFraudRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [stats, setStats] = useState<ClaimStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    high_priority: 0
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        status: filterStatus !== 'all' ? filterStatus : undefined
      };
      if (searchTerm) params.search = searchTerm;
      if (filterPriority !== 'all') params.priority = filterPriority;

      const response = await api.get('/claims', { params });
      setClaims(response.data.claims || []);
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      
      // Calculate stats
      const allClaims = response.data.claims || [];
      setStats({
        total: allClaims.length,
        pending: allClaims.filter((c: Claim) => c.status === 'reported' || c.status === 'leader_approved').length,
        approved: allClaims.filter((c: Claim) => c.status === 'admin_approved' || c.status === 'processing').length,
        rejected: allClaims.filter((c: Claim) => c.status === 'rejected').length,
        high_priority: allClaims.filter((c: Claim) => c.priority === 'high').length
      });
    } catch (error: any) {
      console.error('Fetch claims error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClaimsManager || isSuperAdmin) {
      fetchClaims();
    }
  }, [pagination.page, searchTerm, filterStatus, filterPriority]);

  const handleReviewClaim = async () => {
    if (!selectedClaim) return;

    try {
      const response = await api.put(`/claims/${selectedClaim.id}/review`, {
        decision: reviewDecision,
        comments: reviewComments,
        fraud_risk: fraudRisk
      });
      
      toast.success(`Claim ${reviewDecision === 'approve' ? 'approved' : 'rejected'} successfully`);
      setIsReviewDialogOpen(false);
      setSelectedClaim(null);
      setReviewComments('');
      fetchClaims();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to review claim');
    }
  };

  const handleFraudAssessment = async (claimId: string, risk: string) => {
    try {
      await api.post(`/claims/${claimId}/fraud-assessment`, { risk });
      toast.success('Fraud assessment updated');
      fetchClaims();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update fraud assessment');
    }
  };

  const canReview = isClaimsManager || isSuperAdmin;

  if (!canReview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to review claims.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Claims Review</h2>
          <p className="text-muted-foreground font-medium">Review and process claims for approval.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl border-2 font-bold h-12" onClick={fetchClaims}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-none shadow-sm rounded-3xl bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total</p>
            <h3 className="text-2xl font-black">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pending Review</p>
            <h3 className="text-2xl font-black text-amber-600">{stats.pending}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Approved</p>
            <h3 className="text-2xl font-black text-green-600">{stats.approved}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rejected</p>
            <h3 className="text-2xl font-black text-red-600">{stats.rejected}</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl bg-red-50 border-red-200 border-2">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">High Priority</p>
            <h3 className="text-2xl font-black text-red-600">{stats.high_priority}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-3xl bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search claims..."
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
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="leader_approved">Leader Approved</SelectItem>
                  <SelectItem value="admin_approved">Admin Approved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[140px] h-12 rounded-xl">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims Table */}
      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : claims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileCheck className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No claims to review</h3>
              <p className="text-sm text-muted-foreground">All claims have been processed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Claim</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Deceased</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {claim.claim_number}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{claim.member_name}</TableCell>
                      <TableCell>{claim.deceased_name}</TableCell>
                      <TableCell className="font-bold">
                        ETB {claim.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "rounded-full",
                          claim.status === 'reported' || claim.status === 'leader_approved' 
                            ? "bg-amber-100 text-amber-700" 
                            : "bg-green-100 text-green-700"
                        )}>
                          {claim.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {claim.priority === 'high' ? (
                          <Badge className="bg-red-100 text-red-700 rounded-full">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            High
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 rounded-full">
                            {claim.priority}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(claim.date_reported).toLocaleDateString()}
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
                              setSelectedClaim(claim);
                              setIsViewDetailsOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {(claim.status === 'reported' || claim.status === 'leader_approved') && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedClaim(claim);
                                setReviewDecision('approve');
                                setReviewComments('');
                                setFraudRisk('low');
                                setIsReviewDialogOpen(true);
                              }}>
                                <FileCheck className="w-4 h-4 mr-2 text-green-600" />
                                Review
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && claims.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} claims
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
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Claim Details</DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Claim Number</p>
                  <p className="font-mono text-sm">{selectedClaim.claim_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={cn("rounded-full", 
                    selectedClaim.status === 'reported' || selectedClaim.status === 'leader_approved' 
                      ? "bg-amber-100 text-amber-700" 
                      : "bg-green-100 text-green-700"
                  )}>
                    {selectedClaim.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Member</p>
                  <p className="font-medium">{selectedClaim.member_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedClaim.member_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">ETB {selectedClaim.amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Deceased Name</p>
                  <p className="font-medium">{selectedClaim.deceased_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Relationship</p>
                  <p>{selectedClaim.relationship}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date of Death</p>
                  <p>{new Date(selectedClaim.date_of_death).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date Reported</p>
                  <p>{new Date(selectedClaim.date_reported).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                <Badge className={cn(
                  "rounded-full",
                  selectedClaim.priority === 'high' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                )}>
                  {selectedClaim.priority}
                </Badge>
              </div>
              {selectedClaim.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-xl">{selectedClaim.notes}</p>
                </div>
              )}
              {selectedClaim.documents && selectedClaim.documents.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Documents</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedClaim.documents.map((doc, idx) => (
                      <Badge key={idx} variant="outline" className="cursor-pointer hover:bg-muted">
                        <FileText className="w-3 h-3 mr-1" />
                        Document {idx + 1}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
              Close
            </Button>
            {selectedClaim && (selectedClaim.status === 'reported' || selectedClaim.status === 'leader_approved') && (
              <Button onClick={() => {
                setIsViewDetailsOpen(false);
                setReviewDecision('approve');
                setReviewComments('');
                setFraudRisk('low');
                setIsReviewDialogOpen(true);
              }}>
                <FileCheck className="w-4 h-4 mr-2" />
                Review Claim
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Review Claim</DialogTitle>
            <DialogDescription>
              Review the claim details and make a decision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedClaim && (
              <div className="space-y-2 bg-muted/30 p-4 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Claim Number</span>
                  <span className="font-mono">{selectedClaim.claim_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member</span>
                  <span>{selectedClaim.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">ETB {selectedClaim.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deceased</span>
                  <span>{selectedClaim.deceased_name}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Decision</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={reviewDecision === 'approve' ? 'default' : 'outline'}
                  className={cn("flex-1", reviewDecision === 'approve' && "bg-green-600 hover:bg-green-700")}
                  onClick={() => setReviewDecision('approve')}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  type="button"
                  variant={reviewDecision === 'reject' ? 'destructive' : 'outline'}
                  className="flex-1"
                  onClick={() => setReviewDecision('reject')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fraud Risk Assessment</Label>
              <Select value={fraudRisk} onValueChange={(v: any) => setFraudRisk(v)}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Add comments for this decision..."
                className="rounded-xl"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReviewClaim}>
              <FileCheck className="w-4 h-4 mr-2" />
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};