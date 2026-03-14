import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Activity,
  Shield,
  LogIn,
  Clock,
  Users,
  MessageSquare,
  DollarSign,
  Building,
  History
} from 'lucide-react';
import { userHistoryApi } from '../lib/api';
import { toast } from 'sonner';

const UserHistory = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchUserHistory();
  }, [userId]);

  const fetchUserHistory = async () => {
    try {
      const response = await userHistoryApi.getUserHistory(userId);
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load user history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      org_admin: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      team_leader: 'bg-green-100 text-green-700',
      agent: 'bg-gray-100 text-gray-700',
      viewer: 'bg-yellow-100 text-yellow-700'
    };
    const roleLabels = {
      org_admin: 'Org Admin',
      admin: 'Admin',
      team_leader: 'Team Leader',
      agent: 'Agent',
      viewer: 'Viewer'
    };
    return (
      <Badge className={roleColors[role] || 'bg-gray-100'}>
        {roleLabels[role] || role}
      </Badge>
    );
  };

  const getActivityIcon = (action) => {
    if (action?.includes('client') || action?.includes('Client')) return Users;
    if (action?.includes('message') || action?.includes('Message')) return MessageSquare;
    if (action?.includes('deal') || action?.includes('Deal')) return DollarSign;
    if (action?.includes('login') || action?.includes('Login')) return LogIn;
    return Activity;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button className="mt-4" onClick={() => navigate('/team')}>
            Back to Team
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { user, activities, login_history, stats } = data;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="user-history-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-['Outfit']">User History</h1>
            <p className="text-muted-foreground">View activity and history for {user.name}</p>
          </div>
        </div>

        {/* User Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-2xl font-semibold">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  {getRoleBadge(user.role)}
                  {user.is_archived && (
                    <Badge variant="destructive">Archived</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.clients_count}</p>
                  <p className="text-sm text-muted-foreground">Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.messages_count}</p>
                  <p className="text-sm text-muted-foreground">Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.deals_count}</p>
                  <p className="text-sm text-muted-foreground">Deals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity & Login History Tabs */}
        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="logins">
              <LogIn className="h-4 w-4 mr-2" />
              Login History
            </TabsTrigger>
          </TabsList>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>
                  Actions performed by this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No activity recorded yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {activities.map((activity, index) => {
                        const Icon = getActivityIcon(activity.action);
                        return (
                          <div key={activity.id || index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{activity.action}</p>
                              {activity.details && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {typeof activity.details === 'object' 
                                    ? JSON.stringify(activity.details).slice(0, 100)
                                    : activity.details}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(activity.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Login History Tab */}
          <TabsContent value="logins">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Login History</CardTitle>
                <CardDescription>
                  Recent login sessions for this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {login_history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <LogIn className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No login history available</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {login_history.map((login, index) => (
                        <div key={login.id || index} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <LogIn className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Login</p>
                            <p className="text-sm text-muted-foreground">
                              {login.ip_address && `IP: ${login.ip_address} • `}
                              {login.user_agent && `${login.user_agent.slice(0, 50)}...`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {new Date(login.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UserHistory;
