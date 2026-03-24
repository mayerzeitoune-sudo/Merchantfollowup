import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Building2, 
  Users, 
  UserPlus,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ChevronRight,
  BarChart3,
  UserX,
  UserCheck,
  Phone,
  Mail,
  Search,
  LogIn,
  DollarSign,
  CreditCard,
  Receipt,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { organizationsApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Switch } from '../components/ui/switch';

const Organizations = () => {
  const { user, token, startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgUsers, setOrgUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [impersonating, setImpersonating] = useState(false);
  const [activeTab, setActiveTab] = useState('organizations');
  
  // Billing state
  const [billingData, setBillingData] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrgForPayment, setSelectedOrgForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [orgBillingDialog, setOrgBillingDialog] = useState(false);
  const [selectedOrgBilling, setSelectedOrgBilling] = useState(null);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [viewOrgDialogOpen, setViewOrgDialogOpen] = useState(false);
  
  // New state for clickable cards
  const [unassignedUsersDialog, setUnassignedUsersDialog] = useState(false);
  const [unassignedClientsDialog, setUnassignedClientsDialog] = useState(false);
  const [allUsersDialog, setAllUsersDialog] = useState(false);
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [unassignedClients, setUnassignedClients] = useState([]);
  const [allOrgUsers, setAllOrgUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [assigningUser, setAssigningUser] = useState(null);
  const [assigningClient, setAssigningClient] = useState(null);
  
  const [newOrg, setNewOrg] = useState({ name: '', description: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

  useEffect(() => {
    if (user?.role === 'org_admin') {
      fetchData();
    }
  }, [user, token]);

  // Fetch billing data when tab changes to billing
  useEffect(() => {
    if (activeTab === 'billing' && !billingData) {
      fetchBillingData();
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [orgsRes, statsRes] = await Promise.all([
        organizationsApi.getAll(token),
        organizationsApi.getStats(token)
      ]);
      setOrganizations(orgsRes.data || []);
      setStats(statsRes.data || null);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingData = async () => {
    setBillingLoading(true);
    try {
      const response = await organizationsApi.getBillingOverview(token);
      setBillingData(response.data);
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedOrgForPayment || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    try {
      await organizationsApi.recordPayment(token, {
        organization_id: selectedOrgForPayment.organization_id,
        amount: parseFloat(paymentAmount),
        notes: paymentNotes
      });
      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setSelectedOrgForPayment(null);
      fetchBillingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const handleViewOrgBilling = async (orgId) => {
    try {
      const response = await organizationsApi.getOrgBilling(token, orgId);
      setSelectedOrgBilling(response.data);
      setOrgBillingDialog(true);
    } catch (error) {
      toast.error('Failed to load organization billing details');
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrg.name) {
      toast.error('Please enter organization name');
      return;
    }
    
    try {
      await organizationsApi.create(token, newOrg);
      toast.success('Organization created successfully');
      setCreateDialogOpen(false);
      setNewOrg({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create organization');
    }
  };

  const handleViewOrg = async (org) => {
    setSelectedOrg(org);
    setViewOrgDialogOpen(true);
    
    try {
      const usersRes = await organizationsApi.getUsers(token, org.id);
      setOrgUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch org users:', error);
    }
  };

  const handleAddUserToOrg = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      await organizationsApi.addUser(token, selectedOrg.id, newUser);
      toast.success('User added to organization');
      setAddUserDialogOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      
      // Refresh org users
      const usersRes = await organizationsApi.getUsers(token, selectedOrg.id);
      setOrgUsers(usersRes.data || []);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add user');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    
    try {
      await organizationsApi.removeUser(token, selectedOrg.id, userId);
      toast.success('User removed from organization');
      
      const usersRes = await organizationsApi.getUsers(token, selectedOrg.id);
      setOrgUsers(usersRes.data || []);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove user');
    }
  };

  const handleDeleteOrg = async (orgId) => {
    if (!confirm('Are you sure you want to delete this organization? This will delete ALL users and data within the organization.')) return;
    
    try {
      await organizationsApi.delete(token, orgId);
      toast.success('Organization deleted');
      setViewOrgDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete organization');
    }
  };

  // Fetch unassigned users
  const fetchUnassignedUsers = async () => {
    try {
      const res = await organizationsApi.getUnassignedUsers(token);
      setUnassignedUsers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch unassigned users:', error);
      toast.error('Failed to load unassigned users');
    }
  };

  // Fetch unassigned clients
  const fetchUnassignedClients = async () => {
    try {
      const res = await organizationsApi.getUnassignedClients(token);
      setUnassignedClients(res.data || []);
    } catch (error) {
      console.error('Failed to fetch unassigned clients:', error);
      toast.error('Failed to load unassigned clients');
    }
  };

  // Fetch all users in orgs
  const fetchAllOrgUsers = async () => {
    try {
      const res = await organizationsApi.getAllUsers(token);
      setAllOrgUsers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch org users:', error);
    }
  };

  // Assign user to organization
  const handleAssignUser = async (userId, orgId) => {
    try {
      await organizationsApi.assignUser(token, userId, orgId);
      toast.success('User assigned to organization');
      setAssigningUser(null);
      fetchUnassignedUsers();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign user');
    }
  };

  // Assign client to organization
  const handleAssignClient = async (clientId, orgId) => {
    try {
      await organizationsApi.assignClient(token, clientId, orgId);
      toast.success('Client assigned to organization');
      setAssigningClient(null);
      fetchUnassignedClients();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign client');
    }
  };

  // Login as admin of an organization
  const handleLoginAsOrgAdmin = async (org) => {
    setImpersonating(true);
    try {
      const response = await organizationsApi.impersonateOrgAdmin(token, org.id);
      const impersonationData = response.data;
      
      // Start impersonation session
      startImpersonation(impersonationData);
      
      toast.success(impersonationData.message || `Now viewing as ${org.name} admin`);
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Impersonation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to login as organization admin');
    } finally {
      setImpersonating(false);
    }
  };

  // Login as a specific user
  const handleLoginAsUser = async (userId, userName) => {
    setImpersonating(true);
    try {
      const response = await organizationsApi.impersonateUser(token, userId);
      const impersonationData = response.data;
      
      // Start impersonation session
      startImpersonation(impersonationData);
      
      toast.success(impersonationData.message || `Now viewing as ${userName}`);
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Impersonation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to login as user');
    } finally {
      setImpersonating(false);
    }
  };

  // Open unassigned users dialog
  const openUnassignedUsersDialog = () => {
    fetchUnassignedUsers();
    setUnassignedUsersDialog(true);
  };

  // Open unassigned clients dialog
  const openUnassignedClientsDialog = () => {
    fetchUnassignedClients();
    setUnassignedClientsDialog(true);
  };

  // Open all users dialog
  const openAllUsersDialog = () => {
    fetchAllOrgUsers();
    setAllUsersDialog(true);
  };

  // Only org_admin can access this page
  if (user?.role !== 'org_admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only Org Admins can access Organization Management</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="organizations-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Organizations</h1>
            <p className="text-muted-foreground mt-1">Manage all organizations and billing</p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700" data-testid="create-org-btn">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
                <DialogDescription>
                  Add a new company or organization to the platform
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Organization Name *</Label>
                  <Input
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    placeholder="Acme Corporation"
                    data-testid="org-name-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newOrg.description}
                    onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                    placeholder="Brief description of the organization..."
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateOrg} className="bg-orange-600 hover:bg-orange-700" data-testid="confirm-create-org">
                  Create Organization
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Billing & Pricing
            </TabsTrigger>
          </TabsList>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6 mt-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}} data-testid="stat-organizations">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.total_organizations || 0}</p>
                        <p className="text-sm text-muted-foreground">Organizations</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={openAllUsersDialog} data-testid="stat-users-in-orgs">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.total_users || 0}</p>
                        <p className="text-sm text-muted-foreground">Users in Orgs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="stat-org-admins">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_admins || 0}</p>
                    <p className="text-sm text-muted-foreground">Org Admins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="stat-clients-in-orgs">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_clients || 0}</p>
                    <p className="text-sm text-muted-foreground">Clients in Orgs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-dashed border-orange-300 bg-orange-50/50 cursor-pointer hover:shadow-md transition-shadow" onClick={openUnassignedUsersDialog} data-testid="stat-unassigned-users">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <UserX className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{stats.unassigned_users || 0}</p>
                    <p className="text-sm text-muted-foreground">Unassigned Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-dashed border-orange-300 bg-orange-50/50 cursor-pointer hover:shadow-md transition-shadow" onClick={openUnassignedClientsDialog} data-testid="stat-unassigned-clients">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{stats.unassigned_clients || 0}</p>
                    <p className="text-sm text-muted-foreground">Unassigned Clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Organizations List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">No organizations yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                Create Your First Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org) => (
              <Card key={org.id} className="hover:shadow-md transition-shadow" data-testid={`org-card-${org.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        {org.description && (
                          <CardDescription className="text-xs mt-1">{org.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <Badge variant={org.is_active ? 'default' : 'secondary'}>
                      {org.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex gap-4 text-muted-foreground">
                      <span>
                        <Users className="h-4 w-4 inline mr-1" />
                        {org.user_count || 0} users
                      </span>
                      <span>
                        <BarChart3 className="h-4 w-4 inline mr-1" />
                        {org.client_count || 0} clients
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewOrg(org)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                      onClick={() => handleLoginAsOrgAdmin(org)}
                      disabled={impersonating || org.user_count === 0}
                      data-testid={`login-as-org-${org.id}`}
                    >
                      <LogIn className="h-4 w-4 mr-1" />
                      {impersonating ? 'Loading...' : 'Login As Admin'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Organization Dialog */}
        <Dialog open={viewOrgDialogOpen} onOpenChange={setViewOrgDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedOrg?.name}
              </DialogTitle>
              <DialogDescription>{selectedOrg?.description}</DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Users ({orgUsers.length})</h3>
                <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add User to {selectedOrg?.name}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          placeholder="john@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Password *</Label>
                        <Input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Secure password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin (Full org access)</SelectItem>
                            <SelectItem value="user">User (Own data only)</SelectItem>
                            <SelectItem value="agent">Agent (Assigned contacts)</SelectItem>
                            <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddUserToOrg}>Add User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {orgUsers.length === 0 ? (
                <div className="text-center py-8 border rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No users in this organization</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {orgUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{u.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{u.role}</Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveUser(u.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Phone Number Settings */}
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">Allow Reps to Purchase Numbers</p>
                      <p className="text-xs text-muted-foreground">When enabled, reps can buy their own phone numbers</p>
                    </div>
                    <Switch
                      checked={selectedOrg?.allow_rep_purchases !== false}
                      onCheckedChange={async (checked) => {
                        try {
                          await organizationsApi.update(token, selectedOrg.id, { allow_rep_purchases: checked });
                          setSelectedOrg(prev => ({ ...prev, allow_rep_purchases: checked }));
                          toast.success(checked ? 'Reps can now purchase numbers' : 'Rep purchasing disabled');
                        } catch (error) {
                          toast.error('Failed to update setting');
                        }
                      }}
                      data-testid="allow-rep-purchases-toggle"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">Rep Monthly Purchase Limit</p>
                      <p className="text-xs text-muted-foreground">Max numbers a rep can buy per month (0 = no limit)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        className="w-20 h-8 text-center"
                        value={selectedOrg?.rep_monthly_number_limit || 0}
                        onChange={(e) => setSelectedOrg(prev => ({ ...prev, rep_monthly_number_limit: parseInt(e.target.value) || 0 }))}
                        data-testid="org-rep-limit-input"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={async () => {
                          try {
                            await organizationsApi.update(token, selectedOrg.id, { 
                              rep_monthly_number_limit: selectedOrg?.rep_monthly_number_limit || 0 
                            });
                            toast.success('Monthly limit updated');
                          } catch (error) {
                            toast.error('Failed to update limit');
                          }
                        }}
                        data-testid="save-org-rep-limit-btn"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone - Delete Organization */}
              <div className="mt-6 pt-4 border-t border-destructive/30">
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div>
                    <p className="font-medium text-destructive">Danger Zone</p>
                    <p className="text-sm text-muted-foreground">Permanently delete this organization and all its data</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteOrg(selectedOrg?.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Organization
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6 mt-6">
            {billingLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : billingData ? (
              <>
                {/* Billing Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-green-700">
                            ${billingData.summary.total_paid.toLocaleString()}
                          </p>
                          <p className="text-sm text-green-600">Total Paid</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2 border-orange-200 bg-orange-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-orange-700">
                            ${billingData.summary.total_owed.toLocaleString()}
                          </p>
                          <p className="text-sm text-orange-600">Total Owed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className={`border-2 ${billingData.summary.total_balance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-lg ${billingData.summary.total_balance > 0 ? 'bg-red-100' : 'bg-green-100'} flex items-center justify-center`}>
                          {billingData.summary.total_balance > 0 ? (
                            <AlertCircle className="h-6 w-6 text-red-600" />
                          ) : (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className={`text-3xl font-bold ${billingData.summary.total_balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                            ${Math.abs(billingData.summary.total_balance).toLocaleString()}
                          </p>
                          <p className={`text-sm ${billingData.summary.total_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {billingData.summary.total_balance > 0 ? 'Outstanding Balance' : 'Credit Balance'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold">{billingData.summary.total_users}</p>
                          <p className="text-sm text-muted-foreground">
                            @ ${billingData.summary.price_per_user}/user
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Pricing Info */}
                <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-orange-600" />
                      Pricing Structure
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-4xl font-bold text-orange-600">$100</p>
                        <p className="text-muted-foreground">per user / month</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Current total users</p>
                        <p className="text-2xl font-bold">{billingData.summary.total_users} users</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Monthly billing: <span className="font-semibold text-orange-600">${billingData.summary.total_owed.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Organization Billing Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Billing</CardTitle>
                    <CardDescription>Billing status for each organization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">Organization</th>
                            <th className="text-center py-3 px-4 font-medium">Users</th>
                            <th className="text-right py-3 px-4 font-medium">Amount Owed</th>
                            <th className="text-right py-3 px-4 font-medium">Amount Paid</th>
                            <th className="text-right py-3 px-4 font-medium">Balance</th>
                            <th className="text-center py-3 px-4 font-medium">Status</th>
                            <th className="text-right py-3 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billingData.organizations.map((org) => (
                            <tr key={org.organization_id} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{org.organization_name}</span>
                                </div>
                              </td>
                              <td className="text-center py-3 px-4">{org.user_count}</td>
                              <td className="text-right py-3 px-4">${org.amount_owed.toLocaleString()}</td>
                              <td className="text-right py-3 px-4 text-green-600">${org.amount_paid.toLocaleString()}</td>
                              <td className={`text-right py-3 px-4 font-medium ${org.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${Math.abs(org.balance).toLocaleString()}
                                {org.balance < 0 && ' credit'}
                              </td>
                              <td className="text-center py-3 px-4">
                                <Badge 
                                  variant={org.status === 'paid' ? 'default' : org.status === 'partial' ? 'secondary' : 'destructive'}
                                  className={
                                    org.status === 'paid' ? 'bg-green-100 text-green-700' :
                                    org.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }
                                >
                                  {org.status === 'paid' ? (
                                    <><CheckCircle className="h-3 w-3 mr-1" /> Paid</>
                                  ) : org.status === 'partial' ? (
                                    <><Clock className="h-3 w-3 mr-1" /> Partial</>
                                  ) : (
                                    <><AlertCircle className="h-3 w-3 mr-1" /> Unpaid</>
                                  )}
                                </Badge>
                              </td>
                              <td className="text-right py-3 px-4">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleViewOrgBilling(org.organization_id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                      setSelectedOrgForPayment(org);
                                      setPaymentAmount(org.balance > 0 ? org.balance.toString() : '');
                                      setPaymentDialogOpen(true);
                                    }}
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Record Payment
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No billing data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Record Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Record Payment
              </DialogTitle>
              <DialogDescription>
                Record a payment for {selectedOrgForPayment?.organization_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Outstanding Balance:</span>
                  <span className="text-xl font-bold text-orange-600">
                    ${selectedOrgForPayment?.balance?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Amount *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment reference, check number, etc."
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Org Billing Details Dialog */}
        <Dialog open={orgBillingDialog} onOpenChange={setOrgBillingDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-600" />
                Billing Details: {selectedOrgBilling?.organization?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedOrgBilling && (
              <div className="space-y-4 mt-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedOrgBilling.billing.user_count}</p>
                    <p className="text-sm text-muted-foreground">Users</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-600">${selectedOrgBilling.billing.amount_owed}</p>
                    <p className="text-sm text-muted-foreground">Amount Owed</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">${selectedOrgBilling.billing.amount_paid}</p>
                    <p className="text-sm text-muted-foreground">Amount Paid</p>
                  </div>
                </div>
                
                {/* Users List */}
                <div>
                  <h4 className="font-medium mb-2">Users ({selectedOrgBilling.users.length})</h4>
                  <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                    {selectedOrgBilling.users.map((u) => (
                      <div key={u.id} className="p-2 flex justify-between items-center text-sm">
                        <span>{u.name} ({u.email})</span>
                        <Badge variant="outline">{u.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Payment History */}
                <div>
                  <h4 className="font-medium mb-2">Payment History</h4>
                  {selectedOrgBilling.payments.length > 0 ? (
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                      {selectedOrgBilling.payments.map((p) => (
                        <div key={p.id} className="p-2 flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium text-green-600">${p.amount.toLocaleString()}</span>
                            {p.notes && <span className="text-muted-foreground ml-2">- {p.notes}</span>}
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Unassigned Users Dialog */}
        <Dialog open={unassignedUsersDialog} onOpenChange={setUnassignedUsersDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-600" />
                Unassigned Users ({unassignedUsers.length})
              </DialogTitle>
              <DialogDescription>
                Users not assigned to any organization. Assign them to manage their access.
              </DialogDescription>
            </DialogHeader>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="h-[400px]">
              {unassignedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-muted-foreground">All users are assigned to organizations</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unassignedUsers
                    .filter(u => 
                      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50" data-testid={`unassigned-user-${u.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-orange-600">{u.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {u.email}
                            </span>
                            <Badge variant="outline" className="text-xs">{u.role}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      {assigningUser === u.id ? (
                        <Select onValueChange={(orgId) => handleAssignUser(u.id, orgId)}>
                          <SelectTrigger className="w-48">
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
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setAssigningUser(u.id)}
                          data-testid={`assign-user-${u.id}`}
                        >
                          <Building2 className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Unassigned Clients Dialog */}
        <Dialog open={unassignedClientsDialog} onOpenChange={setUnassignedClientsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                Unassigned Clients ({unassignedClients.length})
              </DialogTitle>
              <DialogDescription>
                Clients not assigned to any organization. Assign them to enable user access.
              </DialogDescription>
            </DialogHeader>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="h-[400px]">
              {unassignedClients.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-muted-foreground">All clients are assigned to organizations</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unassignedClients
                    .filter(c => 
                      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      c.phone?.includes(searchTerm)
                    )
                    .map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50" data-testid={`unassigned-client-${c.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-orange-600">{c.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {c.phone}
                            </span>
                            {c.pipeline_stage && (
                              <Badge variant="outline" className="text-xs">{c.pipeline_stage}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {assigningClient === c.id ? (
                        <Select onValueChange={(orgId) => handleAssignClient(c.id, orgId)}>
                          <SelectTrigger className="w-48">
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
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setAssigningClient(c.id)}
                          data-testid={`assign-client-${c.id}`}
                        >
                          <Building2 className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* All Users in Organizations Dialog */}
        <Dialog open={allUsersDialog} onOpenChange={setAllUsersDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                All Users in Organizations ({allOrgUsers.length})
              </DialogTitle>
              <DialogDescription>
                View all users across all organizations
              </DialogDescription>
            </DialogHeader>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="h-[400px]">
              {allOrgUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No users in organizations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allOrgUsers
                    .filter(u => 
                      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">{u.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {u.email}
                            </span>
                            <Badge variant="outline" className="text-xs">{u.role}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-700">
                          <Building2 className="h-3 w-3 mr-1" />
                          {u.organization_name || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Organizations;
