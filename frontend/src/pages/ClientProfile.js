import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  Tag,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Edit,
  Clock,
  Send,
  FileText,
  Gift,
  Zap,
  X,
  Pencil
} from 'lucide-react';
import { clientsApi, contactsApi } from '../lib/api';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const AVAILABLE_TAGS = [
  { value: "New Lead", color: "bg-blue-100 text-blue-700", stage: "new_lead" },
  { value: "Interested", color: "bg-cyan-100 text-cyan-700", stage: "interested" },
  { value: "Application Sent", color: "bg-indigo-100 text-indigo-700", stage: "application_sent" },
  { value: "Docs Submitted", color: "bg-orange-100 text-orange-700", stage: "docs_submitted" },
  { value: "Approved", color: "bg-emerald-100 text-emerald-700", stage: "approved" },
  { value: "Funded", color: "bg-green-100 text-green-800 font-semibold", stage: "funded" },
  { value: "Dead", color: "bg-red-100 text-red-700", stage: "dead" },
  { value: "Future", color: "bg-gray-100 text-gray-700", stage: "future" },
];

const getTagColor = (tag) => {
  const found = AVAILABLE_TAGS.find(t => t.value === tag);
  return found ? found.color : "bg-gray-100 text-gray-700";
};

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (clientId) {
      fetchClient();
      fetchConversation();
    }
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await clientsApi.getOne(clientId);
      setClient(response.data);
      setAiSummary(response.data.ai_summary);
    } catch (error) {
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversation = async () => {
    try {
      const response = await contactsApi.getConversation(clientId);
      setConversation(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch conversation');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setSavingNotes(true);
    try {
      // Create a new note log entry
      const noteEntry = {
        id: Date.now().toString(),
        text: newNote,
        created_at: new Date().toISOString(),
        created_by: user?.email || 'Unknown',
        created_by_name: user?.name || user?.email || 'Unknown'
      };
      
      const existingNotes = client.note_logs || [];
      const updatedNoteLogs = [noteEntry, ...existingNotes];
      
      await clientsApi.update(clientId, { note_logs: updatedNoteLogs });
      setClient({ ...client, note_logs: updatedNoteLogs });
      setNewNote('');
      toast.success('Note added!');
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleEditNote = async (noteId) => {
    if (!isAdmin) {
      toast.error('Only admins can edit notes');
      return;
    }
    
    setSavingNotes(true);
    try {
      const updatedNoteLogs = (client.note_logs || []).map(note => 
        note.id === noteId 
          ? { ...note, text: editNoteText, edited_at: new Date().toISOString(), edited_by: user?.email }
          : note
      );
      
      await clientsApi.update(clientId, { note_logs: updatedNoteLogs });
      setClient({ ...client, note_logs: updatedNoteLogs });
      setEditingNoteId(null);
      setEditNoteText('');
      toast.success('Note updated!');
    } catch (error) {
      toast.error('Failed to update note');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!isAdmin) {
      toast.error('Only admins can delete notes');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const updatedNoteLogs = (client.note_logs || []).filter(note => note.id !== noteId);
      await clientsApi.update(clientId, { note_logs: updatedNoteLogs });
      setClient({ ...client, note_logs: updatedNoteLogs });
      toast.success('Note deleted!');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await clientsApi.generateSummary(clientId);
      if (response.data.generated) {
        setAiSummary(response.data.summary);
        toast.success('AI summary generated!');
      } else {
        toast.info(response.data.summary);
      }
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleTagUpdate = async (tag) => {
    if (!client) return;
    
    let updatedTags;
    if (client.tags?.includes(tag)) {
      updatedTags = client.tags.filter(t => t !== tag);
    } else {
      updatedTags = [...(client.tags || []), tag];
    }
    
    try {
      await clientsApi.update(clientId, { tags: updatedTags });
      setClient({ ...client, tags: updatedTags });
      toast.success('Tag updated');
    } catch (error) {
      toast.error('Failed to update tag');
    }
  };

  const formatAddress = () => {
    if (!client) return null;
    const parts = [
      client.address_line1,
      client.address_line2,
      [client.city, client.state, client.zip_code].filter(Boolean).join(', '),
      client.country
    ].filter(Boolean);
    return parts.length > 0 ? parts : null;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client not found</p>
          <Button onClick={() => navigate('/clients')} className="mt-4">Back to Clients</Button>
        </div>
      </DashboardLayout>
    );
  }

  const address = formatAddress();

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="client-profile-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold font-['Outfit']">{client.name}</h1>
            <p className="text-muted-foreground">{client.company || 'No company'}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/contacts?client=${clientId}`}>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            </Link>
            <Link to="/gift-store">
              <Button variant="outline">
                <Gift className="h-4 w-4 mr-2" />
                Send Gift
              </Button>
            </Link>
            <Link to={`/clients`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Client Info */}
          <div className="space-y-6">
            {/* Contact Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">Client</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                  
                  {client.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  
                  {client.company && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{client.company}</span>
                    </div>
                  )}
                  
                  {client.birthday && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Birthday: {new Date(client.birthday).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Balance */}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Balance Owed</span>
                    <span className="text-xl font-bold text-primary">
                      ${client.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Address
                </CardTitle>
                <CardDescription>Required for gift shop deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                {address ? (
                  <div className="text-sm space-y-1">
                    {address.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No address on file</p>
                )}
              </CardContent>
            </Card>

            {/* Tags Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowTagEditor(!showTagEditor)}
                    data-testid="edit-tags-profile-btn"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {showTagEditor ? 'Done' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Current Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {client.tags?.length > 0 ? (
                    client.tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        className={`${getTagColor(tag)} ${showTagEditor ? 'cursor-pointer' : ''}`}
                        onClick={() => showTagEditor && handleTagUpdate(tag)}
                      >
                        {tag}
                        {showTagEditor && <X className="h-3 w-3 ml-1" />}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags assigned</p>
                  )}
                </div>
                
                {/* Tag Editor */}
                {showTagEditor && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Click to add/remove tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {AVAILABLE_TAGS.map((tag) => (
                        <Badge
                          key={tag.value}
                          variant="outline"
                          className={`cursor-pointer text-xs transition-all ${
                            client.tags?.includes(tag.value)
                              ? tag.color + ' border-transparent'
                              : 'hover:bg-secondary'
                          }`}
                          onClick={() => handleTagUpdate(tag.value)}
                          data-testid={`profile-tag-${tag.value.toLowerCase().replace(/\s/g, '-')}`}
                        >
                          {client.tags?.includes(tag.value) ? (
                            <X className="h-3 w-3 mr-1" />
                          ) : null}
                          {tag.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Notes & AI Summary */}
          <div className="space-y-6">
            {/* AI Summary Card */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    AI Conversation Summary
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                  >
                    {generatingSummary ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">{aiSummary ? 'Refresh' : 'Generate'}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiSummary ? (
                  <p className="text-sm leading-relaxed">{aiSummary}</p>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Click "Generate" to create an AI summary</p>
                    <p className="text-xs mt-1">Based on your conversation history</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </CardTitle>
                <CardDescription>Timestamped notes about this client (Admin can edit)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add New Note */}
                <div className="space-y-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a new note..."
                    rows={3}
                    className="resize-none"
                    data-testid="client-notes-textarea"
                  />
                  <Button 
                    onClick={handleAddNote} 
                    disabled={savingNotes || !newNote.trim()}
                    className="w-full"
                  >
                    {savingNotes ? 'Saving...' : 'Add Note'}
                  </Button>
                </div>

                {/* Notes Log */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Note History</h4>
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3">
                      {(client?.note_logs || []).length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">No notes yet</p>
                      ) : (
                        (client?.note_logs || []).map((note) => (
                          <div key={note.id} className="p-3 rounded-lg bg-muted/50 border">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                {editingNoteId === note.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editNoteText}
                                      onChange={(e) => setEditNoteText(e.target.value)}
                                      rows={3}
                                      className="text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleEditNote(note.id)} disabled={savingNotes}>
                                        Save
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                                )}
                              </div>
                              {isAdmin && editingNoteId !== note.id && (
                                <div className="flex gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingNoteId(note.id);
                                      setEditNoteText(note.text);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleDeleteNote(note.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(note.created_at).toLocaleString()}
                              <span className="text-primary">• {note.created_by_name}</span>
                              {note.edited_at && (
                                <span className="italic">(edited)</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Conversation History */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-['Outfit'] text-lg flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Conversation History
                  </CardTitle>
                  <Link to={`/contacts`}>
                    <Button variant="outline" size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      Open Inbox
                    </Button>
                  </Link>
                </div>
                <CardDescription>{conversation.length} messages</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  {conversation.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet</p>
                      <Link to="/contacts">
                        <Button className="mt-4" size="sm">
                          Start Conversation
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversation.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`
                            max-w-[85%] rounded-lg p-3 text-sm
                            ${msg.direction === 'outbound' 
                              ? 'bg-primary text-white rounded-br-none' 
                              : 'bg-secondary rounded-bl-none'
                            }
                          `}>
                            <p>{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${
                              msg.direction === 'outbound' ? 'text-white/70' : 'text-muted-foreground'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {new Date(msg.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientProfile;
