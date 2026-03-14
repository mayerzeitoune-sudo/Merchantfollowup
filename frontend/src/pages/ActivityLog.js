import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Activity, 
  User, 
  MessageSquare, 
  DollarSign, 
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { activityApi } from '../lib/api';
import { toast } from 'sonner';

const ActivityLog = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const entityType = filter === 'all' ? null : filter;
      const res = await activityApi.getLog(100, entityType);
      setActivities(res.data || []);
    } catch (error) {
      toast.error('Failed to load activity log');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    if (action?.includes('message') || action?.includes('sms')) {
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
    if (action?.includes('deal') || action?.includes('payment')) {
      return <DollarSign className="h-4 w-4 text-green-500" />;
    }
    if (action?.includes('client') || action?.includes('contact')) {
      return <User className="h-4 w-4 text-purple-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getActionColor = (action) => {
    if (action?.includes('created') || action?.includes('added')) return 'bg-green-100 text-green-700';
    if (action?.includes('updated') || action?.includes('modified')) return 'bg-blue-100 text-blue-700';
    if (action?.includes('deleted') || action?.includes('removed')) return 'bg-red-100 text-red-700';
    if (action?.includes('sent')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="activity-log-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Activity Log</h1>
            <p className="text-muted-foreground mt-1">Track all actions and changes in your account</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="deal">Deals</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={fetchActivities}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Activity List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Showing the last {activities.length} activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div 
                    key={activity.id || index}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Icon */}
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mt-1">
                      {getActionIcon(activity.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{activity.user_name || 'System'}</span>
                        <Badge className={getActionColor(activity.action)} variant="secondary">
                          {activity.action}
                        </Badge>
                      </div>
                      
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {Object.entries(activity.details).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          ))}
                        </div>
                      )}

                      {activity.entity_type && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {activity.entity_type}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {new Date(activity.created_at).toLocaleString()}
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

export default ActivityLog;
