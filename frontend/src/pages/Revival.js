import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Plus, 
  RefreshCw,
  Play,
  Calendar,
  Users,
  MessageSquare,
  Mail,
  Clock,
  Trash2,
  BarChart3,
  Sparkles,
  Wand2,
  Send,
  Copy,
  Loader2
} from 'lucide-react';
import { revivalApi, segmentsApi, aiApi } from '../lib/api';
import { toast } from 'sonner';

const Revival = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [running, setRunning] = useState(null);
  
  // AI Assistant state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDaysInactive, setAiDaysInactive] = useState(30);
  const [aiLastStage, setAiLastStage] = useState('interested');
  const [aiIndustry, setAiIndustry] = useState('');
  const [aiApproach, setAiApproach] = useState('friendly');
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    days_inactive: 30,
    target_tags: [],
    exclude_tags: [],
    message: '',
    channel: 'sms'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, tagsRes] = await Promise.all([
        revivalApi.getCampaigns().catch(() => ({ data: [] })),
        segmentsApi.getAllTags().catch(() => ({ data: { tags: [] } }))
      ]);
      
      setCampaigns(campaignsRes.data || []);
      setTags(tagsRes.data?.tags || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      await revivalApi.createCampaign(formData);
      toast.success('Revival campaign created!');
      setDialogOpen(false);
      setFormData({
        name: '',
        days_inactive: 30,
        target_tags: [],
        exclude_tags: [],
        message: '',
        channel: 'sms'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create campaign');
    }
  };

  const handleRunCampaign = async (campaignId) => {
    setRunning(campaignId);
    try {
      const response = await revivalApi.runCampaign(campaignId);
      toast.success(`Sent ${response.data.messages_sent} revival messages!`);
      fetchData();
    } catch (error) {
      toast.error('Failed to run campaign');
    } finally {
      setRunning(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'running': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // AI Functions
  const handleAiGenerateRevival = async () => {
    setAiLoading(true);
    try {
      const response = await aiApi.generateRevivalMessage(aiDaysInactive, aiLastStage, aiIndustry, aiApproach, '');
      const newMessage = {
        role: 'assistant',
        content: response.data.message,
        subject: response.data.subject
      };
      setAiChatMessages(prev => [...prev, newMessage]);
      toast.success('Revival message generated!');
    } catch (error) {
      toast.error('Failed to generate message');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiChat = async () => {
    if (!aiInput.trim()) return;
    
    const userMessage = { role: 'user', content: aiInput };
    setAiChatMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setAiLoading(true);
    
    try {
      const response = await aiApi.chat(aiInput, 'revival');
      const assistantMessage = { role: 'assistant', content: response.data.response };
      setAiChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseAiMessage = (content) => {
    setFormData(prev => ({ ...prev, message: content }));
    setAiDialogOpen(false);
    setDialogOpen(true);
    toast.success('Message added to campaign');
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="revival-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Dead Lead Revival</h1>
            <p className="text-muted-foreground mt-1">
              Re-engage old leads who haven't responded in a while
            </p>
          </div>
          <div className="flex gap-2">
            {/* AI Assistant Button */}
            <Button variant="outline" onClick={() => setAiDialogOpen(true)} data-testid="ai-revival-btn">
              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
              AI Assistant
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Revival Campaign
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Revival Campaign</DialogTitle>
                <DialogDescription>
                  Send a message to re-engage leads who haven't responded
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Campaign Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 30-Day Revival"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Days Inactive</Label>
                  <Select
                    value={formData.days_inactive.toString()}
                    onValueChange={(value) => setFormData({ ...formData, days_inactive: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Target leads with no contact in this many days
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Target Tags (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 10).map((tag) => (
                      <Badge
                        key={tag.tag}
                        variant={formData.target_tags.includes(tag.tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const newTags = formData.target_tags.includes(tag.tag)
                            ? formData.target_tags.filter(t => t !== tag.tag)
                            : [...formData.target_tags, tag.tag];
                          setFormData({ ...formData, target_tags: newTags });
                        }}
                      >
                        {tag.tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(value) => setFormData({ ...formData, channel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Revival Message *</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Hey {name}, just checking in to see if you're still looking for funding this quarter..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{name}'} to personalize the message
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign}>
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Don't Let Leads Go Cold</p>
                <p className="text-2xl font-bold mt-2 font-['Outfit']">
                  Revive old leads with targeted re-engagement
                </p>
                <p className="text-sm mt-2 opacity-90">
                  Studies show 80% of sales require 5+ follow-ups. Don't give up too soon!
                </p>
              </div>
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <RefreshCw className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">No revival campaigns yet</p>
              <Button onClick={() => setDialogOpen(true)}>Create Your First Campaign</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-['Outfit']">{campaign.name}</CardTitle>
                      <CardDescription>
                        Targeting leads inactive for {campaign.days_inactive}+ days
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-2xl font-bold">{campaign.eligible_contacts}</p>
                      <p className="text-xs text-muted-foreground">Eligible</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-2xl font-bold">{campaign.messages_sent}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-2xl font-bold">{campaign.replies_received}</p>
                      <p className="text-xs text-muted-foreground">Replies</p>
                    </div>
                  </div>
                  
                  {/* Message Preview */}
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Message:</p>
                    <p className="text-sm line-clamp-2">{campaign.message}</p>
                  </div>
                  
                  {/* Tags */}
                  {campaign.target_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {campaign.target_tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Last Run */}
                  {campaign.last_run_at && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last run: {new Date(campaign.last_run_at).toLocaleDateString()}
                    </p>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleRunCampaign(campaign.id)}
                      disabled={running === campaign.id}
                    >
                      {running === campaign.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Campaign
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Outfit']">Revival Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-blue-50">
                <Calendar className="h-6 w-6 text-blue-600 mb-2" />
                <h4 className="font-medium text-blue-900 mb-1">30-Day Sweet Spot</h4>
                <p className="text-sm text-blue-700">
                  Leads 30-60 days old have the highest revival success rate
                </p>
              </div>
              <div className="p-4 rounded-lg bg-green-50">
                <MessageSquare className="h-6 w-6 text-green-600 mb-2" />
                <h4 className="font-medium text-green-900 mb-1">Personalize</h4>
                <p className="text-sm text-green-700">
                  Use their name and reference previous conversations
                </p>
              </div>
              <div className="p-4 rounded-lg bg-purple-50">
                <BarChart3 className="h-6 w-6 text-purple-600 mb-2" />
                <h4 className="font-medium text-purple-900 mb-1">Track Results</h4>
                <p className="text-sm text-purple-700">
                  Monitor reply rates to optimize your messaging
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-['Outfit'] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Revival Assistant
            </DialogTitle>
            <DialogDescription>
              Generate effective revival messages to re-engage inactive leads
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Quick Generate */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Quick Generate Revival Message
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Days Inactive</Label>
                    <Select value={aiDaysInactive.toString()} onValueChange={(v) => setAiDaysInactive(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Stage</Label>
                    <Select value={aiLastStage} onValueChange={setAiLastStage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_lead">New Lead</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="interested">Interested</SelectItem>
                        <SelectItem value="application_sent">Application Sent</SelectItem>
                        <SelectItem value="lost">Lost Deal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Approach</Label>
                    <Select value={aiApproach} onValueChange={setAiApproach}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly Check-in</SelectItem>
                        <SelectItem value="value">Value Proposition</SelectItem>
                        <SelectItem value="urgency">Create Urgency</SelectItem>
                        <SelectItem value="curiosity">Spark Curiosity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Industry (optional)</Label>
                    <Input
                      value={aiIndustry}
                      onChange={(e) => setAiIndustry(e.target.value)}
                      placeholder="e.g., Restaurant, Retail"
                    />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={handleAiGenerateRevival}
                  disabled={aiLoading}
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate Revival Message
                </Button>
              </CardContent>
            </Card>

            {/* Chat with AI */}
            <div className="space-y-2">
              <Label>Ask AI for Help</Label>
              <div className="flex gap-2">
                <Input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="e.g., Write a message to revive leads who stopped responding after we sent pricing..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
                />
                <Button onClick={handleAiChat} disabled={aiLoading || !aiInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat Messages */}
            {aiChatMessages.length > 0 && (
              <ScrollArea className="h-[250px] border rounded-lg p-4">
                <div className="space-y-3">
                  {aiChatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-lg ${
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {msg.subject && (
                          <p className="text-xs font-medium mb-1 opacity-70">Subject: {msg.subject}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === 'assistant' && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => handleUseAiMessage(msg.content)}>
                              Use This
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleCopy(msg.content)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Revival;
