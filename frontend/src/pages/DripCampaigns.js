import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Plus, 
  Zap, 
  Play,
  Pause,
  Trash2,
  Users,
  MessageSquare,
  Mail,
  Clock,
  ArrowRight,
  StopCircle,
  RotateCcw,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Edit,
  Copy,
  Sparkles,
  Wand2,
  Send,
  Loader2,
  X
} from 'lucide-react';
import { enhancedCampaignsApi, clientsApi, segmentsApi, aiApi } from '../lib/api';
import { toast } from 'sonner';

const DripCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [tags, setTags] = useState([]);
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  
  // AI Assistant state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGoal, setAiGoal] = useState('nurture');
  const [aiNumMessages, setAiNumMessages] = useState(5);
  const [aiIndustry, setAiIndustry] = useState('');
  const [aiGeneratedSequence, setAiGeneratedSequence] = useState(null);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  
  // AI Trigger state
  const [aiTriggerLoading, setAiTriggerLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [],
    triggers: [],
    stop_on_reply: true,
    target_tags: [],
    status: 'draft'
  });

  useEffect(() => {
    fetchCampaigns();
    fetchClients();
    fetchTags();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await enhancedCampaignsApi.getAll();
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientsApi.getAll();
      setClients(response.data || []);
    } catch (error) {
      console.error('Failed to fetch clients');
    }
  };

  const fetchTags = async () => {
    try {
      const response = await segmentsApi.getAllTags();
      setTags(response.data?.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags');
    }
  };

  const fetchEnrollments = async (campaignId) => {
    try {
      const response = await enhancedCampaignsApi.getEnrollments(campaignId);
      setEnrollments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch enrollments');
    }
  };

  const handleCreateCampaign = async () => {
    try {
      await enhancedCampaignsApi.create(formData);
      toast.success('Campaign created successfully!');
      setIsDialogOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create campaign');
    }
  };

  const handleUpdateCampaign = async () => {
    try {
      await enhancedCampaignsApi.update(selectedCampaign.id, formData);
      toast.success('Campaign updated successfully!');
      setIsDialogOpen(false);
      setSelectedCampaign(null);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await enhancedCampaignsApi.delete(id);
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleActivateCampaign = async (campaign) => {
    try {
      await enhancedCampaignsApi.update(campaign.id, { status: 'active' });
      toast.success('Campaign activated!');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to activate campaign');
    }
  };

  const handlePauseCampaign = async (campaign) => {
    try {
      await enhancedCampaignsApi.update(campaign.id, { status: 'paused' });
      toast.success('Campaign paused');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to pause campaign');
    }
  };

  const handleEnrollContacts = async () => {
    if (selectedClients.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }
    
    try {
      await enhancedCampaignsApi.enrollContacts(selectedCampaign.id, selectedClients);
      toast.success(`Enrolled ${selectedClients.length} contacts`);
      setEnrollDialogOpen(false);
      setSelectedClients([]);
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to enroll contacts');
    }
  };

  const handleStopForContact = async (campaignId, clientId) => {
    try {
      await enhancedCampaignsApi.stopForContact(campaignId, clientId, 'manual');
      toast.success('Campaign stopped for contact');
      fetchEnrollments(campaignId);
    } catch (error) {
      toast.error('Failed to stop campaign');
    }
  };

  const handleResumeForContact = async (campaignId, clientId) => {
    try {
      await enhancedCampaignsApi.resumeForContact(campaignId, clientId);
      toast.success('Campaign resumed for contact');
      fetchEnrollments(campaignId);
    } catch (error) {
      toast.error('Failed to resume campaign');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      steps: [],
      triggers: [],
      stop_on_reply: true,
      target_tags: [],
      status: 'draft'
    });
  };

  // AI Functions
  const handleAiGenerateSequence = async () => {
    setAiLoading(true);
    try {
      const response = await aiApi.generateDripSequence(aiGoal, aiNumMessages, aiIndustry, '');
      setAiGeneratedSequence(response.data.sequence);
      toast.success('Sequence generated!');
    } catch (error) {
      toast.error('Failed to generate sequence');
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
      const response = await aiApi.chat(aiInput, 'drip_campaigns');
      const assistantMessage = { role: 'assistant', content: response.data.response };
      setAiChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseAiSequence = () => {
    if (!aiGeneratedSequence) return;
    
    const steps = aiGeneratedSequence.map((step, index) => ({
      id: `step-${Date.now()}-${index}`,
      order: index,
      channel: step.channel || 'sms',
      message: step.message,
      delay_days: step.delay_days || 0,
      delay_hours: step.delay_hours || 0,
      delay_minutes: 0,
      subject: step.subject || ''
    }));
    
    setFormData(prev => ({ ...prev, steps }));
    setAiDialogOpen(false);
    setIsDialogOpen(true);
    toast.success('Sequence added to campaign');
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, {
        id: `step-${Date.now()}`,
        order: formData.steps.length,
        channel: 'sms',
        message: '',
        delay_days: formData.steps.length === 0 ? 0 : 3,
        delay_hours: 0,
        delay_minutes: 0,
        subject: ''
      }]
    });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
  };

  const addTrigger = () => {
    setFormData({
      ...formData,
      triggers: [...formData.triggers, {
        keywords: [],
        action: 'stop',
        response_message: ''
      }]
    });
  };

  // AI Generate Triggers
  const handleAiGenerateTriggers = async () => {
    setAiTriggerLoading(true);
    try {
      const response = await aiApi.chat(
        `Generate 4 keyword triggers for a ${aiGoal} drip campaign${aiIndustry ? ` in the ${aiIndustry} industry` : ''}. 
        For each trigger, provide:
        1. A list of keywords that indicate positive interest (like "yes", "interested", "tell me more")
        2. A list of keywords that indicate negative response (like "no", "stop", "not interested")
        3. A list of keywords that request more information (like "how much", "pricing", "details")
        4. A list of keywords that indicate urgency (like "asap", "today", "urgent")
        
        Format as JSON array with objects containing: keywords (array), action ("stop" or "send_response"), response_message (string).`,
        'triggers'
      );
      
      // Try to parse the response as JSON
      try {
        const content = response.data.response;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const triggers = JSON.parse(jsonMatch[0]);
          setFormData({ ...formData, triggers: [...formData.triggers, ...triggers] });
          toast.success('AI triggers added!');
        } else {
          // If not JSON, add as a single trigger with the response as keywords
          toast.info('AI generated suggestions - please review and customize');
        }
      } catch (parseError) {
        toast.info('AI generated suggestions - check the response');
      }
    } catch (error) {
      toast.error('Failed to generate triggers');
    } finally {
      setAiTriggerLoading(false);
    }
  };

  // AI Generate Response for a trigger
  const handleAiGenerateResponse = async (triggerIndex) => {
    const trigger = formData.triggers[triggerIndex];
    if (!trigger.keywords.length) {
      toast.error('Add keywords first');
      return;
    }
    
    setAiTriggerLoading(true);
    try {
      const response = await aiApi.chat(
        `Generate a friendly, professional response message for when someone replies with these keywords: ${trigger.keywords.join(', ')}. 
        The response should be concise (under 160 characters for SMS), warm, and move the conversation forward.
        Just provide the message text, nothing else.`,
        'trigger_response'
      );
      
      const newTriggers = [...formData.triggers];
      newTriggers[triggerIndex].response_message = response.data.response.trim().replace(/^["']|["']$/g, '');
      newTriggers[triggerIndex].action = 'send_response';
      setFormData({ ...formData, triggers: newTriggers });
      toast.success('Response generated!');
    } catch (error) {
      toast.error('Failed to generate response');
    } finally {
      setAiTriggerLoading(false);
    }
  };

  const editCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      steps: campaign.steps || [],
      triggers: campaign.triggers || [],
      stop_on_reply: campaign.stop_on_reply,
      target_tags: campaign.target_tags || [],
      status: campaign.status
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="drip-campaigns-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Drip Campaigns</h1>
            <p className="text-muted-foreground mt-1">Automated follow-up sequences that stop on reply</p>
          </div>
          <div className="flex gap-2">
            {/* AI Assistant Button */}
            <Button variant="outline" onClick={() => setAiDialogOpen(true)} data-testid="ai-drip-btn">
              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
              AI Assistant
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setSelectedCampaign(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90" data-testid="create-campaign-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-['Outfit']">
                  {selectedCampaign ? 'Edit Campaign' : 'Create Drip Campaign'}
                </DialogTitle>
                <DialogDescription>
                  Build an automated sequence of messages with smart triggers
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basics" className="mt-4">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="basics">Basics</TabsTrigger>
                  <TabsTrigger value="steps">Steps ({formData.steps.length})</TabsTrigger>
                  <TabsTrigger value="triggers">Triggers</TabsTrigger>
                </TabsList>
                
                {/* Basics Tab */}
                <TabsContent value="basics" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Campaign Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., New Lead Follow-up"
                      data-testid="campaign-name-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this campaign does..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">Stop on Reply</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically stop the campaign when a contact replies
                      </p>
                    </div>
                    <Switch
                      checked={formData.stop_on_reply}
                      onCheckedChange={(checked) => setFormData({ ...formData, stop_on_reply: checked })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Target Tags (optional)</Label>
                    <p className="text-sm text-muted-foreground">
                      Only contacts with these tags will be enrolled
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
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
                </TabsContent>
                
                {/* Steps Tab */}
                <TabsContent value="steps" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Add messages to send in sequence. Day 0 = immediately on enrollment.
                    </p>
                    <Button onClick={addStep} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Step
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4 pr-4">
                      {formData.steps.map((step, index) => (
                        <Card key={step.id || index}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Step {index + 1}</Badge>
                                <Badge className={step.channel === 'sms' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}>
                                  {step.channel === 'sms' ? <MessageSquare className="h-3 w-3 mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                                  {step.channel.toUpperCase()}
                                </Badge>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeStep(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <Label>Channel</Label>
                                <Select
                                  value={step.channel}
                                  onValueChange={(value) => updateStep(index, 'channel', value)}
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
                                <Label>Delay (days)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={step.delay_days}
                                  onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                            
                            {step.channel === 'email' && (
                              <div className="space-y-2 mb-4">
                                <Label>Subject Line</Label>
                                <Input
                                  value={step.subject || ''}
                                  onChange={(e) => updateStep(index, 'subject', e.target.value)}
                                  placeholder="Email subject..."
                                />
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <Label>Message</Label>
                              <Textarea
                                value={step.message}
                                onChange={(e) => updateStep(index, 'message', e.target.value)}
                                placeholder={`Day ${step.delay_days}: "Hey {name}, just checking in..."`}
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground">
                                Variables: {'{name}'}, {'{company}'}, {'{balance}'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {formData.steps.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No steps added yet</p>
                          <Button onClick={addStep} className="mt-4">Add First Step</Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                {/* Triggers Tab */}
                <TabsContent value="triggers" className="space-y-4 mt-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-500" />
                          Keyword Triggers
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Define what happens when a contact replies with specific keywords.
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleAiGenerateTriggers}
                        disabled={aiTriggerLoading}
                        className="border-purple-300 hover:bg-purple-100"
                      >
                        {aiTriggerLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                        )}
                        AI Generate Triggers
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.triggers.map((trigger, index) => (
                      <Card key={index} className="border-l-4 border-l-purple-400">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <Badge variant="outline" className="text-xs">Trigger {index + 1}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-destructive"
                              onClick={() => {
                                const newTriggers = formData.triggers.filter((_, i) => i !== index);
                                setFormData({ ...formData, triggers: newTriggers });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Keywords (comma separated)</Label>
                              <Input
                                value={trigger.keywords.join(', ')}
                                onChange={(e) => {
                                  const newTriggers = [...formData.triggers];
                                  newTriggers[index].keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                                  setFormData({ ...formData, triggers: newTriggers });
                                }}
                                placeholder="yes, interested, tell me more"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Action</Label>
                              <Select
                                value={trigger.action}
                                onValueChange={(value) => {
                                  const newTriggers = [...formData.triggers];
                                  newTriggers[index].action = value;
                                  setFormData({ ...formData, triggers: newTriggers });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="stop">Stop Campaign</SelectItem>
                                  <SelectItem value="send_response">Send Response</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {trigger.action === 'send_response' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>Response Message</Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAiGenerateResponse(index)}
                                    disabled={aiTriggerLoading}
                                    className="h-7 text-xs"
                                  >
                                    {aiTriggerLoading ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-3 w-3 mr-1 text-purple-500" />
                                    )}
                                    AI Generate
                                  </Button>
                                </div>
                                <Textarea
                                  value={trigger.response_message}
                                  onChange={(e) => {
                                    const newTriggers = [...formData.triggers];
                                    newTriggers[index].response_message = e.target.value;
                                    setFormData({ ...formData, triggers: newTriggers });
                                  }}
                                  placeholder="Great! I'll send you more information..."
                                  rows={2}
                                />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {formData.triggers.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No triggers yet</p>
                        <p className="text-xs mt-1">Add triggers to respond automatically to keywords</p>
                      </div>
                    )}
                    
                    <Button onClick={addTrigger} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trigger Manually
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={selectedCampaign ? handleUpdateCampaign : handleCreateCampaign}>
                  {selectedCampaign ? 'Update Campaign' : 'Create Campaign'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Campaigns List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">No campaigns yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>Create Your First Campaign</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Campaign Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold font-['Outfit']">{campaign.name}</h3>
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-4">
                          {campaign.description || 'No description'}
                        </p>
                        
                        {/* Stats */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{campaign.contacts_enrolled} enrolled</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span>{campaign.steps?.length || 0} steps</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span>{campaign.total_messages_sent} sent</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{campaign.total_replies} replies</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {campaign.status === 'draft' || campaign.status === 'paused' ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleActivateCampaign(campaign)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        ) : campaign.status === 'active' ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePauseCampaign(campaign)}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        ) : null}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setEnrollDialogOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Enroll
                        </Button>
                        
                        <Button size="sm" variant="ghost" onClick={() => editCampaign(campaign)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expandable Steps Preview */}
                  <div className="border-t">
                    <Button
                      variant="ghost"
                      className="w-full py-3 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        if (expandedCampaign === campaign.id) {
                          setExpandedCampaign(null);
                        } else {
                          setExpandedCampaign(campaign.id);
                          fetchEnrollments(campaign.id);
                        }
                      }}
                    >
                      {expandedCampaign === campaign.id ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          View Steps & Enrollments
                        </>
                      )}
                    </Button>
                    
                    {expandedCampaign === campaign.id && (
                      <div className="p-6 pt-0 space-y-6">
                        {/* Steps Timeline */}
                        <div>
                          <h4 className="font-medium mb-4">Campaign Steps</h4>
                          <div className="relative">
                            {campaign.steps?.map((step, index) => (
                              <div key={index} className="flex gap-4 mb-4 last:mb-0">
                                <div className="flex flex-col items-center">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                    step.channel === 'sms' ? 'bg-green-100' : 'bg-purple-100'
                                  }`}>
                                    {step.channel === 'sms' ? (
                                      <MessageSquare className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Mail className="h-4 w-4 text-purple-600" />
                                    )}
                                  </div>
                                  {index < campaign.steps.length - 1 && (
                                    <div className="w-0.5 h-full bg-border mt-2" />
                                  )}
                                </div>
                                <div className="flex-1 pb-4">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">Day {step.delay_days}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {step.channel.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-sm">{step.message || 'No message set'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Enrollments */}
                        {enrollments.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-4">Enrolled Contacts ({enrollments.length})</h4>
                            <div className="space-y-2">
                              {enrollments.slice(0, 10).map((enrollment) => (
                                <div 
                                  key={enrollment.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full ${
                                      enrollment.status === 'active' ? 'bg-green-500' :
                                      enrollment.status === 'stopped_reply' ? 'bg-yellow-500' :
                                      enrollment.status === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
                                    }`} />
                                    <div>
                                      <p className="font-medium text-sm">{enrollment.client_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Step {enrollment.current_step + 1} • {enrollment.status}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {enrollment.status === 'active' && (
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => handleStopForContact(campaign.id, enrollment.client_id)}
                                      >
                                        <StopCircle className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {(enrollment.status === 'paused' || enrollment.status === 'stopped_reply') && (
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => handleResumeForContact(campaign.id, enrollment.client_id)}
                                      >
                                        <RotateCcw className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Enroll Dialog */}
        <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enroll Contacts in Campaign</DialogTitle>
              <DialogDescription>
                Select contacts to enroll in "{selectedCampaign?.name}"
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[400px] mt-4">
              <div className="space-y-2">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedClients.includes(client.id) ? 'bg-primary/10 border-primary' : 'hover:bg-secondary'
                    }`}
                    onClick={() => {
                      setSelectedClients(prev =>
                        prev.includes(client.id)
                          ? prev.filter(id => id !== client.id)
                          : [...prev, client.id]
                      );
                    }}
                  >
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.phone}</p>
                    </div>
                    {selectedClients.includes(client.id) && (
                      <Badge>Selected</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEnrollContacts}>
                Enroll {selectedClients.length} Contact{selectedClients.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Assistant Dialog */}
        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="font-['Outfit'] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Drip Campaign Assistant
              </DialogTitle>
              <DialogDescription>
                Generate automated drip sequences to nurture your leads
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Quick Generate */}
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Quick Generate Sequence
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Campaign Goal</Label>
                      <Select value={aiGoal} onValueChange={setAiGoal}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nurture">Lead Nurturing</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="onboarding">Client Onboarding</SelectItem>
                          <SelectItem value="re_engage">Re-Engagement</SelectItem>
                          <SelectItem value="promotion">Promotional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Messages</Label>
                      <Select value={aiNumMessages.toString()} onValueChange={(v) => setAiNumMessages(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 messages</SelectItem>
                          <SelectItem value="5">5 messages</SelectItem>
                          <SelectItem value="7">7 messages</SelectItem>
                          <SelectItem value="10">10 messages</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Industry (optional)</Label>
                      <Input
                        value={aiIndustry}
                        onChange={(e) => setAiIndustry(e.target.value)}
                        placeholder="e.g., Restaurant, Retail, Consulting"
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    onClick={handleAiGenerateSequence}
                    disabled={aiLoading}
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Generate Sequence
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Sequence Preview */}
              {aiGeneratedSequence && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Generated Sequence</h4>
                      <Button size="sm" onClick={handleUseAiSequence}>
                        Use This Sequence
                      </Button>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-3">
                        {aiGeneratedSequence.map((step, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Step {i + 1}</Badge>
                              <Badge className="text-xs">{step.channel?.toUpperCase() || 'SMS'}</Badge>
                              <span className="text-xs text-muted-foreground">Day {step.delay_days || 0}</span>
                            </div>
                            <p className="text-sm">{step.message}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Chat with AI */}
              <div className="space-y-2">
                <Label>Ask AI for Help</Label>
                <div className="flex gap-2">
                  <Input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="e.g., Create a 5-step follow-up sequence for new leads..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
                  />
                  <Button onClick={handleAiChat} disabled={aiLoading || !aiInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              {aiChatMessages.length > 0 && (
                <ScrollArea className="h-[200px] border rounded-lg p-4">
                  <div className="space-y-3">
                    {aiChatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg ${
                          msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
      </div>
    </DashboardLayout>
  );
};

export default DripCampaigns;
