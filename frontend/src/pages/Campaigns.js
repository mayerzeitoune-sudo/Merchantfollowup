import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  Zap,
  Play,
  Pause,
  Pencil,
  Trash2,
  MessageSquare,
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { campaignsApi, aiApi } from '../lib/api';
import { toast } from 'sonner';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initial_message: '',
    triggers: [],
    delay_hours: 24,
    follow_up_messages: [''],
    status: 'draft'
  });
  const [newTrigger, setNewTrigger] = useState({
    keywords: '',
    response_message: '',
    action: 'reply'
  });

  // AI Test state
  const [testMessage, setTestMessage] = useState('');
  const [testKeywords, setTestKeywords] = useState('yes, yea, yeah, sure, ok');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await campaignsApi.getAll();
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        follow_up_messages: formData.follow_up_messages.filter(m => m.trim())
      };
      
      if (editingCampaign) {
        await campaignsApi.update(editingCampaign.id, payload);
        toast.success('Campaign updated');
      } else {
        await campaignsApi.create(payload);
        toast.success('Campaign created');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      initial_message: campaign.initial_message,
      triggers: campaign.triggers || [],
      delay_hours: campaign.delay_hours,
      follow_up_messages: campaign.follow_up_messages.length > 0 ? campaign.follow_up_messages : [''],
      status: campaign.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await campaignsApi.delete(id);
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleToggleStatus = async (campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await campaignsApi.update(campaign.id, { status: newStatus });
      toast.success(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'}`);
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to update campaign status');
    }
  };

  const resetForm = () => {
    setEditingCampaign(null);
    setFormData({
      name: '',
      description: '',
      initial_message: '',
      triggers: [],
      delay_hours: 24,
      follow_up_messages: [''],
      status: 'draft'
    });
    setNewTrigger({ keywords: '', response_message: '', action: 'reply' });
  };

  const addTrigger = () => {
    if (!newTrigger.keywords || !newTrigger.response_message) {
      toast.error('Please fill in keywords and response');
      return;
    }
    const trigger = {
      keywords: newTrigger.keywords.split(',').map(k => k.trim()).filter(k => k),
      response_message: newTrigger.response_message,
      action: newTrigger.action
    };
    setFormData({
      ...formData,
      triggers: [...formData.triggers, trigger]
    });
    setNewTrigger({ keywords: '', response_message: '', action: 'reply' });
  };

  const removeTrigger = (index) => {
    setFormData({
      ...formData,
      triggers: formData.triggers.filter((_, i) => i !== index)
    });
  };

  const addFollowUpMessage = () => {
    setFormData({
      ...formData,
      follow_up_messages: [...formData.follow_up_messages, '']
    });
  };

  const updateFollowUpMessage = (index, value) => {
    const updated = [...formData.follow_up_messages];
    updated[index] = value;
    setFormData({ ...formData, follow_up_messages: updated });
  };

  const removeFollowUpMessage = (index) => {
    setFormData({
      ...formData,
      follow_up_messages: formData.follow_up_messages.filter((_, i) => i !== index)
    });
  };

  const handleTestAI = async () => {
    if (!testMessage || !testKeywords) {
      toast.error('Enter both a message and keywords to test');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const keywords = testKeywords.split(',').map(k => k.trim()).filter(k => k);
      const response = await aiApi.matchResponse(testMessage, keywords);
      setTestResult(response.data);
    } catch (error) {
      toast.error('AI test failed');
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Paused</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="campaigns-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Drip Campaigns</h1>
            <p className="text-muted-foreground mt-1">Create automated SMS sequences with smart replies</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" data-testid="add-campaign-btn">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-['Outfit']">
                  {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
                </DialogTitle>
                <DialogDescription>
                  Build your drip campaign with automated responses
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="triggers">Triggers</TabsTrigger>
                    <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Campaign Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Payment Reminder Sequence"
                        required
                        data-testid="campaign-name-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe your campaign..."
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="initial_message">Initial Message *</Label>
                      <Textarea
                        id="initial_message"
                        value={formData.initial_message}
                        onChange={(e) => setFormData({ ...formData, initial_message: e.target.value })}
                        placeholder="Hi {name}, this is a reminder about your payment of ${amount}. Reply YES to confirm or LATER to reschedule."
                        rows={3}
                        required
                        data-testid="campaign-initial-message-input"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use {'{name}'}, {'{amount}'}, {'{date}'} as placeholders
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="triggers" className="space-y-4 mt-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-purple-900">AI-Powered Matching</p>
                          <p className="text-sm text-purple-700">
                            Triggers use AI to match similar responses. For example, "yes", "yea", "yeah", "sure" will all match the "yes" keyword.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Existing triggers */}
                    {formData.triggers.length > 0 && (
                      <div className="space-y-2">
                        <Label>Current Triggers</Label>
                        <div className="space-y-2">
                          {formData.triggers.map((trigger, index) => (
                            <div key={index} className="flex items-start gap-2 p-3 bg-secondary rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  Keywords: {trigger.keywords.join(', ')}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  <ArrowRight className="h-3 w-3 inline mr-1" />
                                  {trigger.response_message}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeTrigger(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add new trigger */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <Label>Add New Trigger</Label>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Keywords (comma separated)</Label>
                          <Input
                            value={newTrigger.keywords}
                            onChange={(e) => setNewTrigger({ ...newTrigger, keywords: e.target.value })}
                            placeholder="yes, confirm, sure, ok"
                            data-testid="trigger-keywords-input"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Response Message</Label>
                          <Textarea
                            value={newTrigger.response_message}
                            onChange={(e) => setNewTrigger({ ...newTrigger, response_message: e.target.value })}
                            placeholder="Great! We've received your confirmation..."
                            rows={2}
                            data-testid="trigger-response-input"
                          />
                        </div>
                        <Button type="button" variant="outline" onClick={addTrigger} data-testid="add-trigger-btn">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Trigger
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="followups" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="delay">Delay Between Messages (hours)</Label>
                      <Input
                        id="delay"
                        type="number"
                        value={formData.delay_hours}
                        onChange={(e) => setFormData({ ...formData, delay_hours: parseInt(e.target.value) || 24 })}
                        min="1"
                        max="168"
                        data-testid="campaign-delay-input"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Follow-up Messages</Label>
                      {formData.follow_up_messages.map((message, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium text-sm">{index + 1}</span>
                          </div>
                          <Textarea
                            value={message}
                            onChange={(e) => updateFollowUpMessage(index, e.target.value)}
                            placeholder={`Follow-up message ${index + 1}...`}
                            rows={2}
                            className="flex-1"
                          />
                          {formData.follow_up_messages.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => removeFollowUpMessage(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addFollowUpMessage}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Follow-up
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" data-testid="save-campaign-btn">
                    {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* AI Test Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-zinc-900 border-purple-100 dark:border-purple-900">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle className="font-['Outfit'] text-lg">Test AI Response Matching</CardTitle>
            </div>
            <CardDescription>
              Test how the AI matches incoming messages to your keywords
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Incoming Message</Label>
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="yea sure, I'll pay tomorrow"
                  data-testid="ai-test-message-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Keywords to Match</Label>
                <Input
                  value={testKeywords}
                  onChange={(e) => setTestKeywords(e.target.value)}
                  placeholder="yes, confirm, sure"
                  data-testid="ai-test-keywords-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="opacity-0">Action</Label>
                <Button 
                  onClick={handleTestAI} 
                  disabled={testing}
                  className="w-full"
                  data-testid="ai-test-btn"
                >
                  {testing ? 'Testing...' : 'Test Match'}
                </Button>
              </div>
            </div>
            {testResult && (
              <div className={`mt-4 p-4 rounded-lg ${testResult.matched ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-medium ${testResult.matched ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.matched ? '✓ Match Found!' : '✗ No Match'}
                </p>
                {testResult.matched && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Matched keyword: <span className="font-medium">{testResult.matched_keyword}</span>
                    {' '}(Confidence: {(testResult.confidence * 100).toFixed(0)}%)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-muted-foreground">Loading...</p>
          ) : campaigns.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="text-center py-12">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">No campaigns yet</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-['Outfit'] text-lg">{campaign.name}</CardTitle>
                      <CardDescription className="line-clamp-1">
                        {campaign.description || 'No description'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      <span>{campaign.triggers?.length || 0} triggers</span>
                      <span className="text-border">•</span>
                      <Clock className="h-4 w-4" />
                      <span>{campaign.delay_hours}h delay</span>
                    </div>
                    
                    <div className="p-2 bg-secondary/50 rounded text-sm">
                      <p className="line-clamp-2 text-muted-foreground">
                        {campaign.initial_message}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleToggleStatus(campaign)}
                      >
                        {campaign.status === 'active' ? (
                          <><Pause className="h-3 w-3 mr-1" /> Pause</>
                        ) : (
                          <><Play className="h-3 w-3 mr-1" /> Activate</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(campaign)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Campaigns;
