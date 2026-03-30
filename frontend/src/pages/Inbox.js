import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { 
  Search, Inbox as InboxIcon, Send, Clock, User, Phone, MessageSquare,
  RefreshCw, CheckCheck, ArrowLeft, Smartphone, Zap, MoreVertical,
  ExternalLink, Sparkles, Plus, Check, AlertTriangle
} from 'lucide-react';
import { clientsApi, contactsApi, phoneNumbersApi, templatesApi, enhancedCampaignsApi, messagesApi } from '../lib/api';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { useAuth } from '../context/AuthContext';

const Inbox = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  // Core state
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownedNumbers, setOwnedNumbers] = useState([]);
  const [selectedFromNumber, setSelectedFromNumber] = useState('');
  const [templates, setTemplates] = useState([]);

  // Conversation chains
  const [conversationChains, setConversationChains] = useState([]);
  const [activeChain, setActiveChain] = useState(null);

  // Mismatch modal
  const [mismatchModal, setMismatchModal] = useState(null);
  const [pendingSend, setPendingSend] = useState(null);

  // Campaign popup
  const [campaignPopup, setCampaignPopup] = useState(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStageInfo = (stage) => {
    const stages = {
      new: { label: 'New', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
      negotiating: { label: 'Negotiating', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
      closed: { label: 'Closed', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      lost: { label: 'Lost', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    };
    return stages[stage] || stages.new;
  };

  // ─── Data Loading ─────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [threadsRes, clientsRes, numbersRes, templatesRes] = await Promise.all([
        messagesApi.getInboxThreads(),
        clientsApi.getAll(),
        phoneNumbersApi.getOwned(),
        templatesApi.getAll().catch(() => ({ data: [] })),
      ]);

      const threadData = threadsRes.data?.threads || [];
      setThreads(threadData);

      const clientData = clientsRes.data || [];
      setAllClients(clientData);

      const numbers = numbersRes.data || [];
      setOwnedNumbers(numbers);
      const liveNumbers = numbers.filter(n => n.twilio_purchased);
      const defaultNum = liveNumbers.find(n => n.is_default);
      if (!selectedFromNumber) {
        setSelectedFromNumber(defaultNum?.phone_number || liveNumbers[0]?.phone_number || '');
      }

      setTemplates(templatesRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedFromNumber]);

  useEffect(() => { fetchData(); }, []);

  // Poll threads every 8 seconds for real-time ordering
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await messagesApi.getInboxThreads();
        setThreads(res.data?.threads || []);
      } catch (e) { /* silent */ }
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ─── Merge threads with clients for complete display ──────
  const getDisplayList = useCallback(() => {
    const threadMap = new Map();
    threads.forEach(t => threadMap.set(t.client_id, t));

    // Build ordered list: threads first (sorted by last_message_at DESC), then unthreaded clients
    const threaded = threads.map(t => {
      const client = allClients.find(c => c.id === t.client_id);
      return {
        ...client,
        id: t.client_id,
        name: t.client_name || client?.name || 'Unknown',
        phone: t.client_phone || client?.phone || '',
        company: t.client_company || client?.company || '',
        pipeline_stage: t.pipeline_stage || client?.pipeline_stage || 'new',
        last_message_at: t.last_message_at,
        last_message_content: t.last_message_content,
        last_message_direction: t.last_message_direction,
        unread_count: t.unread_count || 0,
      };
    });

    // Clients without any threads
    const threadedIds = new Set(threads.map(t => t.client_id));
    const unthreaded = allClients
      .filter(c => !threadedIds.has(c.id))
      .map(c => ({ ...c, last_message_at: null, unread_count: 0 }));

    // Filter by search
    const all = [...threaded, ...unthreaded];
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  }, [threads, allClients, searchQuery]);

  const displayClients = getDisplayList();

  // ─── Conversation Loading ─────────────────────────────────
  const loadConversation = useCallback(async (clientId, fromNumber) => {
    try {
      const response = await contactsApi.getConversation(clientId, fromNumber === 'default' ? null : fromNumber);
      const msgs = response.data.messages || [];
      setMessages(msgs);

      // Mark inbound messages as read
      const unreadInbound = msgs.filter(m => m.direction === 'inbound' && !m.read);
      if (unreadInbound.length > 0) {
        await Promise.all(unreadInbound.map(m => messagesApi.markRead(m.id))).catch(() => {});
        // Refresh threads to update unread counts (without full reload)
        messagesApi.getInboxThreads().then(res => setThreads(res.data?.threads || [])).catch(() => {});
      }

      if (response.data.chains) {
        setConversationChains(response.data.chains);
      }
    } catch (error) {
      toast.error('Failed to load conversation');
    }
  }, []);

  const handleSelectClient = useCallback((client) => {
    setSelectedClient(client);
    setActiveChain(null);
    loadConversation(client.id);
  }, [loadConversation]);

  const handleChainSelect = useCallback((fromNumber) => {
    setActiveChain(fromNumber);
    if (selectedClient) {
      loadConversation(selectedClient.id, fromNumber);
    }
  }, [selectedClient, loadConversation]);

  // ─── Send Logic with Mismatch Check ──────────────────────
  const executeSend = useCallback(async (message, fromNumber) => {
    if (!selectedClient || !message.trim()) return;
    setSending(true);
    try {
      const res = await contactsApi.sendSms(selectedClient.id, {
        message: message.trim(),
        from_number: fromNumber
      });
      const data = res.data || {};
      if (data.status === 'failed' || data.error) {
        toast.error(`SMS failed: ${data.error || 'Unknown error'}`, { duration: 6000 });
      } else {
        toast.success('Message sent!');
      }
      setReplyText('');
      loadConversation(selectedClient.id, activeChain);
      // Refresh threads for reordering
      messagesApi.getInboxThreads().then(r => setThreads(r.data?.threads || [])).catch(() => {});
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to send message';
      toast.error(detail, { duration: 6000 });
    } finally {
      setSending(false);
    }
  }, [selectedClient, activeChain, loadConversation]);

  const handleSendReply = useCallback(() => {
    if (!replyText.trim() || !selectedFromNumber || selectedFromNumber === 'default') {
      toast.error('Select a Twilio number to send from');
      return;
    }

    // Check for number mismatch
    const viewingNumber = activeChain && activeChain !== 'default' ? activeChain : null;
    if (viewingNumber && viewingNumber !== selectedFromNumber) {
      const fmt = (n) => {
        const d = n.replace(/\D/g, '').slice(-10);
        return d.length === 10 ? `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}` : n;
      };
      setMismatchModal({ viewing: fmt(viewingNumber), sending: fmt(selectedFromNumber), viewingRaw: viewingNumber, sendingRaw: selectedFromNumber });
      setPendingSend(replyText);
      return;
    }

    executeSend(replyText, selectedFromNumber);
  }, [replyText, selectedFromNumber, activeChain, executeSend]);

  const handleMismatchConfirm = useCallback(() => {
    if (pendingSend && mismatchModal) {
      executeSend(pendingSend, mismatchModal.sendingRaw);
    }
    setMismatchModal(null);
    setPendingSend(null);
  }, [pendingSend, mismatchModal, executeSend]);

  const handleMismatchChangeNumber = useCallback(() => {
    setMismatchModal(null);
    setPendingSend(null);
  }, []);

  const handleSendTemplate = useCallback(async (template) => {
    if (!selectedClient || !selectedFromNumber || selectedFromNumber === 'default') return;
    let msg = template.content;
    msg = msg.replace(/{name}/g, selectedClient.name || '');
    msg = msg.replace(/{company}/g, selectedClient.company || '');
    msg = msg.replace(/{phone}/g, selectedClient.phone || '');
    executeSend(msg, selectedFromNumber);
  }, [selectedClient, selectedFromNumber, executeSend]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
    if (selectedClient) {
      loadConversation(selectedClient.id, activeChain);
    }
    setLoading(false);
  }, [fetchData, selectedClient, activeChain, loadConversation]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const liveNumbers = ownedNumbers.filter(n => n.twilio_purchased);

  return (
    <DashboardLayout>
      <div className="space-y-4" data-testid="inbox-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Outfit']" data-testid="inbox-title">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              {threads.filter(t => t.unread_count > 0).length > 0
                ? `${threads.reduce((s, t) => s + t.unread_count, 0)} unread messages`
                : 'All caught up'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="inbox-refresh">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Main Layout */}
        <div className="flex gap-4 h-[calc(100vh-220px)]">
          {/* Left Panel - Thread List */}
          <Card className={`w-[380px] shrink-0 flex flex-col ${selectedClient ? 'hidden md:flex' : 'flex'}`}>
            <CardHeader className="pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="inbox-search"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {displayClients.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">No conversations</p>
                  </div>
                ) : (
                  displayClients.map((client) => {
                    const isSelected = selectedClient?.id === client.id;
                    const hasUnread = client.unread_count > 0;
                    return (
                      <div
                        key={client.id}
                        className={`p-4 cursor-pointer transition-all border-b border-border/50 hover:bg-muted/50 ${
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
                            <div className="flex items-center justify-between">
                              <h3 className={`text-sm truncate ${hasUnread ? 'font-bold' : 'font-medium'}`}>
                                {client.name}
                              </h3>
                              {client.last_message_at && (
                                <span className={`text-[11px] shrink-0 ml-2 ${hasUnread ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'}`}>
                                  {formatTime(client.last_message_at)}
                                </span>
                              )}
                            </div>
                            {client.last_message_content ? (
                              <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                {client.last_message_direction === 'outbound' && <span className="text-muted-foreground">You: </span>}
                                {client.last_message_content}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {client.phone}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {client.company && (
                                <span className="text-[10px] text-muted-foreground truncate">{client.company}</span>
                              )}
                              {hasUnread && (
                                <Badge className="h-4 min-w-[18px] px-1 text-[10px] bg-green-500 text-white font-bold ml-auto">
                                  {client.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedClient(null)}>
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
                          {selectedClient.company && <span className="ml-2">• {selectedClient.company}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStageInfo(selectedClient.pipeline_stage).color}>
                        {getStageInfo(selectedClient.pipeline_stage).label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clients/${selectedClient.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" /> View Full Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/pipeline`)}>
                            <Sparkles className="h-4 w-4 mr-2" /> Open Pipeline
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Conversation Chains with Viewing Indicator */}
                  {conversationChains.length > 0 && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t overflow-x-auto">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">View from:</span>
                      {conversationChains.map((chain) => {
                        const isActive = activeChain === chain.from_number;
                        return (
                          <Button
                            key={chain.from_number}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            className={`whitespace-nowrap h-8 gap-1.5 ${isActive ? 'ring-2 ring-green-500/50' : ''}`}
                            onClick={() => handleChainSelect(chain.from_number)}
                            data-testid={`chain-${chain.from_number}`}
                          >
                            {isActive && <Check className="h-3.5 w-3.5 text-green-400" />}
                            <Smartphone className="h-3 w-3" />
                            {chain.from_number !== 'default' ? chain.from_number : 'All'}
                            {chain.message_count > 0 && (
                              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                {chain.message_count}
                              </Badge>
                            )}
                            {isActive && (
                              <span className="text-[9px] text-green-400 font-medium ml-0.5">Viewing</span>
                            )}
                          </Button>
                        );
                      })}
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
                        <div key={index} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${msg.direction === 'outbound' ? 'order-2' : 'order-1'}`}>
                            {msg.direction === 'outbound' && msg.campaign_name && (
                              <div className="flex justify-end mb-1">
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                  <Zap className="h-3 w-3 mr-1" />{msg.campaign_name}
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
                  {templates.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {templates.slice(0, 4).map((template) => (
                        <Button key={template.id} variant="outline" size="sm" onClick={() => handleSendTemplate(template)} disabled={sending} className="whitespace-nowrap shrink-0" data-testid={`quick-template-${template.id}`}>
                          <Zap className="h-3 w-3 mr-1" />{template.name}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="resize-none min-h-[80px]"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                      data-testid="inbox-reply-input"
                    />
                    <Button onClick={handleSendReply} disabled={sending || !replyText.trim()} className="h-auto px-6" data-testid="inbox-send-btn">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Send From Number Selector */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Send from:</Label>
                    <Select value={selectedFromNumber} onValueChange={setSelectedFromNumber}>
                      <SelectTrigger className="flex-1 h-9" data-testid="from-number-select">
                        <Smartphone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select a number" />
                      </SelectTrigger>
                      <SelectContent>
                        {liveNumbers.length === 0 ? (
                          <SelectItem value="default" disabled>No live Twilio numbers — purchase one first</SelectItem>
                        ) : (
                          liveNumbers.map((num) => {
                            const isViewing = activeChain === num.phone_number;
                            return (
                              <SelectItem key={num.id || num.phone_number} value={num.phone_number}>
                                <div className="flex items-center gap-2">
                                  {isViewing && <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                                  <span className="font-mono">{num.phone_number}</span>
                                  {isViewing && <span className="text-[10px] text-green-600 dark:text-green-400">Currently viewing</span>}
                                  {num.assigned_user_name && (
                                    <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{num.assigned_user_name}</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })
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

      {/* ─── Number Mismatch Confirmation Modal ──────────────── */}
      <Dialog open={!!mismatchModal} onOpenChange={(o) => { if (!o) { setMismatchModal(null); setPendingSend(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Outfit'] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Different Send Number
            </DialogTitle>
            <DialogDescription>
              Please confirm you'd like to send from a different number than the one you're viewing.
            </DialogDescription>
          </DialogHeader>
          {mismatchModal && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-muted/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Viewing through</p>
                  <p className="font-mono font-bold text-sm">{mismatchModal.viewing}</p>
                </div>
                <div className="p-3 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-center">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider font-semibold mb-1">Sending from</p>
                  <p className="font-mono font-bold text-sm">{mismatchModal.sending}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                The recipient will see your message as coming from <strong>{mismatchModal.sending}</strong>
              </p>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setMismatchModal(null); setPendingSend(null); }} data-testid="mismatch-cancel-btn">
              Cancel
            </Button>
            <Button variant="outline" onClick={handleMismatchChangeNumber} data-testid="mismatch-change-btn">
              <Smartphone className="h-4 w-4 mr-2" /> Change Number
            </Button>
            <Button onClick={handleMismatchConfirm} className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="mismatch-confirm-btn">
              <Send className="h-4 w-4 mr-2" /> Confirm Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Response Popup */}
      <Dialog open={!!campaignPopup} onOpenChange={(open) => !open && setCampaignPopup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Outfit'] flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" /> Response Recorded
            </DialogTitle>
            <DialogDescription>
              {campaignPopup?.clientName} has responded. Remove from campaign?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {campaignPopup?.campaigns.map((c) => (
              <div key={c.enrollment_id} className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{c.campaign_name}</p>
                  <p className="text-xs text-muted-foreground">Step {c.current_step}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={async () => {
                  try {
                    await enhancedCampaignsApi.removeClient(c.campaign_id, campaignPopup.clientId);
                    toast.success(`${campaignPopup.clientName} removed from campaign`);
                    setCampaignPopup(null);
                  } catch { toast.error('Failed to remove'); }
                }} data-testid="remove-from-campaign-btn">Remove</Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignPopup(null)}>Keep in Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Inbox;
