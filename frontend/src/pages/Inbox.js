import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { 
  Search, 
  Inbox as InboxIcon,
  Send,
  Archive,
  Clock,
  User,
  Phone,
  MessageSquare,
  RefreshCw,
  CheckCheck,
  ArrowLeft,
  ChevronRight,
  Smartphone,
  Zap,
  Filter,
  MoreVertical,
  ExternalLink,
  Sparkles,
  Plus
} from 'lucide-react';
import { clientsApi, contactsApi, phoneNumbersApi, templatesApi, enhancedCampaignsApi, messagesApi } from '../lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead", color: "bg-blue-100 text-blue-700" },
  { value: "interested", label: "Interested", color: "bg-cyan-100 text-cyan-700" },
  { value: "application_sent", label: "Application Sent", color: "bg-indigo-100 text-indigo-700" },
  { value: "docs_submitted", label: "Docs Submitted", color: "bg-orange-100 text-orange-700" },
  { value: "approved", label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  { value: "funded", label: "Funded", color: "bg-green-100 text-green-800" },
  { value: "dead", label: "Dead", color: "bg-red-100 text-red-700" },
  { value: "future", label: "Future", color: "bg-gray-100 text-gray-700" },
];

const getStageInfo = (stage) => {
  return PIPELINE_STAGES.find(s => s.value === stage) || PIPELINE_STAGES[0];
};

const Inbox = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  
  // State
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationChains, setConversationChains] = useState([]);
  const [activeChain, setActiveChain] = useState('default');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [ownedNumbers, setOwnedNumbers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedFromNumber, setSelectedFromNumber] = useState('default');
  const [campaignPopup, setCampaignPopup] = useState(null);
  const [unreadClientIds, setUnreadClientIds] = useState(new Set()); // { clientId, clientName, campaigns }
  const [areCodePopup, setAreaCodePopup] = useState(null); // { areaCode, clientName }

  useEffect(() => {
    fetchData();
  }, []);

  // Filter clients when stageFilter changes
  useEffect(() => {
    // Re-filter is handled in filteredClients computed value
  }, [stageFilter]);

  useEffect(() => {
    const clientId = searchParams.get('client');
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        handleSelectClient(client);
      }
    }
  }, [searchParams, clients]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new unread messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const unreadRes = await messagesApi.getUnread();
        const ids = new Set((unreadRes.data?.messages || []).map(m => m.client_id).filter(Boolean));
        setUnreadClientIds(ids);
      } catch (e) { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchData = async () => {
    try {
      const [clientsRes, numbersRes, templatesRes] = await Promise.all([
        clientsApi.getAll(), // Get all clients, filter on frontend
        phoneNumbersApi.getOwned(),
        templatesApi.getAll()
      ]);
      
      setClients(clientsRes.data || []);
      const numbers = numbersRes.data || [];
      setOwnedNumbers(numbers);
      // Set default from number — only from live Twilio numbers
      const liveNumbers = numbers.filter(n => n.twilio_purchased);
      const defaultNum = liveNumbers.find(n => n.is_default);
      if (defaultNum) {
        setSelectedFromNumber(defaultNum.phone_number);
      } else if (liveNumbers.length > 0) {
        setSelectedFromNumber(liveNumbers[0].phone_number);
      }
      setTemplates(templatesRes.data || []);
      
      // Fetch unread message client IDs
      try {
        const unreadRes = await messagesApi.getUnread();
        const ids = new Set((unreadRes.data?.messages || []).map(m => m.client_id).filter(Boolean));
        setUnreadClientIds(ids);
      } catch (e) { /* silent */ }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    setMessages([]);
    
    try {
      // Fetch conversation chains
      const chainsRes = await contactsApi.getChains(client.id);
      const chains = chainsRes.data.chains || [];
      setConversationChains(chains);
      
      // Set active chain
      const firstChain = chains.length > 0 ? chains[0].from_number : 'default';
      setActiveChain(firstChain);
      
      // Check if we have a number matching the client's area code
      const clientPhone = client.phone?.replace(/\D/g, '') || '';
      const clientAreaCode = clientPhone.length >= 10 ? clientPhone.slice(clientPhone.length === 11 ? 1 : 0, clientPhone.length === 11 ? 4 : 3) : '';
      if (clientAreaCode && ownedNumbers.length > 0) {
        const hasMatchingNumber = ownedNumbers.some(n => {
          const numDigits = n.phone_number.replace(/\D/g, '');
          const numAC = numDigits.length >= 10 ? numDigits.slice(numDigits.length === 11 ? 1 : 0, numDigits.length === 11 ? 4 : 3) : '';
          return numAC === clientAreaCode;
        });
        if (!hasMatchingNumber) {
          setAreaCodePopup({ areaCode: clientAreaCode, clientName: client.name });
        }
      }
      
      // Fetch messages
      await fetchMessages(client.id, firstChain);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      setConversationChains([]);
      setMessages([]);
    }
  };

  const fetchMessages = async (clientId, fromNumber) => {
    try {
      const response = await contactsApi.getConversation(clientId, fromNumber === 'default' ? null : fromNumber);
      const msgs = response.data.messages || [];
      setMessages(msgs);
      
      // Mark inbound messages as read
      const unreadInbound = msgs.filter(m => m.direction === 'inbound' && !m.read);
      if (unreadInbound.length > 0) {
        try {
          await Promise.all(unreadInbound.map(m => messagesApi.markRead(m.id)));
        } catch (e) { /* silent */ }
      }
      
      // Check if client has incoming messages and is in an active campaign
      const hasIncoming = msgs.some(m => m.direction === 'inbound');
      if (hasIncoming) {
        try {
          const campaignsRes = await enhancedCampaignsApi.getClientActiveCampaigns(clientId);
          if (campaignsRes.data && campaignsRes.data.length > 0) {
            const client = clients.find(c => c.id === clientId);
            setCampaignPopup({
              clientId,
              clientName: client?.name || 'Client',
              campaigns: campaignsRes.data
            });
          }
        } catch (e) { /* silent */ }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setMessages([]);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedClient) return;
    
    setSending(true);
    try {
      const fromNumber = selectedFromNumber === 'default' ? null : selectedFromNumber;
      const res = await contactsApi.sendSms(selectedClient.id, {
        message: replyText,
        from_number: fromNumber
      });
      const data = res.data || {};
      if (data.status === 'failed' || data.error) {
        toast.error(`SMS failed: ${data.error || 'Unknown error'}`, { duration: 6000 });
      } else if (data.status === 'queued' || data.status === 'sent' || data.twilio_sid) {
        toast.success('Message sent!');
      } else {
        toast.success('Message queued');
      }
      setReplyText('');
      
      // Refresh messages
      await fetchMessages(selectedClient.id, activeChain);
      
      // Refresh chains
      const chainsRes = await contactsApi.getChains(selectedClient.id);
      setConversationChains(chainsRes.data.chains || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async (template) => {
    if (!selectedClient) return;
    
    setSending(true);
    try {
      const variables = {
        client_name: selectedClient.name,
        client_company: selectedClient.company || '',
        client_balance: selectedClient.balance?.toString() || '0'
      };
      
      const fromNumber = selectedFromNumber === 'default' ? null : selectedFromNumber;
      await templatesApi.sendToContact(selectedClient.id, template.id, variables, fromNumber);
      toast.success('Template sent!');
      
      // Refresh messages
      await fetchMessages(selectedClient.id, activeChain);
      
      // Refresh chains
      const chainsRes = await contactsApi.getChains(selectedClient.id);
      setConversationChains(chainsRes.data.chains || []);
    } catch (error) {
      toast.error('Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const handleChainSelect = async (fromNumber) => {
    setActiveChain(fromNumber);
    if (selectedClient) {
      await fetchMessages(selectedClient.id, fromNumber);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(search.toLowerCase()) ||
                         client.phone?.includes(search);
    const matchesStage = stageFilter === 'all' || client.pipeline_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Sort by most recent activity (you could enhance this with actual last message time)
  const sortedClients = [...filteredClients].sort((a, b) => {
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
  });

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col" data-testid="inbox-page">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Inbox</h1>
            <p className="text-muted-foreground">Manage all your client conversations</p>
          </div>
          <Button variant="outline" onClick={fetchData} data-testid="refresh-inbox-btn">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Main Content - Split View */}
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* Left Panel - Conversation List */}
          <Card className="w-full max-w-sm flex flex-col shrink-0">
            <CardHeader className="pb-3 space-y-3 shrink-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="inbox-search"
                />
              </div>
              
              {/* Stage Filter */}
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full" data-testid="inbox-stage-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {PIPELINE_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : sortedClients.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <InboxIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {sortedClients.map((client) => {
                      const stageInfo = getStageInfo(client.pipeline_stage);
                      const isSelected = selectedClient?.id === client.id;
                      const hasUnread = unreadClientIds.has(client.id);
                      
                      return (
                        <div
                          key={client.id}
                          className={`p-4 cursor-pointer transition-all hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                          } ${hasUnread && !isSelected ? 'bg-green-50/50 dark:bg-green-950/20' : ''}`}
                          onClick={() => handleSelectClient(client)}
                          data-testid={`inbox-client-${client.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              {hasUnread && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5" data-testid={`unread-dot-${client.id}`}>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                                </span>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium truncate">{client.name}</span>
                                {client.balance > 0 && (
                                  <Badge variant="outline" className="text-xs ml-2 shrink-0">
                                    ${client.balance.toLocaleString()}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate mb-2">
                                {client.phone}
                              </p>
                              <Badge className={`text-xs ${stageInfo.color}`}>
                                {stageInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Panel - Conversation View */}
          <Card className="flex-1 flex flex-col min-w-0">
            {selectedClient ? (
              <>
                {/* Conversation Header */}
                <CardHeader className="border-b pb-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden" 
                        onClick={() => setSelectedClient(null)}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">{selectedClient.name}</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {selectedClient.phone}
                          {selectedClient.company && (
                            <span className="ml-2">• {selectedClient.company}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStageInfo(selectedClient.pipeline_stage).color}>
                        {getStageInfo(selectedClient.pipeline_stage).label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clients/${selectedClient.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Full Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/pipeline`)}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Open Pipeline
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Conversation Chains - Show existing conversations */}
                  {conversationChains.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t overflow-x-auto">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">History:</span>
                      {conversationChains.map((chain) => (
                        <Button
                          key={chain.from_number}
                          variant={activeChain === chain.from_number ? "default" : "outline"}
                          size="sm"
                          className="whitespace-nowrap h-8"
                          onClick={() => handleChainSelect(chain.from_number)}
                          data-testid={`chain-${chain.from_number}`}
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          {chain.from_number !== 'default' ? chain.from_number : 'Default'}
                          {chain.message_count > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                              {chain.message_count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm">Send a message to start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      {messages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[75%] ${msg.direction === 'outbound' ? 'order-2' : 'order-1'}`}>
                            {/* Campaign badge for outbound */}
                            {msg.direction === 'outbound' && msg.campaign_name && (
                              <div className="flex justify-end mb-1">
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                  <Zap className="h-3 w-3 mr-1" />
                                  {msg.campaign_name}
                                </Badge>
                              </div>
                            )}
                            
                            <div className={`rounded-2xl px-4 py-3 ${
                              msg.direction === 'outbound' 
                                ? (msg.status === 'failed' || msg.status === 'undelivered' 
                                   ? 'bg-red-600 text-white rounded-br-md' 
                                   : 'bg-primary text-white rounded-br-md')
                                : 'bg-muted rounded-bl-md'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.status === 'failed' && msg.error && (
                                <p className="text-[10px] mt-1 opacity-80 border-t border-white/20 pt-1">
                                  Failed: {msg.error.length > 80 ? msg.error.slice(0, 80) + '...' : msg.error}
                                </p>
                              )}
                              {msg.status === 'undelivered' && (
                                <p className="text-[10px] mt-1 opacity-80 border-t border-white/20 pt-1">
                                  Undelivered — carrier may have blocked this message
                                </p>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${
                              msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {formatTime(msg.timestamp)}
                              {msg.direction === 'outbound' && msg.status !== 'failed' && msg.status !== 'undelivered' && (
                                <CheckCheck className="h-3 w-3 ml-1 text-blue-500" />
                              )}
                              {msg.direction === 'outbound' && msg.status === 'failed' && (
                                <span className="text-red-500 ml-1 font-medium">Failed</span>
                              )}
                              {msg.direction === 'outbound' && msg.status === 'undelivered' && (
                                <span className="text-amber-500 ml-1 font-medium">Undelivered</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Reply Input */}
                <div className="p-4 border-t shrink-0 space-y-3">
                  {/* Quick Templates */}
                  {templates.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {templates.slice(0, 4).map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendTemplate(template)}
                          disabled={sending}
                          className="whitespace-nowrap shrink-0"
                          data-testid={`quick-template-${template.id}`}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="resize-none min-h-[80px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      data-testid="inbox-reply-input"
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="h-auto px-6"
                      data-testid="inbox-send-btn"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Phone Number Selector */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Send from:</Label>
                    <Select value={selectedFromNumber} onValueChange={setSelectedFromNumber}>
                      <SelectTrigger className="flex-1 h-9" data-testid="from-number-select">
                        <Smartphone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select a number" />
                      </SelectTrigger>
                      <SelectContent>
                        {ownedNumbers.length === 0 ? (
                          <SelectItem value="default">No numbers available</SelectItem>
                        ) : (
                          ownedNumbers.filter(n => n.twilio_purchased).length === 0 ? (
                            <SelectItem value="default" disabled>No live Twilio numbers — purchase one first</SelectItem>
                          ) : (
                            ownedNumbers
                              .filter(n => n.twilio_purchased)
                              .map((num) => (
                                <SelectItem key={num.id || num.phone_number} value={num.phone_number}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono">{num.phone_number}</span>
                                    {num.friendly_name && num.friendly_name !== num.phone_number && (
                                      <span className="text-muted-foreground">({num.friendly_name})</span>
                                    )}
                                    {num.is_default && (
                                      <Badge className="ml-1 h-4 px-1 text-[10px] bg-orange-100 text-orange-700">Default</Badge>
                                    )}
                                    {num.assigned_user_name && (
                                      <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                                        {num.assigned_user_name}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <InboxIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">Select a conversation</p>
                  <p className="text-sm">Choose a client from the list to view messages</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Area Code Purchase Suggestion Popup */}
      <Dialog open={!!areCodePopup} onOpenChange={(open) => !open && setAreaCodePopup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Outfit'] flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              Local Number Suggestion
            </DialogTitle>
            <DialogDescription>
              You don't have a phone number with area code ({areCodePopup?.areaCode}) matching {areCodePopup?.clientName}'s location. A local number can increase response rates.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
            <p className="font-semibold text-blue-800">Buy a ({areCodePopup?.areaCode}) number</p>
            <p className="text-sm text-blue-600 mt-1">40 credits/number — familiar area codes get more replies</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaCodePopup(null)}>
              Not Now
            </Button>
            <Button 
              onClick={() => {
                const ac = areCodePopup?.areaCode;
                setAreaCodePopup(null);
                window.location.href = `/phone-numbers?area=${ac || ''}`;
              }}
              data-testid="buy-area-code-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Buy Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Response Popup */}
      <Dialog open={!!campaignPopup} onOpenChange={(open) => !open && setCampaignPopup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Outfit'] flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Response Recorded
            </DialogTitle>
            <DialogDescription>
              {campaignPopup?.clientName} has responded to a message. Remove them from the campaign to avoid daily texts?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {campaignPopup?.campaigns.map((c) => (
              <div key={c.enrollment_id} className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{c.campaign_name}</p>
                  <p className="text-xs text-muted-foreground">Step {c.current_step} of campaign</p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await enhancedCampaignsApi.removeClient(c.campaign_id, campaignPopup.clientId);
                      toast.success(`${campaignPopup.clientName} removed from campaign and tagged as Responded`);
                      setCampaignPopup(null);
                    } catch (error) {
                      toast.error('Failed to remove from campaign');
                    }
                  }}
                  data-testid="remove-from-campaign-btn"
                >
                  Remove from Campaign
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignPopup(null)}>
              Keep in Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Inbox;
