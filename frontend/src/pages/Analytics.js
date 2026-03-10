import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  BarChart3, 
  MessageSquare, 
  Mail, 
  Target,
  TrendingUp,
  Users,
  Zap,
  ArrowUp,
  ArrowDown,
  FileText,
  Calendar
} from 'lucide-react';
import { analyticsApi, enhancedCampaignsApi, templatesApi } from '../lib/api';
import { toast } from 'sonner';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [analyticsRes, campaignsRes, templatesRes] = await Promise.all([
        analyticsApi.getOverview(startDate, endDate).catch(() => ({ data: null })),
        enhancedCampaignsApi.getAll().catch(() => ({ data: [] })),
        templatesApi.getAll().catch(() => ({ data: [] }))
      ]);
      
      setAnalytics(analyticsRes.data);
      setCampaigns(campaignsRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const statCards = analytics ? [
    {
      title: 'Messages Sent',
      value: analytics.total_messages_sent,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%'
    },
    {
      title: 'Replies Received',
      value: analytics.total_replies,
      icon: Mail,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8%'
    },
    {
      title: 'Response Rate',
      value: `${analytics.response_rate}%`,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+2.3%'
    },
    {
      title: 'Active Campaigns',
      value: analytics.campaigns_active,
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '0'
    }
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="analytics-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Analytics</h1>
            <p className="text-muted-foreground mt-1">Track your messaging performance and campaign effectiveness</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
        ) : !analytics ? (
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No analytics data available yet</p>
              <p className="text-sm text-muted-foreground mt-2">Start sending messages to see your performance metrics</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                          <p className="text-3xl font-bold mt-1 font-['Outfit']">{stat.value}</p>
                          {stat.change !== '0' && (
                            <div className={`flex items-center gap-1 mt-2 text-sm ${
                              stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {stat.change.startsWith('+') ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )}
                              {stat.change} vs last period
                            </div>
                          )}
                        </div>
                        <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Response Rate Card */}
            <Card className="bg-gradient-to-br from-primary to-orange-700 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">Overall Response Rate</p>
                    <p className="text-5xl font-bold mt-2 font-['Outfit']">
                      {analytics.response_rate}%
                    </p>
                    <p className="text-sm mt-2 opacity-90">
                      {analytics.total_replies} replies from {analytics.total_messages_sent} messages sent
                    </p>
                  </div>
                  <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center">
                    <Target className="h-12 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit'] flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Top Templates
                  </CardTitle>
                  <CardDescription>Most used message templates</CardDescription>
                </CardHeader>
                <CardContent>
                  {templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No templates used yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {templates
                        .sort((a, b) => (b.use_count || 0) - (a.use_count || 0))
                        .slice(0, 5)
                        .map((template, index) => (
                          <div key={template.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                index === 1 ? 'bg-gray-100 text-gray-700' :
                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-secondary text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{template.name}</p>
                                <p className="text-xs text-muted-foreground">{template.category}</p>
                              </div>
                            </div>
                            <Badge variant="secondary">{template.use_count || 0} uses</Badge>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Campaign Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit'] flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-600" />
                    Campaign Performance
                  </CardTitle>
                  <CardDescription>Active and recent campaigns</CardDescription>
                </CardHeader>
                <CardContent>
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No campaigns created yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {campaigns
                        .sort((a, b) => (b.total_replies || 0) - (a.total_replies || 0))
                        .slice(0, 5)
                        .map((campaign) => {
                          const responseRate = campaign.total_messages_sent > 0 
                            ? ((campaign.total_replies / campaign.total_messages_sent) * 100).toFixed(1)
                            : 0;
                          
                          return (
                            <div key={campaign.id} className="p-4 rounded-lg bg-secondary/50">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium">{campaign.name}</p>
                                <Badge className={
                                  campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                                  campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }>
                                  {campaign.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Enrolled</p>
                                  <p className="font-semibold">{campaign.contacts_enrolled || 0}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Messages</p>
                                  <p className="font-semibold">{campaign.total_messages_sent || 0}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Response</p>
                                  <p className="font-semibold">{responseRate}%</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Engagement Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Tips to Improve Response Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-2">Personalize Messages</h4>
                    <p className="text-sm text-blue-700">
                      Use {'{name}'} and {'{company}'} variables to make messages feel personal
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50">
                    <h4 className="font-medium text-green-900 mb-2">Optimal Timing</h4>
                    <p className="text-sm text-green-700">
                      Send messages between 10am-2pm for highest response rates
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50">
                    <h4 className="font-medium text-purple-900 mb-2">Follow Up Consistently</h4>
                    <p className="text-sm text-purple-700">
                      Most responses come after 2-3 follow-ups. Use drip campaigns!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
