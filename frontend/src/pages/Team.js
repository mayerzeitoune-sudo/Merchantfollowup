import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
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
  DollarSign,
  Send,
  Upload,
  FileSpreadsheet,
  Download,
  Key,
  RefreshCw,
  Archive,
  RotateCcw,
  History,
  Eye
} from 'lucide-react';
import { teamApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'org_admin', label: 'Org Admin', description: 'Super admin with access to all organizations', color: 'bg-purple-100 text-purple-700' },
  { value: 'admin', label: 'Admin', description: 'Full access to their organization', color: 'bg-red-100 text-red-700' },
  { value: 'team_leader', label: 'Team Leader', description: 'Manages a team of agents, can access their data', color: 'bg-orange-100 text-orange-700' },
  { value: 'agent', label: 'Agent', description: 'Can manage their own contacts and send messages', color: 'bg-blue-100 text-blue-700' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to contacts and reports', color: 'bg-gray-100 text-gray-700' }
];

const getRoleColor = (role) => {
  const r = ROLES.find(ro => ro.value === role);
  return r ? r.color : 'bg-gray-100 text-gray-700';
};

const Team = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [teamStats, setTeamStats] = useState(null);
  const [bulkUsers, setBulkUsers] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  
  // Password reset state
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  // Delete member state
  const [deleteMemberOpen, setDeleteMemberOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  
  // Archive member state
  const [archiveMemberOpen, setArchiveMemberOpen] = useState(false);
  const [memberToArchive, setMemberToArchive] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedMembers, setArchivedMembers] = useState([]);
  
  // Team Leader assignment state
  const [assignAgentOpen, setAssignAgentOpen] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  
  const [newUser, setNewUser] = useState({
    email: '',
    role: 'agent',
    name: '',
    password: ''
  });

  const [newInvite, setNewInvite] = useState({
    email: '',
    name: '',
    role: 'agent',
    subject: 'You\'re Invited to Join Merchant Followup',
    message: ''
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

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.name) {
      toast.error('Please enter name and email address');
      return;
    }
    
    if (!newUser.password) {
      toast.error('Please enter a password for the new user');
      return;
    }
    
    try {
      const response = await teamApi.createMember({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role
      });
      
      if (response.data.email_sent) {
        toast.success(`User created! Login details sent to ${newUser.email}`);
      } else if (response.data.email_error) {
        toast.success('User created successfully!');
        toast.warning(`Could not send email: ${response.data.email_error}. Please share credentials manually.`);
      } else {
        toast.success('User created! Connect Gmail in Settings to send invitation emails automatically.');
      }
      
      setAddUserDialogOpen(false);
      setNewUser({ email: '', role: 'agent', name: '', password: '' });
      fetchTeamData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleInvite = async () => {
    if (!newInvite.email) {
      toast.error('Please enter an email address');
      return;
    }
    
    if (!newInvite.message) {
      toast.error('Please compose a message for the invitation');
      return;
    }
    
    try {
      const response = await teamApi.inviteMember(newInvite);
      
      if (response.data.email_sent) {
        toast.success(`Invitation sent to ${newInvite.email}!`);
      } else if (response.data.email_error) {
        toast.warning(`Invitation created but email failed: ${response.data.email_error}`);
      } else {
        toast.success('Invitation created! Connect Gmail in Settings to send emails.');
      }
      
      setInviteDialogOpen(false);
      setNewInvite({ email: '', name: '', role: 'agent', subject: 'You\'re Invited to Join Merchant Followup', message: '' });
      fetchTeamData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send invitation');
    }
  };

  const handleBulkFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row if present
      const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;
      
      const users = [];
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
        if (parts.length >= 2) {
          users.push({
            name: parts[0] || '',
            email: parts[1] || '',
            password: parts[2] || generatePassword(),
            role: parts[3] || 'agent',
            status: 'pending'
          });
        }
      }
      
      setBulkUsers(users);
      toast.success(`Loaded ${users.length} users from file`);
    };
    reader.readAsText(file);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleBulkUpload = async () => {
    if (bulkUsers.length === 0) {
      toast.error('No users to upload');
      return;
    }
    
    setBulkUploading(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const user of bulkUsers) {
      try {
        await teamApi.createMember({
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role
        });
        user.status = 'success';
        successCount++;
      } catch (error) {
        user.status = 'failed';
        user.error = error.response?.data?.detail || 'Failed';
        failCount++;
      }
      setBulkUsers([...bulkUsers]);
    }
    
    setBulkUploading(false);
    toast.success(`Bulk upload complete: ${successCount} succeeded, ${failCount} failed`);
    fetchTeamData();
  };

  const downloadTemplate = () => {
    const template = 'Name,Email,Password,Role\nJohn Doe,john@example.com,password123,agent\nJane Smith,jane@example.com,password456,agent';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team_upload_template.csv';
    a.click();
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
    try {
      await teamApi.removeMember(memberId);
      toast.success('Member removed');
      setDeleteMemberOpen(false);
      setMemberToDelete(null);
      fetchTeamData();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };
  
  const openDeleteMember = (member) => {
    setMemberToDelete(member);
    setDeleteMemberOpen(true);
  };
  
  // Archive handlers
  const handleArchiveMember = async (memberId) => {
    try {
      await teamApi.archiveMember(memberId);
      toast.success('Member archived successfully');
      setArchiveMemberOpen(false);
      setMemberToArchive(null);
      fetchTeamData();
      if (showArchived) {
        fetchArchivedMembers();
      }
    } catch (error) {
      toast.error('Failed to archive member');
    }
  };
  
  const handleRestoreMember = async (memberId) => {
    try {
      await teamApi.restoreMember(memberId);
      toast.success('Member restored successfully');
      fetchTeamData();
      fetchArchivedMembers();
    } catch (error) {
      toast.error('Failed to restore member');
    }
  };
  
  const fetchArchivedMembers = async () => {
    try {
      const res = await teamApi.getArchivedMembers();
      setArchivedMembers(res.data);
    } catch (error) {
      console.error('Failed to fetch archived members');
    }
  };
  
  const openArchiveMember = (member) => {
    setMemberToArchive(member);
    setArchiveMemberOpen(true);
  };
  
  // Toggle archived view
  useEffect(() => {
    if (showArchived) {
      fetchArchivedMembers();
    }
  }, [showArchived]);

  // Password Reset Handlers
  const openResetPassword = (member) => {
    setSelectedMember(member);
    setNewPassword('');
    setResetPasswordOpen(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setResetLoading(true);
    try {
      await teamApi.resetPassword(selectedMember.id, newPassword);
      toast.success(`Password reset successfully for ${selectedMember.email}`);
      setResetPasswordOpen(false);
      setNewPassword('');
      setSelectedMember(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendResetLink = async (member) => {
    try {
      const response = await teamApi.sendResetLink(member.id);
      if (response.data.email_sent) {
        toast.success(`Password reset link sent to ${member.email}`);
      } else {
        // If email failed, show the token
        toast.info(`Reset link generated. Token: ${response.data.reset_token}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset link');
    }
  };

  // Team Leader assignment handlers
  const openAssignAgent = (leader) => {
    setSelectedLeader(leader);
    setSelectedAgentId('');
    setAssignAgentOpen(true);
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId) {
      toast.error('Please select an agent');
      return;
    }
    
    try {
      await teamApi.assignAgentToLeader(selectedLeader.id, selectedAgentId);
      toast.success('Agent assigned to team leader');
      setAssignAgentOpen(false);
      fetchTeamData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign agent');
    }
  };

  const handleRemoveAgentFromLeader = async (leaderId, agentId) => {
    try {
      await teamApi.removeAgentFromLeader(leaderId, agentId);
      toast.success('Agent removed from team leader');
      fetchTeamData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove agent');
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

  const isAdmin = user?.role === 'admin' || user?.role === 'org_admin';
  const isOrgAdmin = user?.role === 'org_admin';

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
            <div className="flex gap-2">
              {/* Invite Member Dialog */}
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="invite-member-btn">
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Compose and send an email invitation to join your team
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={newInvite.name}
                          onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address *</Label>
                        <Input
                          type="email"
                          value={newInvite.email}
                          onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                          placeholder="colleague@company.com"
                          data-testid="invite-email-input"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newInvite.role} onValueChange={(value) => setNewInvite({ ...newInvite, role: value })}>
                        <SelectTrigger data-testid="invite-role-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.filter(role => role.value !== 'org_admin').map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center gap-2">
                                <Badge className={role.color}>{role.label}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-base font-medium flex items-center gap-2 mb-3">
                        <Send className="h-4 w-4" />
                        Compose Email
                      </Label>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Input
                            value={newInvite.subject}
                            onChange={(e) => setNewInvite({ ...newInvite, subject: e.target.value })}
                            placeholder="You're Invited to Join Merchant Followup"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Message *</Label>
                          <Textarea
                            value={newInvite.message}
                            onChange={(e) => setNewInvite({ ...newInvite, message: e.target.value })}
                            placeholder="Write your personalized invitation message here..."
                            rows={5}
                          />
                          <p className="text-xs text-muted-foreground">
                            This message will be included in the invitation email along with a sign-up link.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleInvite} data-testid="send-invite-btn">
                      <Send className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add User Dialog */}
              <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
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
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="John Doe"
                        data-testid="user-name-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="john@company.com"
                        data-testid="user-email-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Enter a secure password"
                        data-testid="user-password-input"
                      />
                      <p className="text-xs text-muted-foreground">Share these credentials with the new user</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                        <SelectTrigger data-testid="user-role-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.filter(role => role.value !== 'org_admin').map((role) => (
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
                    <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddUser} data-testid="create-user-btn" className="bg-orange-600 hover:bg-orange-700">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Bulk Upload Dialog */}
              <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="bulk-upload-btn">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      Bulk Upload Agents
                    </DialogTitle>
                    <DialogDescription>
                      Upload a CSV file to add multiple team members at once
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor="csv-upload" className="cursor-pointer">
                          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-secondary/50 transition">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm font-medium">Click to upload CSV file</p>
                            <p className="text-xs text-muted-foreground mt-1">Format: Name, Email, Password, Role</p>
                          </div>
                        </Label>
                        <Input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleBulkFileUpload}
                        />
                      </div>
                      <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>
                    </div>

                    {bulkUsers.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-secondary sticky top-0">
                              <tr>
                                <th className="text-left p-2">Name</th>
                                <th className="text-left p-2">Email</th>
                                <th className="text-left p-2">Password</th>
                                <th className="text-left p-2">Role</th>
                                <th className="text-left p-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkUsers.map((u, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="p-2">{u.name}</td>
                                  <td className="p-2">{u.email}</td>
                                  <td className="p-2 font-mono text-xs">{u.password}</td>
                                  <td className="p-2">
                                    <Badge variant="outline">{u.role}</Badge>
                                  </td>
                                  <td className="p-2">
                                    {u.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                                    {u.status === 'success' && <Badge className="bg-green-100 text-green-700">Success</Badge>}
                                    {u.status === 'failed' && <Badge className="bg-red-100 text-red-700">{u.error || 'Failed'}</Badge>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-secondary p-2 text-sm text-muted-foreground">
                          {bulkUsers.length} users loaded
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setBulkUploadOpen(false);
                      setBulkUsers([]);
                    }}>Cancel</Button>
                    <Button 
                      onClick={handleBulkUpload} 
                      disabled={bulkUsers.length === 0 || bulkUploading}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {bulkUploading ? 'Uploading...' : `Upload ${bulkUsers.length} Users`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
              <>
                <TabsTrigger value="archived">
                  <Archive className="h-4 w-4 mr-2" />
                  Archived ({archivedMembers.length})
                </TabsTrigger>
                <TabsTrigger value="invites">
                  <Mail className="h-4 w-4 mr-2" />
                  Pending Invites ({invites.length})
                </TabsTrigger>
              </>
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
                        
                        {/* Show Assign Agents button for Team Leaders */}
                        {isAdmin && member.role === 'team_leader' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignAgent(member)}
                            title="Assign Agents"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Agents
                          </Button>
                        )}
                        
                        {/* Show team leader badge for agents */}
                        {member.team_leader_id && (
                          <Badge variant="outline" className="text-xs">
                            Team: {members.find(m => m.id === member.team_leader_id)?.name || 'Leader'}
                          </Badge>
                        )}
                        
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
                                {ROLES.filter(role => role.value !== 'org_admin').map((role) => (
                                  <SelectItem key={role.value} value={role.value}>
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/users/${member.id}/history`)}
                              title="View History"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openResetPassword(member)}
                              title="Reset Password"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openArchiveMember(member)}
                              title="Archive Member"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openDeleteMember(member)}
                              title="Remove Member"
                              data-testid={`delete-member-${member.id}`}
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

          {/* Archived Members Tab */}
          {isAdmin && (
            <TabsContent value="archived">
              {archivedMembers.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No archived members</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {archivedMembers.map((member) => (
                    <Card key={member.id} className="border-dashed opacity-75">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-semibold">
                                {member.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-muted-foreground">{member.name}</h3>
                                <Badge variant="destructive" className="text-xs">Archived</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                              {member.archived_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Archived on {new Date(member.archived_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/users/${member.id}/history`)}
                              title="View History"
                            >
                              <History className="h-4 w-4 mr-2" />
                              History
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleRestoreMember(member.id)}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {ROLES.map((role) => (
                <div key={role.value} className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={role.color}>{role.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {role.value === 'org_admin' && (
                      <>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Manage all organizations</li>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Access all data</li>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Create organizations</li>
                      </>
                    )}
                    {role.value === 'admin' && (
                      <>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Manage team members</li>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Access org contacts</li>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Billing & settings</li>
                      </>
                    )}
                    {role.value === 'team_leader' && (
                      <>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Manage assigned agents</li>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> View agents' contacts</li>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Message from agents</li>
                      </>
                    )}
                    {role.value === 'agent' && (
                      <>
                        <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> Manage own contacts</li>
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

        {/* Password Reset Dialog */}
        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Reset Password
              </DialogTitle>
              <DialogDescription>
                Reset password for {selectedMember?.name} ({selectedMember?.email})
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  data-testid="reset-password-input"
                />
              </div>
              
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Options:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Set a new password directly</li>
                  <li>• Or send a reset link via email</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  handleSendResetLink(selectedMember);
                  setResetPasswordOpen(false);
                }}
                disabled={resetLoading}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Reset Link
              </Button>
              <Button 
                onClick={handleResetPassword}
                disabled={resetLoading || !newPassword}
                data-testid="confirm-reset-password"
              >
                {resetLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Agent to Team Leader Dialog */}
        <Dialog open={assignAgentOpen} onOpenChange={setAssignAgentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Assign Agent to {selectedLeader?.name}
              </DialogTitle>
              <DialogDescription>
                Select an agent to add to this team leader's team
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Agent</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members
                      .filter(m => m.role === 'agent' && !m.team_leader_id && m.id !== selectedLeader?.id)
                      .map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Show currently assigned agents */}
              {selectedLeader && members.filter(m => m.team_leader_id === selectedLeader.id).length > 0 && (
                <div className="space-y-2">
                  <Label>Currently Assigned Agents</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {members
                      .filter(m => m.team_leader_id === selectedLeader.id)
                      .map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between p-2 rounded border">
                          <span className="text-sm">{agent.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAgentFromLeader(selectedLeader.id, agent.id)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignAgentOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignAgent} disabled={!selectedAgentId}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Member Confirmation */}
        <AlertDialog open={deleteMemberOpen} onOpenChange={setDeleteMemberOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{memberToDelete?.name}</strong> from the team? 
                They will lose access to team resources.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleRemoveMember(memberToDelete?.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Team;
