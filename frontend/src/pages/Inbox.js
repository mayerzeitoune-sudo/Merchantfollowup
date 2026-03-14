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
import { clientsApi, contactsApi, phoneNumbersApi, templatesApi } from '../lib/api';
import { toast } from 'sonner';
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
      // Set default from number
      const defaultNum = numbers.find(n => n.is_default);
      if (defaultNum) {
        setSelectedFromNumber(defaultNum.phone_number);
      } else if (numbers.length > 0) {
        setSelectedFromNumber(numbers[0].phone_number);
      }
      setTemplates(templatesRes.data || []);
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
      // Reverse to show oldest first
      setMessages((response.data.messages || []).reverse());
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
      await contactsApi.sendSms(selectedClient.id, {
        message: replyText,
        from_number: fromNumber
      });
      toast.success('Message sent!');
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
                      
                      return (
                        <div
                          key={client.id}
                          className={`p-4 cursor-pointer transition-all hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                          }`}
                          onClick={() => handleSelectClient(client)}
                          data-testid={`inbox-client-${client.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-primary" />
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
                                ? 'bg-primary text-white rounded-br-md' 
                                : 'bg-muted rounded-bl-md'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${
                              msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {formatTime(msg.timestamp)}
                              {msg.direction === 'outbound' && (
                                <CheckCheck className="h-3 w-3 ml-1 text-blue-500" />
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
                          <SelectItem value="default">Default Number</SelectItem>
                        ) : (
                          ownedNumbers.map((num) => (
                            <SelectItem key={num.id || num.phone_number} value={num.phone_number}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{num.phone_number}</span>
                                {num.friendly_name && (
                                  <span className="text-muted-foreground">({num.friendly_name})</span>
                                )}
                                {num.is_default && (
                                  <Badge className="ml-1 h-4 px-1 text-[10px] bg-orange-100 text-orange-700">Default</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
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
    </DashboardLayout>
  );
};

export default Inbox;
