import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  Tag,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Edit,
  Clock,
  Send,
  FileText,
  Gift,
  Zap
} from 'lucide-react';
import { clientsApi, contactsApi } from '../lib/api';
import { toast } from 'sonner';

const AVAILABLE_TAGS = [
  { value: "New Lead", color: "bg-blue-100 text-blue-700" },
  { value: "Contacted", color: "bg-purple-100 text-purple-700" },
  { value: "Responded", color: "bg-cyan-100 text-cyan-700" },
  { value: "Interested", color: "bg-green-100 text-green-700" },
  { value: "Not Interested", color: "bg-gray-100 text-gray-700" },
  { value: "Follow Up", color: "bg-yellow-100 text-yellow-700" },
  { value: "Application Sent", color: "bg-indigo-100 text-indigo-700" },
  { value: "Docs Submitted", color: "bg-orange-100 text-orange-700" },
  { value: "Approved", color: "bg-emerald-100 text-emerald-700" },
  { value: "Funded", color: "bg-green-100 text-green-800 font-semibold" },
  { value: "Lost Deal", color: "bg-red-100 text-red-700" },
];

const getTagColor = (tag) => {
  const found = AVAILABLE_TAGS.find(t => t.value === tag);
  return found ? found.color : "bg-gray-100 text-gray-700";
};

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClient();
      fetchConversation();
    }
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await clientsApi.getOne(clientId);
      setClient(response.data);
      setNotes(response.data.notes || '');
      setAiSummary(response.data.ai_summary);
    } catch (error) {
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversation = async () => {
    try {
      const response = await contactsApi.getConversation(clientId);
      setConversation(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch conversation');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await clientsApi.update(clientId, { notes });
      toast.success('Notes saved!');
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await clientsApi.generateSummary(clientId);
      if (response.data.generated) {
        setAiSummary(response.data.summary);
        toast.success('AI summary generated!');
      } else {
        toast.info(response.data.summary);
      }
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const formatAddress = () => {
    if (!client) return null;
    const parts = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.zip_code].filter(Boolean).join(', '),
      client.country
    ].filter(Boolean);
    return parts.length > 0 ? parts : null;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client not found</p>
          <Button onClick={() => navigate('/clients')} className="mt-4">Back to Clients</Button>
        </div>
      </DashboardLayout>
    );
  }

  const address = formatAddress();

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="client-profile-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold font-['Outfit']">{client.name}</h1>
            <p className="text-muted-foreground">{client.company || 'No company'}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/contacts?client=${clientId}`}>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            </Link>
            <Link to="/gift-store">
              <Button variant="outline">
                <Gift className="h-4 w-4 mr-2" />
                Send Gift
              </Button>
            </Link>
            <Link to={`/clients`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Client Info */}
          <div className="space-y-6">
            {/* Contact Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">Client</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                  
                  {client.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  
                  {client.company && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{client.company}</span>
                    </div>
                  )}
                  
                  {client.birthday && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Birthday: {new Date(client.birthday).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Balance */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Balance Owed</span>
                    <span className="text-xl font-bold text-primary">
                      ${client.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Address
                </CardTitle>
                <CardDescription>Required for gift shop deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                {address ? (
                  <div className="text-sm space-y-1">
                    {address.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No address on file</p>
                )}
              </CardContent>
            </Card>

            {/* Tags Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.tags?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map((tag) => (
                      <Badge key={tag} className={getTagColor(tag)}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags assigned</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Notes & AI Summary */}
          <div className="space-y-6">
            {/* AI Summary Card */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    AI Conversation Summary
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                  >
                    {generatingSummary ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">{aiSummary ? 'Refresh' : 'Generate'}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiSummary ? (
                  <p className="text-sm leading-relaxed">{aiSummary}</p>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Click "Generate" to create an AI summary</p>
                    <p className="text-xs mt-1">Based on your conversation history</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </CardTitle>
                <CardDescription>Keep track of important details about this client</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this client...

Examples:
- Needs $120k working capital
- Credit around 650
- Processing $60k/month
- Prefers morning calls"
                  rows={8}
                  className="resize-none"
                  data-testid="client-notes-textarea"
                />
                <Button 
                  onClick={handleSaveNotes} 
                  disabled={savingNotes}
                  className="w-full"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Conversation History */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Conversation History
                  </CardTitle>
                  <Link to={`/contacts`}>
                    <Button variant="outline" size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      Open Inbox
                    </Button>
                  </Link>
                </div>
                <CardDescription>{conversation.length} messages</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  {conversation.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet</p>
                      <Link to="/contacts">
                        <Button className="mt-4" size="sm">
                          Start Conversation
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversation.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`
                            max-w-[85%] rounded-lg p-3 text-sm
                            ${msg.direction === 'outbound' 
                              ? 'bg-primary text-white rounded-br-none' 
                              : 'bg-secondary rounded-bl-none'
                            }
                          `}>
                            <p>{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${
                              msg.direction === 'outbound' ? 'text-white/70' : 'text-muted-foreground'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {new Date(msg.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientProfile;
