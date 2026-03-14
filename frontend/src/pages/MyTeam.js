import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  MessageSquare, 
  DollarSign, 
  TrendingUp,
  Eye,
  ChevronRight,
  Clock,
  UserCheck
} from 'lucide-react';
import { teamLeaderApi, teamApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const MyTeam = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await teamLeaderApi.getDashboard();
      setDashboard(res.data);
    } catch (error) {
      toast.error('Failed to load team data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const viewAgentClients = async (agentId) => {
    navigate(`/team/agent/${agentId}/clients`);
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

  if (!dashboard) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Unable to load team dashboard</p>
        </div>
      </DashboardLayout>
    );
  }

  const { agents, totals } = dashboard;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="my-team-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-['Outfit']">My Team</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'team_leader' 
              ? 'Manage and monitor your agents\' performance' 
              : 'Overview of all team agents'}
          </p>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totals.agents_count}</p>
                  <p className="text-sm text-muted-foreground">Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totals.total_clients}</p>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
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
                  <p className="text-2xl font-bold">{totals.total_messages}</p>
                  <p className="text-sm text-muted-foreground">Messages Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totals.total_deals}</p>
                  <p className="text-sm text-muted-foreground">Total Deals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents List */}
        <Card>
          <CardHeader>
            <CardTitle>Team Agents</CardTitle>
            <CardDescription>Monitor agent performance and access their data</CardDescription>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No agents assigned to your team</p>
                {(user?.role === 'admin' || user?.role === 'org_admin') && (
                  <Button className="mt-4" onClick={() => navigate('/team')}>
                    Manage Team
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => (
                  <div 
                    key={agent.id} 
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {agent.name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-muted-foreground">{agent.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-semibold">{agent.clients_count}</p>
                          <p className="text-muted-foreground">Clients</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{agent.messages_sent}</p>
                          <p className="text-muted-foreground">Sent</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{agent.messages_received}</p>
                          <p className="text-muted-foreground">Received</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{agent.deals_count}</p>
                          <p className="text-muted-foreground">Deals</p>
                        </div>
                      </div>

                      {/* Last Activity */}
                      {agent.last_activity && (
                        <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(agent.last_activity).toLocaleDateString()}
                        </div>
                      )}

                      {/* View Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewAgentClients(agent.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Clients
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MyTeam;
