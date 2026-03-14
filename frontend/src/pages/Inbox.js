import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Search, 
  Inbox as InboxIcon,
  Send,
  Star,
  Archive,
  Trash2,
  MoreHorizontal,
  Clock,
  User,
  Phone,
  MessageSquare,
  Filter,
  RefreshCw,
  CheckCheck,
  Circle,
  ArrowLeft,
  Reply,
  ChevronRight,
  Smartphone,
  Mail,
  AlertCircle
} from 'lucide-react';
import { clientsApi, contactsApi, phoneNumbersApi } from '../lib/api';
import { toast } from 'sonner';

const Inbox = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, starred
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [ownedNumbers, setOwnedNumbers] = useState([]);

  useEffect(() => {
    fetchConversations();
    fetchOwnedNumbers();
  }, [filter]);

  useEffect(() => {
    // Check for client param in URL
    const clientId = searchParams.get('client');
    if (clientId && conversations.length > 0) {
      const conv = conversations.find(c => c.client_id === clientId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.client_id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await contactsApi.getInbox(filter);
      setConversations(response.data || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      // Fallback: fetch clients and build conversation list
      try {
        const clientsRes = await clientsApi.getAll();
        const clients = clientsRes.data || [];
        const convList = clients.map(client => ({
          client_id: client.id,
          client_name: client.name,
          client_phone: client.phone,
          last_message: '',
          last_message_time: client.updated_at,
          unread_count: 0,
          is_starred: false
        }));
        setConversations(convList);
      } catch (e) {
        toast.error('Failed to load inbox');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnedNumbers = async () => {
    try {
      const response = await phoneNumbersApi.getOwned();
      setOwnedNumbers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch phone numbers');
    }
  };

  const fetchMessages = async (clientId) => {
    try {
      const response = await contactsApi.getConversation(clientId);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages');
      setMessages([]);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      await contactsApi.sendSms(selectedConversation.client_id, {
        message: replyText
      });
      toast.success('Message sent!');
      setReplyText('');
      fetchMessages(selectedConversation.client_id);
      fetchConversations();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (clientId) => {
    try {
      await contactsApi.markAsRead(clientId);
      fetchConversations();
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };

  const handleToggleStar = async (clientId, e) => {
    e.stopPropagation();
    try {
      await contactsApi.toggleStar(clientId);
      fetchConversations();
    } catch (error) {
      console.error('Failed to toggle star');
    }
  };

  const handleArchive = async (clientIds) => {
    try {
      await Promise.all(clientIds.map(id => contactsApi.archiveConversation(id)));
      toast.success(`Archived ${clientIds.length} conversation(s)`);
      setSelectedItems([]);
      fetchConversations();
    } catch (error) {
      toast.error('Failed to archive');
    }
  };

  const handleSelectItem = (clientId, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, clientId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== clientId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredConversations.map(c => c.client_id));
    } else {
      setSelectedItems([]);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.client_name?.toLowerCase().includes(search.toLowerCase()) ||
                         conv.client_phone?.includes(search);
    return matchesSearch;
  });

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Less than 24 hours
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col" data-testid="inbox-page">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Inbox</h1>
            <p className="text-muted-foreground">All your conversations in one place</p>
          </div>
          <Button variant="outline" onClick={fetchConversations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Conversation List */}
          <Card className="w-full max-w-md flex flex-col">
            <CardHeader className="pb-3 space-y-3">
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
              
              {/* Tabs */}
              <Tabs value={filter} onValueChange={setFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    <InboxIcon className="h-4 w-4 mr-1" />
                    All
                  </TabsTrigger>
                  <TabsTrigger value="unread">
                    <Circle className="h-4 w-4 mr-1 fill-primary" />
                    Unread
                  </TabsTrigger>
                  <TabsTrigger value="starred">
                    <Star className="h-4 w-4 mr-1" />
                    Starred
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">{selectedItems.length} selected</span>
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(selectedItems)}>
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>
                    Clear
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <InboxIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.client_id}
                        className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedConversation?.client_id === conv.client_id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                        } ${conv.unread_count > 0 ? 'bg-blue-50/50' : ''}`}
                        onClick={() => {
                          setSelectedConversation(conv);
                          if (conv.unread_count > 0) handleMarkAsRead(conv.client_id);
                        }}
                        data-testid={`conversation-${conv.client_id}`}
                      >
                        <Checkbox
                          checked={selectedItems.includes(conv.client_id)}
                          onCheckedChange={(checked) => handleSelectItem(conv.client_id, checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-medium truncate ${conv.unread_count > 0 ? 'font-semibold' : ''}`}>
                              {conv.client_name}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatTime(conv.last_message_time)}
                            </span>
                          </div>
                          <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {conv.last_message || 'No messages yet'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {conv.unread_count > 0 && (
                              <Badge className="h-5 px-1.5 text-xs bg-primary">
                                {conv.unread_count}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{conv.client_phone}</span>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => handleToggleStar(conv.client_id, e)}
                        >
                          <Star className={`h-4 w-4 ${conv.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message View */}
          <Card className="flex-1 flex flex-col min-w-0">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <CardHeader className="border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedConversation(null)}>
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">{selectedConversation.client_name}</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {selectedConversation.client_phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/clients/${selectedConversation.client_id}`)}
                      >
                        View Profile
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Send a message to start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${msg.direction === 'outbound' ? 'order-2' : 'order-1'}`}>
                            <div className={`rounded-2xl px-4 py-2 ${
                              msg.direction === 'outbound' 
                                ? 'bg-primary text-white rounded-br-md' 
                                : 'bg-muted rounded-bl-md'
                            }`}>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${
                              msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {msg.direction === 'outbound' && (
                                <CheckCheck className="h-3 w-3 ml-1 text-blue-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Reply Input */}
                <div className="p-4 border-t">
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
                      data-testid="reply-input"
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleSendReply}
                        disabled={sending || !replyText.trim()}
                        className="h-full"
                        data-testid="send-reply-btn"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <InboxIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the list to view messages</p>
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
