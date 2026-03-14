import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  MessageSquare,
  DollarSign,
  Clock,
  Send,
  FileText,
  Activity,
  Sparkles,
  RefreshCw,
  PhoneCall
} from 'lucide-react';
import { clientProfileApi } from '../lib/api';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [clientId]);

  const fetchProfile = async () => {
    try {
      const res = await clientProfileApi.getProfile(clientId);
      setProfile(res.data);
    } catch (error) {
      toast.error('Failed to load client profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSummary = async () => {
    setAiLoading(true);
    try {
      const res = await clientProfileApi.getAiSummary(clientId);
      setAiSummary(res.data);
    } catch (error) {
      toast.error('Failed to generate AI summary');
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCall = async () => {
    if (!profile?.client?.phone) {
      toast.error('No phone number available');
      return;
    }
    try {
      await axios.post(`${API}/calls/initiate`, {
        to: profile.client.phone,
        from: '+1234567890' // Default number
      });
      toast.success(`Calling ${profile.client.name}...`);
    } catch (error) {
      toast.error('Failed to initiate call');
    }
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

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client not found</p>
          <Button className="mt-4" onClick={() => navigate('/clients')}>
            Back to Clients
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { client, messages, deals, reminders, activities, owner, stats } = profile;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="client-profile-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-['Outfit']">{client.name}</h1>
            <p className="text-muted-foreground">{client.company || 'No company'}</p>
          </div>
          <Button onClick={() => navigate(`/clients/${clientId}/edit`)}>
            Edit Client
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{stats.total_messages}</span>
              </div>
              <p className="text-sm text-muted-foreground">Messages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{stats.total_deals}</span>
              </div>
              <p className="text-sm text-muted-foreground">Deals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">
                  {stats.last_contact 
                    ? new Date(stats.last_contact).toLocaleDateString() 
                    : 'Never'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Last Contact</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium truncate">{owner?.name || 'Unknown'}</span>
              </div>
              <p className="text-sm text-muted-foreground">Owner</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.company && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{client.company}</span>
                </div>
              )}
              {client.birthday && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{client.birthday}</span>
                </div>
              )}
              
              {/* Tags */}
              {client.tags?.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {client.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {client.notes && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="messages">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="deals">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Deals
                </TabsTrigger>
                <TabsTrigger value="reminders">
                  <Clock className="h-4 w-4 mr-2" />
                  Reminders
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {/* Messages Tab */}
              <TabsContent value="messages">
                <Card>
                  <CardContent className="pt-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No messages yet
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {messages.map((msg) => (
                          <div 
                            key={msg.id} 
                            className={`p-3 rounded-lg ${
                              msg.direction === 'outbound' 
                                ? 'bg-primary/10 ml-8' 
                                : 'bg-muted mr-8'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {msg.direction === 'outbound' ? (
                                <Send className="h-3 w-3 text-primary" />
                              ) : (
                                <MessageSquare className="h-3 w-3" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Deals Tab */}
              <TabsContent value="deals">
                <Card>
                  <CardContent className="pt-4">
                    {deals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No deals yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deals.map((deal) => (
                          <div key={deal.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{deal.business_name}</span>
                              <Badge>{deal.status}</Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>${deal.amount?.toLocaleString() || 0}</span>
                              <span>{new Date(deal.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reminders Tab */}
              <TabsContent value="reminders">
                <Card>
                  <CardContent className="pt-4">
                    {reminders.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No reminders
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reminders.map((reminder) => (
                          <div key={reminder.id} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span>{reminder.message}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(reminder.scheduled_date).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity">
                <Card>
                  <CardContent className="pt-4">
                    {activities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No activity recorded
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-2">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                            <div>
                              <p className="text-sm">{activity.action}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(activity.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientProfile;
