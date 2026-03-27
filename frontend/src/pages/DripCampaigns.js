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
  X,
  Shield
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
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  
  // Tags that match Pipeline stages
  const AVAILABLE_TAGS = [
    { value: "New Lead", color: "bg-blue-100 text-blue-700" },
    { value: "Interested", color: "bg-cyan-100 text-cyan-700" },
    { value: "Application Sent", color: "bg-indigo-100 text-indigo-700" },
    { value: "Docs Submitted", color: "bg-orange-100 text-orange-700" },
    { value: "Approved", color: "bg-emerald-100 text-emerald-700" },
    { value: "Funded", color: "bg-green-100 text-green-800" },
    { value: "Dead", color: "bg-red-100 text-red-700" },
    { value: "Future", color: "bg-gray-100 text-gray-700" },
  ];
  
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
  
  // Pre-built campaign state
  const [prebuiltDialogOpen, setPrebuiltDialogOpen] = useState(false);
  const [prebuiltCampaigns, setPrebuiltCampaigns] = useState([]);
  const [selectedPrebuilt, setSelectedPrebuilt] = useState(null);
  const [prebuiltDetail, setPrebuiltDetail] = useState(null);
  const [launchLoading, setLaunchLoading] = useState(false);
  const [prebuiltName, setPrebuiltName] = useState('');
  const [prebuiltStep, setPrebuiltStep] = useState('select'); // 'select' | 'triggers' | 'review'
  const [triggerWords, setTriggerWords] = useState([]);
  const [newTriggerWord, setNewTriggerWord] = useState('');

  const DEFAULT_TRIGGER_WORDS = [
    'stop', 'no', 'out', 'unsubscribe', 'remove', 'quit', 'cancel',
    'leave me alone', 'fuck you', 'fuck off', 'do not contact',
    'take me off', 'opt out', 'not interested', 'wrong number'
  ];
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: [],
    triggers: [],
    stop_on_reply: true,
    target_tags: [],
    status: 'draft',
    duration_days: 30,  // Campaign duration in days
    use_funded_term: false  // Auto-use funded deal term for duration
  });

  useEffect(() => {
    fetchCampaigns();
    fetchClients();
    fetchPrebuiltCampaigns();
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

  const fetchPrebuiltCampaigns = async () => {
    try {
      const response = await enhancedCampaignsApi.getPrebuilt();
      setPrebuiltCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch prebuilt campaigns');
    }
  };

  const handleSelectPrebuilt = async (campaign) => {
    setSelectedPrebuilt(campaign);
    setPrebuiltName(campaign.name);
    setTriggerWords([...DEFAULT_TRIGGER_WORDS]);
    try {
      const response = await enhancedCampaignsApi.getPrebuiltDetail(campaign.id);
      setPrebuiltDetail(response.data);
    } catch (error) {
      toast.error('Failed to load campaign details');
    }
    // For high-intensity campaigns, show trigger words step
    if (campaign.id === 'max_aggression') {
      setPrebuiltStep('triggers');
    } else {
      setPrebuiltStep('review');
    }
  };

  const handleLaunchPrebuilt = async () => {
    if (!selectedPrebuilt) return;
    setLaunchLoading(true);
    try {
      const result = await enhancedCampaignsApi.launchPrebuilt(selectedPrebuilt.id, {
        name: prebuiltName || selectedPrebuilt.name,
        tag: selectedPrebuilt.target_tag,
        trigger_words: triggerWords
      });
      toast.success(`Campaign launched! ${result.data.enrolled_count} clients enrolled.`);
      setPrebuiltDialogOpen(false);
      setSelectedPrebuilt(null);
      setPrebuiltDetail(null);
      setPrebuiltStep('select');
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to launch campaign');
    } finally {
      setLaunchLoading(false);
    }
  };

  const addTriggerWord = () => {
    const word = newTriggerWord.trim().toLowerCase();
    if (word && !triggerWords.includes(word)) {
      setTriggerWords([...triggerWords, word]);
      setNewTriggerWord('');
    }
  };

  const removeTriggerWord = (word) => {
    setTriggerWords(triggerWords.filter(w => w !== word));
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
      status: 'draft',
      duration_days: 30,
      use_funded_term: false
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
        send_time: '09:00',
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
            
            <Button 
              onClick={() => setPrebuiltDialogOpen(true)} 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary/10"
              data-testid="bulk-campaign-btn"
            >
              <Zap className="h-4 w-4 mr-2" />
              Bulk Templated Campaign
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
                      {AVAILABLE_TAGS.map((tag) => (
                        <Badge
                          key={tag.value}
                          variant={formData.target_tags.includes(tag.value) ? "default" : "outline"}
                          className={`cursor-pointer ${formData.target_tags.includes(tag.value) ? '' : tag.color}`}
                          onClick={() => {
                            const newTags = formData.target_tags.includes(tag.value)
                              ? formData.target_tags.filter(t => t !== tag.value)
                              : [...formData.target_tags, tag.value];
                            // Auto-enable funded term when Funded tag is selected
                            const isFundedSelected = newTags.includes('Funded');
                            setFormData({ 
                              ...formData, 
                              target_tags: newTags,
                              use_funded_term: isFundedSelected ? true : formData.use_funded_term
                            });
                          }}
                        >
                          {tag.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Campaign Duration Settings */}
                  <div className="space-y-4 p-4 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Campaign Duration</Label>
                        <p className="text-sm text-muted-foreground">
                          How long should this campaign run per contact
                        </p>
                      </div>
                    </div>
                    
                    {formData.target_tags.includes('Funded') && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                        <div>
                          <p className="font-medium text-green-800">Use Funded Deal Term</p>
                          <p className="text-sm text-green-600">
                            Campaign duration will match each client's funding term
                          </p>
                        </div>
                        <Switch
                          checked={formData.use_funded_term}
                          onCheckedChange={(checked) => setFormData({ ...formData, use_funded_term: checked })}
                        />
                      </div>
                    )}
                    
                    {!formData.use_funded_term && (
                      <div className="space-y-2">
                        <Label>Fixed Duration (Days)</Label>
                        <Select
                          value={String(formData.duration_days)}
                          onValueChange={(value) => setFormData({ ...formData, duration_days: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 days (1 week)</SelectItem>
                            <SelectItem value="14">14 days (2 weeks)</SelectItem>
                            <SelectItem value="21">21 days (3 weeks)</SelectItem>
                            <SelectItem value="30">30 days (1 month)</SelectItem>
                            <SelectItem value="45">45 days</SelectItem>
                            <SelectItem value="60">60 days (2 months)</SelectItem>
                            <SelectItem value="90">90 days (3 months)</SelectItem>
                            <SelectItem value="120">120 days (4 months)</SelectItem>
                            <SelectItem value="180">180 days (6 months)</SelectItem>
                            <SelectItem value="270">270 days (9 months)</SelectItem>
                            <SelectItem value="365">365 days (1 year)</SelectItem>
                            <SelectItem value="548">548 days (18 months)</SelectItem>
                            <SelectItem value="730">730 days (2 years)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Messages scheduled after this duration will not be sent
                        </p>
                      </div>
                    )}
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
                            
                            <div className="grid grid-cols-3 gap-4 mb-4">
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
                                <Label>Day</Label>
                                <Select
                                  value={String(step.delay_days)}
                                  onValueChange={(value) => updateStep(index, 'delay_days', parseInt(value))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">Day 0 (Immediately)</SelectItem>
                                    <SelectItem value="1">Day 1</SelectItem>
                                    <SelectItem value="2">Day 2</SelectItem>
                                    <SelectItem value="3">Day 3</SelectItem>
                                    <SelectItem value="4">Day 4</SelectItem>
                                    <SelectItem value="5">Day 5</SelectItem>
                                    <SelectItem value="7">Day 7</SelectItem>
                                    <SelectItem value="10">Day 10</SelectItem>
                                    <SelectItem value="14">Day 14</SelectItem>
                                    <SelectItem value="21">Day 21</SelectItem>
                                    <SelectItem value="30">Day 30</SelectItem>
                                    {formData.duration_days > 30 && <SelectItem value="45">Day 45</SelectItem>}
                                    {formData.duration_days >= 60 && <SelectItem value="60">Day 60</SelectItem>}
                                    {formData.duration_days >= 90 && <SelectItem value="90">Day 90</SelectItem>}
                                    {formData.duration_days >= 120 && <SelectItem value="120">Day 120</SelectItem>}
                                    {formData.duration_days >= 150 && <SelectItem value="150">Day 150</SelectItem>}
                                    {formData.duration_days >= 180 && <SelectItem value="180">Day 180</SelectItem>}
                                    {formData.duration_days >= 210 && <SelectItem value="210">Day 210</SelectItem>}
                                    {formData.duration_days >= 240 && <SelectItem value="240">Day 240</SelectItem>}
                                    {formData.duration_days >= 270 && <SelectItem value="270">Day 270</SelectItem>}
                                    {formData.duration_days >= 300 && <SelectItem value="300">Day 300</SelectItem>}
                                    {formData.duration_days >= 330 && <SelectItem value="330">Day 330</SelectItem>}
                                    {formData.duration_days >= 365 && <SelectItem value="365">Day 365</SelectItem>}
                                    {formData.duration_days >= 400 && <SelectItem value="400">Day 400</SelectItem>}
                                    {formData.duration_days >= 450 && <SelectItem value="450">Day 450</SelectItem>}
                                    {formData.duration_days >= 500 && <SelectItem value="500">Day 500</SelectItem>}
                                    {formData.duration_days >= 548 && <SelectItem value="548">Day 548</SelectItem>}
                                    {formData.duration_days >= 600 && <SelectItem value="600">Day 600</SelectItem>}
                                    {formData.duration_days >= 700 && <SelectItem value="700">Day 700</SelectItem>}
                                    {formData.duration_days >= 730 && <SelectItem value="730">Day 730</SelectItem>}
                                  </SelectContent>
                                </Select>
                                {formData.use_funded_term && (
                                  <p className="text-xs text-green-600">
                                    Days adjust per client's funding term
                                  </p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label>Send Time</Label>
                                <Select
                                  value={step.send_time || '09:00'}
                                  onValueChange={(value) => updateStep(index, 'send_time', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="08:00">8:00 AM</SelectItem>
                                    <SelectItem value="09:00">9:00 AM</SelectItem>
                                    <SelectItem value="10:00">10:00 AM</SelectItem>
                                    <SelectItem value="11:00">11:00 AM</SelectItem>
                                    <SelectItem value="12:00">12:00 PM</SelectItem>
                                    <SelectItem value="13:00">1:00 PM</SelectItem>
                                    <SelectItem value="14:00">2:00 PM</SelectItem>
                                    <SelectItem value="15:00">3:00 PM</SelectItem>
                                    <SelectItem value="16:00">4:00 PM</SelectItem>
                                    <SelectItem value="17:00">5:00 PM</SelectItem>
                                    <SelectItem value="18:00">6:00 PM</SelectItem>
                                  </SelectContent>
                                </Select>
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
                            {campaign.steps?.map((step, index) => {
                              const ch = step.channel || 'sms';
                              const dayNum = step.delay_days ?? step.day ?? 0;
                              const label = step.label || `Day ${dayNum}`;
                              return (
                              <div key={index} className="flex gap-4 mb-4 last:mb-0">
                                <div className="flex flex-col items-center">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                    ch === 'sms' ? 'bg-green-100' : 'bg-purple-100'
                                  }`}>
                                    {ch === 'sms' ? (
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
                                    <Badge variant="outline">{label}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {ch.toUpperCase()}
                                    </span>
                                    {step.phase && <Badge variant="secondary" className="text-xs">{step.phase}</Badge>}
                                  </div>
                                  <p className="text-sm">{step.message || 'No message set'}</p>
                                </div>
                              </div>
                              );
                            })}
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

        {/* Bulk Templated Campaign Dialog */}
        <Dialog open={prebuiltDialogOpen} onOpenChange={(open) => {
          setPrebuiltDialogOpen(open);
          if (!open) { setSelectedPrebuilt(null); setPrebuiltDetail(null); setPrebuiltStep('select'); }
        }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Bulk Templated Campaign</DialogTitle>
              <DialogDescription>
                Launch a pre-built campaign that auto-enrolls all matching clients
              </DialogDescription>
            </DialogHeader>
            
            {/* Step indicator for multi-step flows */}
            {selectedPrebuilt && selectedPrebuilt.id === 'max_aggression' && (
              <div className="flex items-center gap-2 text-xs">
                <div className={`flex items-center gap-1 ${prebuiltStep === 'triggers' ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${prebuiltStep === 'triggers' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'}`}>1</div>
                  Trigger Words
                </div>
                <ArrowRight className="h-3 w-3 text-zinc-300" />
                <div className={`flex items-center gap-1 ${prebuiltStep === 'review' ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${prebuiltStep === 'review' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'}`}>2</div>
                  Review & Launch
                </div>
              </div>
            )}

            {!selectedPrebuilt ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium">Select a campaign template:</p>
                {prebuiltCampaigns.map((campaign) => (
                  <Card 
                    key={campaign.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleSelectPrebuilt(campaign)}
                    data-testid={`prebuilt-${campaign.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{campaign.name}</h4>
                          <p className="text-sm text-muted-foreground">{campaign.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{campaign.total_steps} messages</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{campaign.total_days} days</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className="bg-blue-100 text-blue-700">Target: {campaign.target_tag}</Badge>
                        {campaign.hourly && <Badge className="bg-red-100 text-red-700">{campaign.texts_per_day} texts/day</Badge>}
                        {campaign.weekdays_only && <Badge className="bg-amber-100 text-amber-700">Mon-Fri</Badge>}
                        {campaign.send_window && <Badge className="bg-purple-100 text-purple-700">{campaign.send_window.start}-{campaign.send_window.end}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {clients.filter(c => c.tags?.includes(campaign.target_tag)).length} clients match
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : prebuiltStep === 'triggers' ? (
              /* ===== TRIGGER WORDS STEP ===== */
              <div className="space-y-4" data-testid="trigger-words-step">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedPrebuilt(null); setPrebuiltDetail(null); setPrebuiltStep('select'); }}>
                    <ArrowRight className="h-4 w-4 rotate-180 mr-1" /> Back
                  </Button>
                  <h4 className="font-semibold">{selectedPrebuilt.name}</h4>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <h4 className="text-sm font-bold text-amber-800">Stop Trigger Words</h4>
                  </div>
                  <p className="text-xs text-amber-700">
                    When a lead replies with any of these words, they are <strong>automatically removed</strong> from the campaign. Pre-built words are included — add your own below.
                  </p>
                </div>

                {/* Current trigger words */}
                <div className="space-y-2">
                  <Label className="text-sm">Active Trigger Words ({triggerWords.length})</Label>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 border rounded-lg bg-zinc-50">
                    {triggerWords.map((word) => (
                      <Badge 
                        key={word}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors group"
                        onClick={() => removeTriggerWord(word)}
                        data-testid={`trigger-word-${word.replace(/\s+/g, '-')}`}
                      >
                        {word}
                        <X className="h-3 w-3 ml-1 opacity-50 group-hover:opacity-100" />
                      </Badge>
                    ))}
                    {triggerWords.length === 0 && (
                      <p className="text-xs text-zinc-400 py-2">No trigger words set — leads won't be auto-removed on reply</p>
                    )}
                  </div>
                </div>

                {/* Add custom trigger word */}
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add custom trigger word..."
                    value={newTriggerWord}
                    onChange={(e) => setNewTriggerWord(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTriggerWord(); } }}
                    className="flex-1"
                    data-testid="add-trigger-word-input"
                  />
                  <Button variant="outline" onClick={addTriggerWord} data-testid="add-trigger-word-btn">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>

                {/* Quick add defaults back */}
                {DEFAULT_TRIGGER_WORDS.filter(w => !triggerWords.includes(w)).length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-500">Quick add removed defaults:</Label>
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_TRIGGER_WORDS.filter(w => !triggerWords.includes(w)).map(word => (
                        <Badge 
                          key={word} 
                          variant="outline" 
                          className="text-[10px] cursor-pointer hover:bg-zinc-100"
                          onClick={() => setTriggerWords([...triggerWords, word])}
                        >
                          + {word}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setPrebuiltDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => setPrebuiltStep('review')} data-testid="triggers-next-btn">
                    Next: Review & Launch <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              /* ===== REVIEW & LAUNCH STEP ===== */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (selectedPrebuilt.id === 'max_aggression') setPrebuiltStep('triggers');
                    else { setSelectedPrebuilt(null); setPrebuiltDetail(null); setPrebuiltStep('select'); }
                  }}>
                    <ArrowRight className="h-4 w-4 rotate-180 mr-1" /> Back
                  </Button>
                  <h4 className="font-semibold">{selectedPrebuilt.name}</h4>
                </div>

                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input 
                    value={prebuiltName}
                    onChange={(e) => setPrebuiltName(e.target.value)}
                    placeholder={selectedPrebuilt.name}
                    data-testid="prebuilt-campaign-name"
                  />
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">
                    Auto-enrolls all clients tagged "{selectedPrebuilt.target_tag}"
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {clients.filter(c => c.tags?.includes(selectedPrebuilt.target_tag)).length} clients will be enrolled
                  </p>
                </div>

                {/* Trigger words summary */}
                {triggerWords.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-3.5 w-3.5 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">
                        {triggerWords.length} Stop Trigger Words Active
                      </p>
                    </div>
                    <p className="text-xs text-amber-600">
                      Leads replying with: {triggerWords.slice(0, 5).join(', ')}{triggerWords.length > 5 ? ` +${triggerWords.length - 5} more` : ''}
                    </p>
                  </div>
                )}

                {/* Estimated Costs & Projected Returns Panel */}
                {(() => {
                  const matchingClients = clients.filter(c => c.tags?.includes(selectedPrebuilt.target_tag)).length;
                  const totalMsgs = prebuiltDetail?.steps?.length || selectedPrebuilt.total_steps || 0;
                  const creditsPerText = 0.316;
                  const totalTexts = matchingClients * totalMsgs;
                  const totalCreditCost = Math.round(totalTexts * creditsPerText);
                  const convLow = Math.max(1, Math.round(matchingClients * 0.05));
                  const convHigh = Math.max(1, Math.round(matchingClients * 0.12));
                  const dealValue = 5000;
                  const revLow = convLow * dealValue;
                  const revHigh = convHigh * dealValue;
                  return (
                    <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3 shadow-sm" data-testid="campaign-cost-preview">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-sm font-semibold text-zinc-900">Estimated Credits & Projected Returns</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded bg-zinc-50 border border-zinc-200 p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Texts</p>
                          <p className="text-lg font-bold text-zinc-900 font-mono">{totalTexts.toLocaleString()}</p>
                          <p className="text-[10px] text-zinc-400">{matchingClients} leads x {totalMsgs} msgs</p>
                        </div>
                        <div className="rounded bg-zinc-50 border border-zinc-200 p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Campaign Credit Cost</p>
                          <p className="text-lg font-bold text-amber-600 font-mono">{totalCreditCost.toLocaleString()}</p>
                          <p className="text-[10px] text-zinc-400">{creditsPerText} credits/text</p>
                        </div>
                        <div className="rounded bg-zinc-50 border border-zinc-200 p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Est. Conversions</p>
                          <p className="text-lg font-bold text-amber-600 font-mono">{convLow} <span className="text-xs font-normal text-zinc-400">to</span> {convHigh}</p>
                          <p className="text-[10px] text-zinc-400">5% - 12% conversion rate</p>
                        </div>
                        <div className="rounded bg-zinc-50 border border-zinc-200 p-3">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Projected Revenue</p>
                          <p className="text-lg font-bold text-emerald-600 font-mono">${revLow.toLocaleString()} <span className="text-xs font-normal text-zinc-400">to</span> ${revHigh.toLocaleString()}</p>
                          <p className="text-[10px] text-zinc-400">$5,000 avg per closed deal</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded bg-emerald-50 border border-emerald-200 p-3">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Estimated Net Return</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Revenue minus credit cost (at base rate)</p>
                        </div>
                        <p className="text-xl font-bold text-green-600 font-mono">
                          ${Math.max(0, Math.round(revLow - (totalCreditCost / 5))).toLocaleString()} <span className="text-xs font-normal text-zinc-400">to</span> ${Math.max(0, Math.round(revHigh - (totalCreditCost / 5))).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {prebuiltDetail && (
                  <div className="space-y-2">
                    <Label>Message Preview ({prebuiltDetail.steps?.length} messages)</Label>
                    <ScrollArea className="h-48 border rounded-lg p-3">
                      {prebuiltDetail.steps?.slice(0, 10).map((step, i) => (
                        <div key={i} className="mb-3 pb-3 border-b last:border-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{step.label}</Badge>
                            <Badge variant="secondary" className="text-xs">{step.phase}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{step.message}</p>
                        </div>
                      ))}
                      {prebuiltDetail.steps?.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          ... and {prebuiltDetail.steps.length - 10} more messages
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setPrebuiltDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleLaunchPrebuilt} 
                    disabled={launchLoading}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="launch-prebuilt-btn"
                  >
                    {launchLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Launching...</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Start Campaign</>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DripCampaigns;
