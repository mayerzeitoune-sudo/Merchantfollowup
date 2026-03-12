import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { 
  Users, 
  Bell, 
  Calendar, 
  Zap, 
  DollarSign, 
  TrendingUp,
  Clock,
  ArrowRight,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Phone,
  Mail,
  Target,
  RefreshCw,
  Building2,
  FileText,
  Shield,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi, remindersApi, followupsApi, analyticsApi, notificationsApi, fundedApi } from '../lib/api';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

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
  const [todayFollowups, setTodayFollowups] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fundedStats, setFundedStats] = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [statsRes, followupsRes, analyticsRes, notificationsRes, fundedRes, onboardingRes] = await Promise.all([
        dashboardApi.getStats().catch(() => ({ data: stats })),
        followupsApi.getToday().catch(() => ({ data: { followups: [] } })),
        analyticsApi.getOverview().catch(() => ({ data: null })),
        notificationsApi.getAll(true, 5).catch(() => ({ data: { notifications: [], unread_count: 0 } })),
        fundedApi.getStats().catch(() => ({ data: null })),
        axios.get(`${API}/api/onboarding/status`).catch(() => ({ data: { status: 'not_started' } }))
      ]);
      
      setStats(statsRes.data);
      setTodayFollowups(followupsRes.data?.followups || []);
      setAnalytics(analyticsRes.data);
      setNotifications(notificationsRes.data?.notifications || []);
      setUnreadCount(notificationsRes.data?.unread_count || 0);
      setFundedStats(fundedRes.data);
      setOnboardingStatus(onboardingRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (reminderId) => {
    try {
      await remindersApi.send(reminderId);
      toast.success('Reminder sent successfully!');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reminder');
    }
  };

  const handleCompleteFollowup = async (followupId) => {
    try {
      await followupsApi.complete(followupId);
      toast.success('Follow-up completed!');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to complete follow-up');
    }
  };

  const handleSnoozeFollowup = async (followupId) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const snoozeDate = tomorrow.toISOString().split('T')[0];
    
    try {
      await followupsApi.snooze(followupId, snoozeDate);
      toast.success('Follow-up snoozed until tomorrow');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to snooze follow-up');
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
      value: todayFollowups.length, 
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
      <div className="space-y-6" data-testid="dashboard-page">
        {/* Header with Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit'] text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening.</p>
          </div>
          {unreadCount > 0 && (
            <Link to="/notifications">
              <Button variant="outline" className="relative">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
                  {unreadCount}
                </Badge>
              </Button>
            </Link>
          )}
        </div>

        {/* SMS Onboarding Card */}
        {onboardingStatus?.status !== 'approved' && (
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">SMS Setup Required</CardTitle>
                    <CardDescription>Complete A2P 10DLC registration to start sending messages</CardDescription>
                  </div>
                </div>
                {onboardingStatus?.status === 'not_started' ? (
                  <Link to="/onboarding">
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      Start Setup
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                ) : onboardingStatus?.status === 'pending' ? (
                  <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Under Review
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Registration Progress</span>
                    <span className="font-medium">
                      {onboardingStatus?.status === 'not_started' ? '0%' : 
                       onboardingStatus?.status === 'pending' ? '50%' : 
                       onboardingStatus?.brand_status === 'approved' && onboardingStatus?.campaign_status === 'approved' ? '100%' : '75%'}
                    </span>
                  </div>
                  <Progress 
                    value={
                      onboardingStatus?.status === 'not_started' ? 0 : 
                      onboardingStatus?.status === 'pending' ? 50 : 
                      onboardingStatus?.brand_status === 'approved' && onboardingStatus?.campaign_status === 'approved' ? 100 : 75
                    } 
                    className="h-2"
                  />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Step 1: Business Info */}
                  <div className={`p-4 rounded-lg border ${onboardingStatus?.status !== 'not_started' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {onboardingStatus?.status !== 'not_started' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                      <span className="font-medium text-sm">Business Info</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Register your business details</p>
                  </div>

                  {/* Step 2: Brand Registration */}
                  <div className={`p-4 rounded-lg border ${onboardingStatus?.brand_status === 'approved' ? 'bg-green-50 border-green-200' : onboardingStatus?.brand_status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {onboardingStatus?.brand_status === 'approved' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : onboardingStatus?.brand_status === 'pending' ? (
                        <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                      <span className="font-medium text-sm">Brand Registration</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Verify with Twilio Trust Hub</p>
                  </div>

                  {/* Step 3: Campaign Registration */}
                  <div className={`p-4 rounded-lg border ${onboardingStatus?.campaign_status === 'approved' ? 'bg-green-50 border-green-200' : onboardingStatus?.campaign_status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {onboardingStatus?.campaign_status === 'approved' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : onboardingStatus?.campaign_status === 'pending' ? (
                        <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                      <span className="font-medium text-sm">Campaign Registration</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Register messaging use case</p>
                  </div>

                  {/* Step 4: Number Association */}
                  <div className={`p-4 rounded-lg border ${onboardingStatus?.phone_number ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {onboardingStatus?.phone_number ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                      <span className="font-medium text-sm">Number Association</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Link phone number to campaign</p>
                  </div>
                </div>

                {/* Info Box */}
                {onboardingStatus?.status === 'not_started' && (
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                    <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Why is this required?</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        A2P 10DLC registration is required by US carriers to send business SMS messages. 
                        This process verifies your business and messaging use case to ensure compliance 
                        and improve message deliverability.
                      </p>
                    </div>
                  </div>
                )}

                {onboardingStatus?.status === 'pending' && (
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Registration Under Review</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your registration is being reviewed. This typically takes 1-7 business days. 
                        We'll notify you once your registration is approved.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Funded Deals Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Funded</p>
                  <p className="text-3xl font-bold mt-1 font-['Outfit']">
                    ${loading ? '-' : (fundedStats?.total_funded_volume || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Collected</p>
                  <p className="text-3xl font-bold mt-1 font-['Outfit']">
                    ${loading ? '-' : (fundedStats?.total_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Remaining Balance</p>
                  <p className="text-3xl font-bold mt-1 font-['Outfit']">
                    ${loading ? '-' : (fundedStats?.total_outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Row */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.total_messages_sent}</p>
                  <p className="text-xs text-muted-foreground">Messages Sent</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.total_replies}</p>
                  <p className="text-xs text-muted-foreground">Replies Received</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.response_rate}%</p>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.campaigns_active}</p>
                  <p className="text-xs text-muted-foreground">Active Campaigns</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Follow-ups */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-['Outfit'] flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Today's Follow-ups
                  </CardTitle>
                  <CardDescription>Contacts requiring your attention today</CardDescription>
                </div>
                <Link to="/calendar">
                  <Button variant="ghost" size="sm" className="text-primary">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {todayFollowups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No follow-ups scheduled for today</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {todayFollowups.map((followup) => (
                      <div 
                        key={followup.id} 
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            followup.reminder_type === 'call' ? 'bg-blue-100' : 
                            followup.reminder_type === 'sms' ? 'bg-green-100' : 'bg-purple-100'
                          }`}>
                            {followup.reminder_type === 'call' ? (
                              <Phone className="h-5 w-5 text-blue-600" />
                            ) : followup.reminder_type === 'sms' ? (
                              <MessageSquare className="h-5 w-5 text-green-600" />
                            ) : (
                              <Mail className="h-5 w-5 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{followup.client_name}</p>
                            <p className="text-sm text-muted-foreground">{followup.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {followup.scheduled_time}
                              </Badge>
                              {followup.priority === 'high' && (
                                <Badge className="bg-red-100 text-red-700 text-xs">High Priority</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleSnoozeFollowup(followup.id)}
                            title="Snooze until tomorrow"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleCompleteFollowup(followup.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Done
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
                <Button variant="outline" className="w-full justify-start h-auto py-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center mr-3">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Add New Client</p>
                    <p className="text-xs text-muted-foreground">Add a customer</p>
                  </div>
                </Button>
              </Link>
              
              <Link to="/reminders" className="block">
                <Button variant="outline" className="w-full justify-start h-auto py-3">
                  <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center mr-3">
                    <Bell className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Schedule Reminder</p>
                    <p className="text-xs text-muted-foreground">Payment reminder</p>
                  </div>
                </Button>
              </Link>
              
              <Link to="/drip-campaigns" className="block">
                <Button variant="outline" className="w-full justify-start h-auto py-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center mr-3">
                    <Zap className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Create Drip Campaign</p>
                    <p className="text-xs text-muted-foreground">Automated sequences</p>
                  </div>
                </Button>
              </Link>

              <Link to="/contacts" className="block">
                <Button variant="outline" className="w-full justify-start h-auto py-3">
                  <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center mr-3">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Send Message</p>
                    <p className="text-xs text-muted-foreground">SMS or template</p>
                  </div>
                </Button>
              </Link>

              <Link to="/analytics" className="block">
                <Button variant="outline" className="w-full justify-start h-auto py-3">
                  <div className="h-8 w-8 rounded-lg bg-cyan-50 flex items-center justify-center mr-3">
                    <BarChart3 className="h-4 w-4 text-cyan-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">View Analytics</p>
                    <p className="text-xs text-muted-foreground">Performance metrics</p>
                  </div>
                </Button>
              </Link>
              
              <Link to="/settings" className="block">
                <Button variant="outline" className="w-full justify-start h-auto py-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                    <TrendingUp className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Connect SMS Provider</p>
                    <p className="text-xs text-muted-foreground">Twilio, Telnyx, etc.</p>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.recent_reminders.slice(0, 6).map((reminder) => (
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
                          ${reminder.amount_due?.toFixed(2) || '0.00'}
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
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
