import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  Users, 
  Crown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Trash2,
  UserPlus,
  Eye
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/services/api';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  total_members: number;
  total_claims: number;
  total_contributions: number;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  member_number: string;
  full_name: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  join_date: string;
  total_contributions: number;
  organization_id?: string;
}

export const OrganizationManagement: React.FC = () => {
  const { t } = useAppContext();
  const { hasPermission, userRole } = usePermissions();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgMembers, setSelectedOrgMembers] = useState<Member[]>([]);
  const [existingUsers, setExistingUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignLeaderModalOpen, setIsAssignLeaderModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isViewMembersModalOpen, setIsViewMembersModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('organizations');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [newOrganization, setNewOrganization] = useState({
    name: '',
    subdomain: '',
    email: '',
    phone: '',
    address: '',
  });

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedLeader, setSelectedLeader] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/organizations', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm || undefined
        }
      });
      setOrganizations(response.data.organizations);
      setPagination(response.data.pagination);
    } catch (error: any) {
      console.error('Fetch organizations error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationMembers = async (orgId: string) => {
    if (!orgId) {
      toast.error('Organization ID is missing');
      return;
    }
    setLoadingMembers(true);
    try {
      const response = await api.get(`/organizations/${orgId}/members`);
      setSelectedOrgMembers(response.data.members);
    } catch (error: any) {
      console.error('Fetch members error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchOrganizationMembersForLeader = async (orgId: string) => {
    if (!orgId) {
      toast.error('Organization ID is missing');
      return;
    }
    setLoadingUsers(true);
    try {
      const response = await api.get(`/organizations/${orgId}/members`);
      setExistingUsers(response.data.members);
    } catch (error: any) {
      console.error('Failed to fetch members:', error);
      setExistingUsers([]);
      toast.error('Failed to fetch members');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users', { params: { limit: 100 } });
      const availableUsers = response.data.users.filter(
        (u: any) => u.role === 'member' || u.role === 'edir_leader'
      );
      setExistingUsers(availableUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    if (hasPermission('read')){
      fetchOrganizations();
      if (userRole === 'super_admin') {
        fetchUsers();
      }
    }
  }, [pagination.page, searchTerm]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/organizations', newOrganization);
      toast.success('Organization created successfully');
      setIsAddModalOpen(false);
      setNewOrganization({ name: '', subdomain: '', email: '', phone: '', address: '' });
      fetchOrganizations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExistingMember = async () => {
    if (!selectedOrg || !selectedUserId) {
      toast.error('Please select a user to add');
      return;
    }

    setAddingMember(true);
    try {
      await api.post(`/organizations/${selectedOrg.id}/add-member`, { userId: selectedUserId });
      toast.success(`Member added to ${selectedOrg.name} successfully`);
      setIsAddMemberModalOpen(false);
      setSelectedUserId('');
      fetchOrganizations();
      if (selectedOrg.id) {
        fetchOrganizationMembers(selectedOrg.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleAssignLeader = async () => {
    if (!selectedOrg || !selectedLeader) {
      toast.error('Please select an organization and a leader');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/organizations/${selectedOrg.id}/assign-leader`, { userId: selectedLeader });
      toast.success(`Leader assigned to ${selectedOrg.name}`);
      setIsAssignLeaderModalOpen(false);
      setSelectedLeader('');
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign leader');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/organizations/${id}/status`, { status });
      toast.success(`Organization ${status === 'active' ? 'activated' : 'deactivated'}`);
      fetchOrganizations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDeleteOrganization = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/organizations/${id}`);
        toast.success('Organization deleted successfully');
        fetchOrganizations();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete organization');
      }
    }
  };

  const handleViewMembers = (org: Organization) => {
    if (!org || !org.id) {
      toast.error('Invalid organization');
      return;
    }
    setSelectedOrg(org);
    fetchOrganizationMembers(org.id);
    setIsViewMembersModalOpen(true);
  };

  const handleAddMemberClick = (org: Organization) => {
    if (!org || !org.id) {
      toast.error('Invalid organization');
      return;
    }
    setSelectedOrg(org);
    fetchOrganizationMembersForLeader(org.id);
    setIsAddMemberModalOpen(true);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!hasPermission('organization.read')) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Building className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Organization Management</h2>
          <p className="text-muted-foreground font-medium">Manage all Edir organizations, members, and leaders.</p>
        </div>
       {hasPermission('create') && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl font-black shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                <Plus className="w-5 h-5 mr-2" />
                New Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-none shadow-2xl p-8">
              <form onSubmit={handleCreateOrganization}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Create Organization</DialogTitle>
                  <DialogDescription className="font-medium">
                    Add a new Edir organization to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 my-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Organization Name *</Label>
                      <Input
                        value={newOrganization.name}
                        onChange={(e) => setNewOrganization({...newOrganization, name: e.target.value})}
                        placeholder="e.g., Awash Main Edir"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Subdomain *</Label>
                      <Input
                        value={newOrganization.subdomain}
                        onChange={(e) => setNewOrganization({...newOrganization, subdomain: e.target.value})}
                        placeholder="awash-main"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Email</Label>
                      <Input
                        type="email"
                        value={newOrganization.email}
                        onChange={(e) => setNewOrganization({...newOrganization, email: e.target.value})}
                        placeholder="contact@organization.com"
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Phone</Label>
                      <Input
                        value={newOrganization.phone}
                        onChange={(e) => setNewOrganization({...newOrganization, phone: e.target.value})}
                        placeholder="+251..."
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Address</Label>
                    <Input
                      value={newOrganization.address}
                      onChange={(e) => setNewOrganization({...newOrganization, address: e.target.value})}
                      placeholder="Full address"
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full h-12 rounded-xl font-black" disabled={submitting}>
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Create Organization
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <Building className="w-8 h-8 text-primary mb-3" />
            <p className="text-2xl font-black">{pagination.total}</p>
            <p className="text-sm text-muted-foreground">Total Organizations</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-6">
            <Users className="w-8 h-8 text-blue-500 mb-3" />
            <p className="text-2xl font-black">
              {organizations.reduce((sum, org) => sum + (org.total_members || 0), 0).toLocaleString()}

            </p>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-6">
            <Crown className="w-8 h-8 text-green-500 mb-3" />
            <p className="text-2xl font-black">{existingUsers.filter(u => u.role === 'org_admin').length}</p>
            <p className="text-sm text-muted-foreground">Organization Leaders</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-3xl bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-6">
            <AlertCircle className="w-8 h-8 text-purple-500 mb-3" />
            <p className="text-2xl font-black">
              {organizations.reduce((sum, org) => sum + (org.total_claims || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Total Claims</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="organizations" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building className="w-4 h-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="members" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-2" />
            All Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="mt-6">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations by name or subdomain..."
                className="pl-12 h-12 rounded-2xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Organizations Table */}
          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-card">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : organizations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Building className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No organizations found</h3>
                  <p className="text-sm text-muted-foreground">Get started by creating your first organization.</p>
                 {hasPermission('create') && (
                    <Button 
                      variant="outline" 
                      className="mt-4 rounded-xl"
                      onClick={() => setIsAddModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Organization
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="py-4">Organization</TableHead>
                        <TableHead>Subdomain</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Claims</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations.map((org) => (
                        <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Building className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold">{org.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{org.id.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{org.subdomain}</code>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {org.email && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Mail className="w-3 h-3" />
                                  <span>{org.email}</span>
                                </div>
                              )}
                              {org.phone && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Phone className="w-3 h-3" />
                                  <span>{org.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleViewMembers(org)}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              {org.total_members || 0} Members
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full">
                              {org.total_claims || 0} Claims
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "rounded-full",
                              org.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                              {org.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(org.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleViewMembers(org)}>
                                  <Users className="w-4 h-4 mr-2" />
                                  View Members
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddMemberClick(org)}>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Add Existing Member
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  setSelectedOrg(org);
                                  fetchOrganizationMembersForLeader(org.id);
                                  setIsAssignLeaderModalOpen(true);
                                }}>
                                  <Crown className="w-4 h-4 mr-2" />
                                  Assign Leader
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(org.id, org.status === 'active' ? 'inactive' : 'active')}>
                                  {org.status === 'active' ? (
                                    <><XCircle className="w-4 h-4 mr-2" /> Deactivate</>
                                  ) : (
                                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Activate</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteOrganization(org.id, org.name)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
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
          {!loading && organizations.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} organizations
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                  disabled={pagination.page === 1}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={pagination.page === 1 ? "default" : "ghost"}
                    onClick={() => setPagination({...pagination, page: 1})}
                    className="rounded-xl w-9 h-9"
                  >
                    1
                  </Button>
                  {pagination.totalPages > 1 && (
                    <Button
                      size="sm"
                      variant={pagination.page === 2 ? "default" : "ghost"}
                      onClick={() => setPagination({...pagination, page: 2})}
                      className="rounded-xl w-9 h-9"
                    >
                      2
                    </Button>
                  )}
                  {pagination.totalPages > 2 && (
                    <span className="px-2">...</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-xl"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-card">
            <CardContent className="p-8 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Member Management</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                To manage members, go to the Members page from the sidebar navigation.
              </p>
              <Button 
                className="mt-4 rounded-xl"
                onClick={() => window.location.href = '/members'}
              >
                Go to Members Page
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Leader Dialog */}
      <Dialog open={isAssignLeaderModalOpen} onOpenChange={setIsAssignLeaderModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Assign Organization Leader</DialogTitle>
            <DialogDescription>
              Select a member to be the leader of <span className="font-semibold">{selectedOrg?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Member</Label>
              <Select value={selectedLeader} onValueChange={setSelectedLeader}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {loadingUsers ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </div>
                  ) : existingUsers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No members available in this organization.
                    </div>
                  ) : (
                    existingUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.member_number})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignLeaderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignLeader} disabled={!selectedLeader || submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Assign Leader
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Existing Member Dialog */}
      <Dialog open={isAddMemberModalOpen} onOpenChange={setIsAddMemberModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Add Existing Member to {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Select an existing user to add as a member of this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Member</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {loadingUsers ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </div>
                  ) : existingUsers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No available members found. All members are already added or no members exist.
                    </div>
                  ) : (
                    existingUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.full_name}</span>
                          <span className="text-xs text-muted-foreground">{user.email} - {user.member_number || 'No member number'}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExistingMember} disabled={!selectedUserId || addingMember}>
              {addingMember ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog open={isViewMembersModalOpen} onOpenChange={setIsViewMembersModalOpen}>
        <DialogContent className="sm:max-w-[800px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Members of {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Total members: {selectedOrgMembers.length}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : selectedOrgMembers.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No members yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setIsViewMembersModalOpen(false);
                    handleAddMemberClick(selectedOrg!);
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Member Number</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrgMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 rounded-lg bg-primary/10">
                              <AvatarFallback className="text-primary text-xs">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.full_name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{member.member_number}</code>
                        </TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>{new Date(member.join_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "rounded-full",
                            member.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            {member.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewMembersModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewMembersModalOpen(false);
              handleAddMemberClick(selectedOrg!);
            }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};