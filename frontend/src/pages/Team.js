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
import { 
  Users, 
  UserPlus,
  Shield,
  Mail,
  Phone,
  MoreHorizontal,
  Check,
  X,
  Clock,
  TrendingUp,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { teamApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features and team management', color: 'bg-red-100 text-red-700' },
  { value: 'agent', label: 'Agent', description: 'Can manage assigned contacts and send messages', color: 'bg-blue-100 text-blue-700' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to contacts and reports', color: 'bg-gray-100 text-gray-700' }
];

const getRoleColor = (role) => {
  const r = ROLES.find(ro => ro.value === role);
  return r ? r.color : 'bg-gray-100 text-gray-700';
};

const Team = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [teamStats, setTeamStats] = useState(null);
  
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'agent',
    name: '',
    password: '',
    createDirectly: true
  });

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const [membersRes, invitesRes, statsRes] = await Promise.all([
        teamApi.getMembers(),
        teamApi.getInvites(),
        teamApi.getStats()
      ]);
      setMembers(membersRes.data || []);
      setInvites(invitesRes.data || []);
      setTeamStats(statsRes.data || null);
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!newInvite.email || !newInvite.name) {
      toast.error('Please enter name and email address');
      return;
    }
    
    if (newInvite.createDirectly && !newInvite.password) {
      toast.error('Please enter a password for the new user');
      return;
    }
    
    try {
      if (newInvite.createDirectly) {
        // Create user directly
        await teamApi.createMember({
          name: newInvite.name,
          email: newInvite.email,
          password: newInvite.password,
          role: newInvite.role
        });
        toast.success('User created! Login details will be sent via email.');
      } else {
        // Send invitation
        await teamApi.inviteMember(newInvite);
        toast.success('Invitation sent!');
      }
      setInviteDialogOpen(false);
      setNewInvite({ email: '', role: 'agent', name: '', password: '', createDirectly: true });
      fetchTeamData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add team member');
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await teamApi.updateMemberRole(memberId, newRole);
      toast.success('Role updated');
      fetchTeamData();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    try {
      await teamApi.removeMember(memberId);
      toast.success('Member removed');
      fetchTeamData();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await teamApi.cancelInvite(inviteId);
      toast.success('Invitation cancelled');
      fetchTeamData();
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="team-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Team Management</h1>
            <p className="text-muted-foreground mt-1">Manage your team members and permissions</p>
          </div>
          {isAdmin && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-user-btn" className="bg-orange-600 hover:bg-orange-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new team member account with login credentials
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={newInvite.name}
                      onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                      placeholder="John Doe"
                      data-testid="user-name-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      value={newInvite.email}
                      onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                      placeholder="john@company.com"
                      data-testid="user-email-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={newInvite.password}
                      onChange={(e) => setNewInvite({ ...newInvite, password: e.target.value })}
                      placeholder="Enter a secure password"
                      data-testid="user-password-input"
                    />
                    <p className="text-xs text-muted-foreground">Share these credentials with the new user</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newInvite.role} onValueChange={(value) => setNewInvite({ ...newInvite, role: value })}>
                      <SelectTrigger data-testid="user-role-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              <Badge className={role.color}>{role.label}</Badge>
                              <span className="text-xs text-muted-foreground">{role.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleInvite} data-testid="create-user-btn" className="bg-orange-600 hover:bg-orange-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Team Stats (Admin Only) */}
        {isAdmin && teamStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{teamStats.total_members || 0}</p>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{teamStats.total_deals || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Deals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{teamStats.messages_sent || 0}</p>
                    <p className="text-sm text-muted-foreground">Messages Sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">${(teamStats.pipeline_value || 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Pipeline Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members ({members.length})
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="invites">
                <Mail className="h-4 w-4 mr-2" />
                Pending Invites ({invites.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            {loading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading team...</p>
              </div>
            ) : members.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No team members yet</p>
                  {isAdmin && (
                    <Button onClick={() => setInviteDialogOpen(true)}>Invite Your First Member</Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {members.map((member) => (
                  <Card key={member.id} data-testid={`member-card-${member.id}`}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold">
                            {member.name?.charAt(0).toUpperCase() || member.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium">{member.name || 'Unnamed'}</h3>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-muted-foreground hidden md:block">
                          <p>{member.clients_count || 0} contacts</p>
                          <p>{member.messages_sent || 0} messages</p>
                        </div>
                        
                        <Badge className={getRoleColor(member.role)}>{member.role}</Badge>
                        
                        {isAdmin && member.id !== user?.user_id && (
                          <div className="flex items-center gap-2">
                            <Select 
                              value={member.role} 
                              onValueChange={(value) => handleUpdateRole(member.id, value)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((role) => (
                                  <SelectItem key={role.value} value={role.value}>
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                        
                        {member.id === user?.user_id && (
                          <Badge variant="outline">You</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pending Invites Tab */}
          {isAdmin && (
            <TabsContent value="invites">
              {invites.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No pending invitations</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {invites.map((invite) => (
                    <Card key={invite.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{invite.name || invite.email}</h3>
                            <p className="text-sm text-muted-foreground">{invite.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <Badge className={getRoleColor(invite.role)}>{invite.role}</Badge>
                          <Badge variant="outline" className="text-yellow-600">Pending</Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCancelInvite(invite.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Roles Info */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Outfit'] flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ROLES.map((role) => (
                <div key={role.value} className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={role.color}>{role.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {role.value === 'admin' && (
                      <>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Manage team members</li>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Access all contacts</li>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Billing & settings</li>
                      </>
                    )}
                    {role.value === 'agent' && (
                      <>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Manage assigned contacts</li>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Send messages</li>
                        <li className="flex items-center gap-1"><X className="h-3 w-3 text-red-500" /> Team management</li>
                      </>
                    )}
                    {role.value === 'viewer' && (
                      <>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> View contacts & reports</li>
                        <li className="flex items-center gap-1"><X className="h-3 w-3 text-red-500" /> Send messages</li>
                        <li className="flex items-center gap-1"><X className="h-3 w-3 text-red-500" /> Team management</li>
                      </>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Team;
