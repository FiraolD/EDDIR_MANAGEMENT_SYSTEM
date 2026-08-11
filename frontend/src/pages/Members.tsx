import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Phone,
  Download,
  CheckCircle2,
  Loader2,
  Shield,
  Mail,
  Building,
  UserPlus,
  Users as UsersIcon
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { membersAPI } from '@/services/api';

interface Member {
  id: string;
  member_number: string;
  full_name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  join_date: string;
  last_payment_date: string | null;
  total_contributions: number;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  role: 'member' | 'super_admin' | 'org_admin' | 'edir_leader';
  organization_id?: string;
  organization_name?: string;
}

interface Organization {
  id: string;
  name: string;
  subdomain: string;
}

export const Members: React.FC = () => {
  const { t, user } = useAppContext();
  const { can, userRole } = usePermissions();
  const [members, setMembers] = useState<Member[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOrganization, setFilterOrganization] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [userOrganizationId, setUserOrganizationId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [newMember, setNewMember] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    role: 'member',
    organization_id: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

// In Members.tsx, inside fetchMembers:
const fetchMembers = async () => {
    setLoading(true);
    try {
        const params: any = {
            page: pagination.page,
            limit: pagination.limit,
        };
        if (searchTerm) params.search = searchTerm;
        if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
        if (selectedOrganizationId) {
            params.organization_id = selectedOrganizationId;
        }
        const response = await membersAPI.getAll(params);
        setMembers(response.data.members);
        setPagination(response.data.pagination);
    } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to fetch members');
    } finally {
        setLoading(false);
    }
};

  const fetchOrganizations = async () => {
    if (userRole !== 'super_admin') return;
    try {
      const response = await api.get('/organizations', { params: { limit: 100 } });
      setOrganizations(response.data.organizations);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  useEffect(() => {
    fetchMembers();
    if (userRole === 'super_admin') {
      fetchOrganizations();
    }
  }, [pagination.page, searchTerm, filterStatus, filterOrganization]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMember.fullName || !newMember.email || !newMember.phone || !newMember.password) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (newMember.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    // For non-super admin, auto-assign to their organization
    if (userRole !== 'super_admin' && user?.organization_id) {
      newMember.organization_id = user.organization_id;
    }
    
    try {
      await api.post('/members', newMember);
      toast.success('Member added successfully');
      setIsAddModalOpen(false);
      setNewMember({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        address: '',
        role: 'member',
        organization_id: '',
        emergencyContactName: '',
        emergencyContactPhone: ''
      });
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add member');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/members/${id}/status`, { status });
      toast.success(`Member status updated to ${status}`);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      await api.put(`/members/${id}/role`, { role });
      toast.success(`Member role updated to ${role}`);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/members/${id}`);
        toast.success('Member deleted successfully');
        fetchMembers();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete member');
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700';
      case 'org_admin':
        return 'bg-indigo-100 text-indigo-700';
      case 'edir_leader':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'org_admin':
        return 'Org Admin';
      case 'edir_leader':
        return 'Edir Leader';
      default:
        return 'Member';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  const getInitials = (name: string | null | undefined) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
  const canAddMember = can('member', 'create') || userRole === 'org_admin' || userRole === 'super_admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Members</h2>
          <p className="text-muted-foreground font-medium">Manage all members across your organization.</p>
        </div>
        {canAddMember && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl font-black shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                <UserPlus className="w-5 h-5 mr-2" />
                New Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-none shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleAddMember}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Add New Member</DialogTitle>
                  <DialogDescription className="font-medium">
                    Enter member details to add them to the registry.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 my-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Full Name *</Label>
                      <Input 
                        value={newMember.fullName} 
                        onChange={(e) => setNewMember({...newMember, fullName: e.target.value})}
                        placeholder="e.g., Abebe Bikila" 
                        className="h-12 rounded-xl"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Email *</Label>
                      <Input 
                        type="email"
                        value={newMember.email}
                        onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                        placeholder="name@example.com" 
                        className="h-12 rounded-xl"
                        required 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Phone (+251...) *</Label>
                      <Input 
                        value={newMember.phone}
                        onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                        placeholder="+251 9XX XXX XXX" 
                        className="h-12 rounded-xl"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Password *</Label>
                      <Input 
                        type="password"
                        value={newMember.password}
                        onChange={(e) => setNewMember({...newMember, password: e.target.value})}
                        placeholder="Minimum 6 characters" 
                        className="h-12 rounded-xl"
                        required 
                      />
                    </div>
                  </div>
                  
                  {/* Organization selector for Super Admin */}
                  {userRole === 'super_admin' && (
                    <div className="space-y-2">
                      <Label className="font-bold">Organization *</Label>
                      <Select 
                        value={newMember.organization_id} 
                        onValueChange={(value) => setNewMember({...newMember, organization_id: value})}
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Role</Label>
                      <Select 
                        value={newMember.role} 
                        onValueChange={(value) => setNewMember({...newMember, role: value})}
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          {userRole === 'super_admin' && <SelectItem value="edir_leader">Edir Leader</SelectItem>}
                          {userRole === 'super_admin' && <SelectItem value="org_admin">Organization Admin</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Address</Label>
                      <Input 
                        value={newMember.address}
                        onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                        placeholder="Home address" 
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Emergency Contact Name</Label>
                      <Input 
                        value={newMember.emergencyContactName}
                        onChange={(e) => setNewMember({...newMember, emergencyContactName: e.target.value})}
                        placeholder="Full name" 
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Emergency Contact Phone</Label>
                      <Input 
                        value={newMember.emergencyContactPhone}
                        onChange={(e) => setNewMember({...newMember, emergencyContactPhone: e.target.value})}
                        placeholder="+251..." 
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full h-12 rounded-xl font-black">
                    Add Member
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm rounded-3xl bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, or phone..." 
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              {userRole === 'super_admin' && (
                <Select value={filterOrganization} onValueChange={setFilterOrganization}>
                  <SelectTrigger className="w-[180px] h-12 rounded-xl">
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Button variant="outline" className="h-12 rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <Card className="border-none shadow-xl rounded-[2rem]">
          <CardContent className="p-12 text-center">
            <UsersIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No members found</h3>
            <p className="text-sm text-muted-foreground">Get started by adding your first member.</p>
            {canAddMember && (
              <Button 
                variant="outline" 
                className="mt-4 rounded-xl"
                onClick={() => setIsAddModalOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="px-6 py-4">Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Contributions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 rounded-xl bg-primary/10">
                            <AvatarFallback className="text-primary font-black">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{member.member_number}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">{member.email}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {member.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.organization_name ? (
                          <div className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{member.organization_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-full px-3 py-1 text-[10px] font-black", getRoleBadgeColor(member.role))}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("rounded-full px-3 py-1 text-[10px] font-black", getStatusColor(member.status))}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(member.join_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">ETB {member.total_contributions?.toLocaleString() || '0'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleUpdateStatus(member.id, member.status === 'active' ? 'inactive' : 'active')}>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {member.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            {userRole === 'super_admin' && member.role !== 'super_admin' && member.role !== 'org_admin' && (
                              <DropdownMenuItem onClick={() => handleUpdateRole(member.id, member.role === 'member' ? 'edir_leader' : 'member')}>
                                <Shield className="w-4 h-4 mr-2" />
                                {member.role === 'member' ? 'Make Edir Leader' : 'Make Member'}
                              </DropdownMenuItem>
                            )}
                            {userRole === 'super_admin' && member.role !== 'super_admin' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(member.id, member.full_name)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && members.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} members
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-xl" 
              disabled={pagination.page === 1}
              onClick={() => setPagination({...pagination, page: pagination.page - 1})}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1 mx-2">
              <Button 
                size="sm" 
                variant={pagination.page === 1 ? "default" : "ghost"}
                className="rounded-xl w-9 h-9"
                onClick={() => setPagination({...pagination, page: 1})}
              >
                1
              </Button>
              {pagination.totalPages > 1 && (
                <Button 
                  size="sm" 
                  variant={pagination.page === 2 ? "default" : "ghost"}
                  className="rounded-xl w-9 h-9"
                  onClick={() => setPagination({...pagination, page: 2})}
                >
                  2
                </Button>
              )}
              {pagination.totalPages > 2 && <span className="px-2">...</span>}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-xl"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination({...pagination, page: pagination.page + 1})}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};