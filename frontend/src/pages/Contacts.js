import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { 
  Search, 
  Phone,
  MessageSquare,
  Send,
  PhoneCall,
  User,
  Clock,
  Filter,
  MessageCircle,
  Zap
} from 'lucide-react';
import { clientsApi, contactsApi, templatesApi } from '../lib/api';
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
  { value: "Funded", color: "bg-green-100 text-green-800" },
  { value: "Lost Deal", color: "bg-red-100 text-red-700" },
];

const getTagColor = (tag) => {
  const found = AVAILABLE_TAGS.find(t => t.value === tag);
  return found ? found.color : "bg-gray-100 text-gray-700";
};

const Contacts = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [tagFilter]);

  useEffect(() => {
    if (selectedClient) {
      fetchConversation(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.getAll(tagFilter === 'all' ? null : tagFilter);
      setClients(response.data);
    } catch (error) {
      toast.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversation = async (clientId) => {
    try {
      const response = await contactsApi.getConversation(clientId);
      setConversation(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch conversation');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedClient) return;
    
    setSending(true);
    try {
      await contactsApi.sendSms(selectedClient.id, message);
      toast.success('Message sent!');
      setMessage('');
      fetchConversation(selectedClient.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCall = async () => {
    if (!selectedClient) return;
    
    setCalling(true);
    try {
      const response = await contactsApi.initiateCall(selectedClient.id);
      if (response.data.provider_configured) {
        toast.success('Call initiated!');
      } else {
        toast.info('Configure Twilio Voice in Settings to make browser calls');
      }
    } catch (error) {
      toast.error('Failed to initiate call');
    } finally {
      setCalling(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.phone.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="contacts-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-['Outfit']">Contacts</h1>
          <p className="text-muted-foreground mt-1">Message and call your clients</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* Contacts List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="search-contacts-input"
                />
              </div>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-full" data-testid="contact-tag-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  {AVAILABLE_TAGS.map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : filteredClients.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No contacts found</p>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`
                          flex flex-col gap-2 p-3 rounded-lg cursor-pointer transition-colors
                          ${selectedClient?.id === client.id 
                            ? 'bg-primary text-white' 
                            : 'hover:bg-secondary'
                          }
                        `}
                        data-testid={`contact-${client.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0
                            ${selectedClient?.id === client.id ? 'bg-white/20' : 'bg-primary/10'}
                          `}>
                            <User className={`h-5 w-5 ${selectedClient?.id === client.id ? 'text-white' : 'text-primary'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{client.name}</p>
                            <p className={`text-sm truncate ${selectedClient?.id === client.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                              {client.phone}
                            </p>
                          </div>
                          {client.balance > 0 && (
                            <Badge variant={selectedClient?.id === client.id ? "secondary" : "outline"} className="text-xs flex-shrink-0">
                              ${client.balance.toFixed(0)}
                            </Badge>
                          )}
                        </div>
                        {/* Tags */}
                        {client.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-13">
                            {client.tags.slice(0, 2).map((tag) => (
                              <Badge 
                                key={tag} 
                                className={`text-xs ${
                                  selectedClient?.id === client.id 
                                    ? 'bg-white/20 text-white' 
                                    : getTagColor(tag)
                                }`}
                              >
                                {tag}
                              </Badge>
                            ))}
                            {client.tags.length > 2 && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  selectedClient?.id === client.id ? 'border-white/30 text-white/70' : ''
                                }`}
                              >
                                +{client.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Conversation View */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedClient ? (
              <>
                {/* Contact Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-['Outfit']">{selectedClient.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {selectedClient.phone}
                          {selectedClient.tags?.length > 0 && (
                            <span className="text-muted-foreground">•</span>
                          )}
                          {selectedClient.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} className={`text-xs ${getTagColor(tag)}`}>
                              {tag}
                            </Badge>
                          ))}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCall}
                        disabled={calling}
                        data-testid="call-btn"
                      >
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {conversation.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversation.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`
                            max-w-[70%] rounded-lg p-3
                            ${msg.direction === 'outbound' 
                              ? 'bg-primary text-white rounded-br-none' 
                              : 'bg-secondary rounded-bl-none'
                            }
                          `}>
                            <p className="text-sm">{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'text-white/70' : 'text-muted-foreground'}`}>
                              <Clock className="h-3 w-3" />
                              <span className="text-xs">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="resize-none"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="message-input"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={sending || !message.trim()}
                      className="h-auto"
                      data-testid="send-message-btn"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a contact</p>
                  <p className="text-sm">Choose a contact to view conversation</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Contacts;
