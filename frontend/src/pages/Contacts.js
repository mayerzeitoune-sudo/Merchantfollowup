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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
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
  Zap,
  FileText,
  ChevronRight,
  Smartphone,
  Tag,
  X,
  Pencil,
  ArrowRight,
  Reply,
  TestTube2
} from 'lucide-react';
import { clientsApi, contactsApi, templatesApi, phoneNumbersApi } from '../lib/api';
import { toast } from 'sonner';

const AVAILABLE_TAGS = [
  { value: "New Lead", color: "bg-blue-100 text-blue-700", stage: "new_lead" },
  { value: "Interested", color: "bg-cyan-100 text-cyan-700", stage: "interested" },
  { value: "Application Sent", color: "bg-indigo-100 text-indigo-700", stage: "application_sent" },
  { value: "Docs Submitted", color: "bg-orange-100 text-orange-700", stage: "docs_submitted" },
  { value: "Approved", color: "bg-emerald-100 text-emerald-700", stage: "approved" },
  { value: "Funded", color: "bg-green-100 text-green-800", stage: "funded" },
  { value: "Dead", color: "bg-red-100 text-red-700", stage: "dead" },
  { value: "Future", color: "bg-gray-100 text-gray-700", stage: "future" },
];

const getTagColor = (tag) => {
  const found = AVAILABLE_TAGS.find(t => t.value === tag);
  return found ? found.color : "bg-gray-100 text-gray-700";
};

const Contacts = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [conversationChains, setConversationChains] = useState([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);
  
  // Phone numbers for "send from"
  const [ownedNumbers, setOwnedNumbers] = useState([]);
  const [selectedFromNumber, setSelectedFromNumber] = useState('default');
  const [activeChain, setActiveChain] = useState('default');
  
  // Template functionality
  const [templates, setTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});
  
  // Tag editing
  const [showTagEditor, setShowTagEditor] = useState(false);
  
  // Simulate reply dialog
  const [showSimulateDialog, setShowSimulateDialog] = useState(false);
  const [simulateReplyText, setSimulateReplyText] = useState('');

  useEffect(() => {
    fetchClients();
    fetchTemplates();
    fetchOwnedNumbers();
  }, [tagFilter]);

  useEffect(() => {
    if (selectedClient) {
      fetchConversationChains(selectedClient.id);
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedClient && activeChain) {
      fetchConversation(selectedClient.id, activeChain);
    }
  }, [selectedClient, activeChain]);

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

  const fetchTemplates = async () => {
    try {
      const response = await templatesApi.getAll();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates');
    }
  };

  const fetchOwnedNumbers = async () => {
    try {
      const response = await phoneNumbersApi.getOwned();
      const numbers = response.data || [];
      setOwnedNumbers(numbers);
      // Find and set default number
      const defaultNum = numbers.find(n => n.is_default);
      if (defaultNum) {
        setSelectedFromNumber(defaultNum.phone_number);
      } else if (numbers.length > 0) {
        setSelectedFromNumber(numbers[0].phone_number);
      }
    } catch (error) {
      console.error('Failed to fetch phone numbers');
    }
  };

  const fetchConversationChains = async (clientId) => {
    try {
      const response = await contactsApi.getChains(clientId);
      setConversationChains(response.data.chains || []);
      // Set active chain to the most recent one or default
      if (response.data.chains?.length > 0) {
        setActiveChain(response.data.chains[0].from_number);
        setSelectedFromNumber(response.data.chains[0].from_number);
      }
    } catch (error) {
      console.error('Failed to fetch conversation chains');
      setConversationChains([{ from_number: 'default', display_name: 'Default Number', message_count: 0 }]);
    }
  };

  const fetchConversation = async (clientId, fromNumber = null) => {
    try {
      const response = await contactsApi.getConversation(clientId, fromNumber);
      setConversation(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch conversation');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedClient) return;
    
    setSending(true);
    try {
      const fromNumber = selectedFromNumber === 'default' ? null : selectedFromNumber;
      await contactsApi.sendSms(selectedClient.id, {
        message: message,
        from_number: fromNumber
      });
      toast.success('Message sent!');
      setMessage('');
      // Refresh both chains and conversation
      fetchConversationChains(selectedClient.id);
      fetchConversation(selectedClient.id, activeChain);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSelectChain = (fromNumber) => {
    setActiveChain(fromNumber);
    setSelectedFromNumber(fromNumber);
  };

  const handleStartNewChain = (phoneNumber) => {
    setActiveChain(phoneNumber);
    setSelectedFromNumber(phoneNumber);
    setConversation([]);  // Clear conversation for new chain
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !selectedClient) return;
    
    setSending(true);
    try {
      // Prepare variables with default values
      const variables = {
        ...templateVariables,
        client_name: selectedClient.name,
        client_company: selectedClient.company || '',
        client_balance: selectedClient.balance?.toString() || '0'
      };
      
      // Use the currently selected from_number
      const fromNumber = selectedFromNumber === 'default' ? null : selectedFromNumber;
      await templatesApi.sendToContact(selectedClient.id, selectedTemplate.id, variables, fromNumber);
      toast.success('Template message sent!');
      setShowTemplateDialog(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
      // Refresh both chains and conversation with current active chain
      fetchConversationChains(selectedClient.id);
      fetchConversation(selectedClient.id, activeChain);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send template message');
    } finally {
      setSending(false);
    }
  };

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    
    // Initialize variables with default values
    const defaultVars = {
      client_name: selectedClient?.name || '',
      client_company: selectedClient?.company || '',
      client_balance: selectedClient?.balance?.toString() || '0'
    };
    
    // Set up variables that need user input
    const userVars = {};
    template.variables.forEach(variable => {
      if (!defaultVars[variable]) {
        userVars[variable] = '';
      }
    });
    
    setTemplateVariables(userVars);
    
    // If no user input needed, we still show the dialog for confirmation
    setShowTemplateDialog(true);
  };

  // Tag editing handler
  const handleQuickTagUpdate = async (tag) => {
    if (!selectedClient) return;
    
    let updatedTags;
    if (selectedClient.tags?.includes(tag)) {
      updatedTags = selectedClient.tags.filter(t => t !== tag);
    } else {
      updatedTags = [...(selectedClient.tags || []), tag];
    }
    
    try {
      await clientsApi.update(selectedClient.id, { tags: updatedTags });
      toast.success('Tag updated');
      // Update local state
      setSelectedClient({ ...selectedClient, tags: updatedTags });
      // Refresh clients list
      fetchClients();
    } catch (error) {
      toast.error('Failed to update tag');
    }
  };

  const previewTemplateContent = () => {
    if (!selectedTemplate) return '';
    
    let content = selectedTemplate.content;
    const allVariables = {
      ...templateVariables,
      client_name: selectedClient?.name || '',
      client_company: selectedClient?.company || '',
      client_balance: selectedClient?.balance?.toString() || '0'
    };
    
    Object.entries(allVariables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`);
    });
    
    return content;
  };

  const handleCall = async () => {
    if (!selectedClient) return;
    
    setCalling(true);
    try {
      const fromNumber = selectedFromNumber === 'default' ? null : selectedFromNumber;
      const response = await contactsApi.initiateCall(selectedClient.id, fromNumber);
      if (response.data.provider_configured) {
        toast.success(`Call initiated from ${response.data.from_number || 'default number'}!`);
      } else {
        toast.info('Configure Twilio Voice in Settings to make browser calls');
      }
    } catch (error) {
      toast.error('Failed to initiate call');
    } finally {
      setCalling(false);
    }
  };

  const handleSimulateReply = async () => {
    if (!selectedClient || !simulateReplyText.trim()) return;
    
    try {
      const fromNumber = selectedFromNumber === 'default' ? null : selectedFromNumber;
      const response = await contactsApi.simulateInbound(selectedClient.id, simulateReplyText, fromNumber);
      toast.success(`Simulated reply from ${selectedClient.name}`);
      setSimulateReplyText('');
      setShowSimulateDialog(false);
      // Refresh the conversation to see the new inbound message with context
      fetchConversationChains(selectedClient.id);
      fetchConversation(selectedClient.id, activeChain);
    } catch (error) {
      toast.error('Failed to simulate reply');
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
                <CardHeader className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-['Outfit']">{selectedClient.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {selectedClient.phone}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowTagEditor(!showTagEditor)}
                        title="Edit Tags"
                        data-testid="edit-tags-btn"
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
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
                  
                  {/* Tags Display and Editor */}
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1 items-center">
                      {selectedClient.tags?.length > 0 ? (
                        selectedClient.tags.map((tag) => (
                          <Badge 
                            key={tag} 
                            className={`text-xs cursor-pointer ${getTagColor(tag)}`}
                            onClick={() => showTagEditor && handleQuickTagUpdate(tag)}
                          >
                            {tag}
                            {showTagEditor && <X className="h-3 w-3 ml-1" />}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No tags</span>
                      )}
                      {!showTagEditor && selectedClient.tags?.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setShowTagEditor(true)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                    
                    {/* Tag Editor Dropdown */}
                    {showTagEditor && (
                      <div className="mt-2 p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-medium">Click to add/remove tags:</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => setShowTagEditor(false)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {AVAILABLE_TAGS.map((tag) => (
                            <Badge
                              key={tag.value}
                              variant="outline"
                              className={`cursor-pointer text-xs transition-all ${
                                selectedClient.tags?.includes(tag.value)
                                  ? tag.color + ' border-transparent'
                                  : 'hover:bg-secondary'
                              }`}
                              onClick={() => handleQuickTagUpdate(tag.value)}
                              data-testid={`inbox-tag-${tag.value.toLowerCase().replace(/\s/g, '-')}`}
                            >
                              {selectedClient.tags?.includes(tag.value) && (
                                <X className="h-3 w-3 mr-1" />
                              )}
                              {tag.value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Conversation Chains Tabs */}
                <div className="px-4 py-2 border-b bg-secondary/30">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Conversations:</span>
                    {conversationChains.map((chain) => {
                      const isDefault = ownedNumbers.find(n => n.phone_number === chain.from_number && n.is_default);
                      return (
                        <Button
                          key={chain.from_number}
                          variant={activeChain === chain.from_number ? "default" : "outline"}
                          size="sm"
                          className="whitespace-nowrap h-8"
                          onClick={() => handleSelectChain(chain.from_number)}
                          data-testid={`chain-${chain.from_number}`}
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          {chain.display_name}
                          {isDefault && (
                            <Badge className="ml-1 h-4 px-1 text-[10px] bg-orange-100 text-orange-700">
                              Default
                            </Badge>
                          )}
                          {chain.message_count > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                              {chain.message_count}
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                    {/* Option to start new chain with different number */}
                    {ownedNumbers.filter(n => !conversationChains.find(c => c.from_number === n.phone_number)).length > 0 && (
                      <Select onValueChange={handleStartNewChain}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <span className="text-muted-foreground">+ New chain</span>
                        </SelectTrigger>
                        <SelectContent>
                          {ownedNumbers
                            .filter(n => !conversationChains.find(c => c.from_number === n.phone_number))
                            .map((num) => (
                              <SelectItem key={num.id} value={num.phone_number}>
                                {num.friendly_name || num.phone_number}
                                {num.is_default && " (Default)"}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

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
                      {conversation.map((msg, index) => {
                        // Check if this is an inbound message and find what it might be responding to
                        const isInbound = msg.direction === 'inbound';
                        const previousOutbound = isInbound ? 
                          conversation.slice(0, index).reverse().find(m => m.direction === 'outbound') : null;
                        
                        return (
                          <div
                            key={index}
                            className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className="max-w-[75%]">
                              {/* Show "Responding to" context for inbound messages */}
                              {isInbound && (previousOutbound || msg.responding_to) && (
                                <div className="mb-2 ml-2">
                                  <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                    <ArrowRight className="h-3 w-3 rotate-180" />
                                    Responding to:
                                  </div>
                                  <div className="bg-muted/50 border-l-2 border-primary/30 pl-3 py-2 rounded-r text-xs text-muted-foreground italic">
                                    "{(msg.responding_to || previousOutbound?.content || '').substring(0, 100)}{(msg.responding_to || previousOutbound?.content || '').length > 100 ? '...' : ''}"
                                    {(msg.campaign_name || previousOutbound?.campaign_name) && (
                                      <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                                        {msg.campaign_name || previousOutbound?.campaign_name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Campaign badge for outbound campaign messages */}
                              {msg.direction === 'outbound' && msg.campaign_name && (
                                <div className="flex justify-end mb-1">
                                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                    <Zap className="h-3 w-3 mr-1" />
                                    {msg.campaign_name}
                                  </Badge>
                                </div>
                              )}
                              
                              <div className={`
                                rounded-lg p-3
                                ${msg.direction === 'outbound' 
                                  ? 'bg-primary text-white rounded-br-none' 
                                  : 'bg-secondary rounded-bl-none'
                                }
                              `}>
                                <p className="text-sm">{msg.content}</p>
                                <div className={`flex items-center gap-2 mt-1 ${msg.direction === 'outbound' ? 'text-white/70' : 'text-muted-foreground'}`}>
                                  <Clock className="h-3 w-3" />
                                  <span className="text-xs">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                  </span>
                                  {msg.from_number && msg.direction === 'outbound' && (
                                    <span className="text-xs flex items-center gap-1">
                                      • <Smartphone className="h-3 w-3" /> {msg.from_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t space-y-3">
                  {/* Current Chain Indicator */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    <span>Sending from:</span>
                    <Badge variant="secondary">
                      {conversationChains.find(c => c.from_number === activeChain)?.display_name || 'Default Number'}
                    </Badge>
                  </div>

                  {/* Templates Section */}
                  {templates.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Quick Templates</Label>
                      <ScrollArea className="w-full">
                        <div className="flex gap-2 py-2">
                          {templates.slice(0, 6).map((template) => (
                            <Button
                              key={template.id}
                              variant="outline"
                              size="sm"
                              onClick={() => handleUseTemplate(template)}
                              className="whitespace-nowrap flex-shrink-0"
                              data-testid={`quick-template-${template.id}`}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              {template.name}
                            </Button>
                          ))}
                          {templates.length > 6 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowTemplateDialog(true)}
                              className="whitespace-nowrap flex-shrink-0"
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              More Templates
                            </Button>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  {/* Message Input */}
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
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowTemplateDialog(true)}
                        title="Use Template"
                        data-testid="template-btn"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={handleSendMessage}
                        disabled={sending || !message.trim()}
                        size="icon"
                        data-testid="send-message-btn"
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
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a contact</p>
                  <p className="text-sm">Choose a contact to view conversation</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Template Selection Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Choose a Template</DialogTitle>
              <DialogDescription>
                Select a message template to send to {selectedClient?.name}
              </DialogDescription>
            </DialogHeader>
            
            {/* From Number Indicator */}
            <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sending from:</span>
              <Badge variant="secondary">
                {conversationChains.find(c => c.from_number === selectedFromNumber)?.display_name || 
                 ownedNumbers.find(n => n.phone_number === selectedFromNumber)?.friendly_name ||
                 selectedFromNumber === 'default' ? 'Default Number' : selectedFromNumber}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[60vh] overflow-hidden">
              {/* Template List */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Available Templates</Label>
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-2 pr-4">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.content}
                          </p>
                          {template.variables.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.variables.slice(0, 3).map((variable) => (
                                <Badge key={variable} variant="outline" className="text-xs">
                                  {variable}
                                </Badge>
                              ))}
                              {template.variables.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.variables.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Template Preview & Variables */}
              <div>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Preview</Label>
                      <Card className="mt-2">
                        <CardContent className="p-3">
                          <p className="text-sm whitespace-pre-wrap">
                            {previewTemplateContent()}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Variable Inputs */}
                    {Object.keys(templateVariables).length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Fill in Variables</Label>
                        <div className="space-y-3 mt-2">
                          {Object.keys(templateVariables).map((variable) => (
                            <div key={variable}>
                              <Label htmlFor={variable} className="text-xs">
                                {variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Label>
                              <Input
                                id={variable}
                                value={templateVariables[variable]}
                                onChange={(e) => setTemplateVariables(prev => ({
                                  ...prev,
                                  [variable]: e.target.value
                                }))}
                                placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                                className="text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Select a template to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowTemplateDialog(false);
                setSelectedTemplate(null);
                setTemplateVariables({});
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendTemplate} 
                disabled={!selectedTemplate || sending}
              >
                {sending ? 'Sending...' : 'Send Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Contacts;
