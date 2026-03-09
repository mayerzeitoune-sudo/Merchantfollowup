import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Users, 
  Bell, 
  Calendar, 
  Zap, 
  DollarSign, 
  TrendingUp,
  Clock,
  ArrowRight,
  Send
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi, remindersApi } from '../lib/api';
import { toast } from 'sonner';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_clients: 0,
    total_reminders: 0,
    pending_reminders: 0,
    sent_reminders: 0,
    active_campaigns: 0,
    total_balance_owed: 0,
    todays_followups: 0,
    recent_reminders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await dashboardApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (reminderId) => {
    try {
      await remindersApi.send(reminderId);
      toast.success('Reminder sent successfully!');
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reminder');
    }
  };

  const statCards = [
    { 
      title: 'Total Clients', 
      value: stats.total_clients, 
      icon: Users, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/clients'
    },
    { 
      title: 'Pending Reminders', 
      value: stats.pending_reminders, 
      icon: Bell, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      link: '/reminders'
    },
    { 
      title: "Today's Follow-ups", 
      value: stats.todays_followups, 
      icon: Calendar, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/calendar'
    },
    { 
      title: 'Active Campaigns', 
      value: stats.active_campaigns, 
      icon: Zap, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/campaigns'
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="dashboard-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-['Outfit'] text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Link key={index} to={stat.link}>
                <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="text-3xl font-bold mt-1 font-['Outfit']">
                          {loading ? '-' : stat.value}
                        </p>
                      </div>
                      <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-orange-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Total Balance Owed</p>
                <p className="text-4xl font-bold mt-2 font-['Outfit']">
                  ${loading ? '-' : stats.total_balance_owed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm mt-2 opacity-90">
                  From {stats.total_clients} client{stats.total_clients !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reminders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-['Outfit']">Recent Reminders</CardTitle>
                  <CardDescription>Your latest payment reminders</CardDescription>
                </div>
                <Link to="/reminders">
                  <Button variant="ghost" size="sm" className="text-primary">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recent_reminders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No reminders yet</p>
                  <Link to="/reminders">
                    <Button className="mt-3" size="sm">Create First Reminder</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recent_reminders.map((reminder) => (
                    <div 
                      key={reminder.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          reminder.status === 'sent' ? 'bg-green-500' : 
                          reminder.status === 'pending' ? 'bg-orange-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{reminder.client_name}</p>
                          <p className="text-xs text-muted-foreground">
                            ${reminder.amount_due.toFixed(2)} • Due: {new Date(reminder.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {reminder.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleSendReminder(reminder.id)}
                          className="text-primary hover:text-primary"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-['Outfit']">Quick Actions</CardTitle>
              <CardDescription>Common tasks at your fingertips</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/clients" className="block">
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mr-4">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Add New Client</p>
                    <p className="text-xs text-muted-foreground">Add a customer to your database</p>
                  </div>
                </Button>
              </Link>
              
              <Link to="/reminders" className="block">
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center mr-4">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Schedule Reminder</p>
                    <p className="text-xs text-muted-foreground">Set up a payment reminder</p>
                  </div>
                </Button>
              </Link>
              
              <Link to="/campaigns" className="block">
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center mr-4">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Create Campaign</p>
                    <p className="text-xs text-muted-foreground">Build a drip campaign</p>
                  </div>
                </Button>
              </Link>
              
              <Link to="/settings" className="block">
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4">
                    <TrendingUp className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Connect SMS Provider</p>
                    <p className="text-xs text-muted-foreground">Configure Twilio, Telnyx, etc.</p>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
