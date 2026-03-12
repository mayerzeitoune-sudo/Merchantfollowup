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
  BarChart3
} from 'lucide-react';
import { organizationsApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const Organizations = () => {
  const { user, token } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgUsers, setOrgUsers] = useState([]);
  const [stats, setStats] = useState(null);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [viewOrgDialogOpen, setViewOrgDialogOpen] = useState(false);
  
  const [newOrg, setNewOrg] = useState({ name: '', description: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

  useEffect(() => {
    if (user?.role === 'org_admin') {
      fetchData();
    }
  }, [user, token]);

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
            <p className="text-muted-foreground mt-1">Manage all organizations in your platform</p>
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

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_users || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_clients || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Clients</p>
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
              <Card key={org.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`org-card-${org.id}`}>
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <Users className="h-4 w-4 inline mr-1" />
                      {org.user_count || 0} users
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewOrg(org)}
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
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
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {selectedOrg?.name}
                  </DialogTitle>
                  <DialogDescription>{selectedOrg?.description}</DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteOrg(selectedOrg?.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Users ({orgUsers.length})</h3>
                <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
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
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Organizations;
