import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  FileText,
  Pencil,
  Trash2,
  Copy,
  BarChart3,
  Sparkles,
  Send,
  Wand2,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { templatesApi, aiApi } from '../lib/api';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: "Payment Reminder", color: "bg-orange-100 text-orange-700" },
  { value: "Follow Up", color: "bg-yellow-100 text-yellow-700" },
  { value: "Introduction", color: "bg-blue-100 text-blue-700" },
  { value: "Thank You", color: "bg-green-100 text-green-700" },
  { value: "Appointment", color: "bg-purple-100 text-purple-700" },
  { value: "General", color: "bg-gray-100 text-gray-700" },
];

const getCategoryColor = (category) => {
  const found = CATEGORIES.find(c => c.value === category);
  return found ? found.color : "bg-gray-100 text-gray-700";
};

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    content: ''
  });
  
  // AI Assistant state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiTemplateType, setAiTemplateType] = useState('follow_up');
  const [aiTone, setAiTone] = useState('professional');

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  const fetchTemplates = async () => {
    try {
      const response = await templatesApi.getAll(categoryFilter === 'all' ? null : categoryFilter);
      setTemplates(response.data);
    } catch (error) {
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await templatesApi.update(editingTemplate.id, formData);
        toast.success('Template updated');
      } else {
        await templatesApi.create(formData);
        toast.success('Template created');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      content: template.content
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await templatesApi.delete(id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({ name: '', category: 'General', content: '' });
  };

  // AI Functions
  const handleAiGenerateTemplate = async () => {
    setAiLoading(true);
    try {
      const response = await aiApi.generateTemplate(aiTemplateType, '', aiTone);
      const newMessage = {
        role: 'assistant',
        content: response.data.template,
        variables: response.data.variables
      };
      setAiChatMessages(prev => [...prev, newMessage]);
      toast.success('Template generated!');
    } catch (error) {
      toast.error('Failed to generate template');
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
      const response = await aiApi.chat(aiInput, 'templates');
      const assistantMessage = { role: 'assistant', content: response.data.response };
      setAiChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseAiTemplate = (content) => {
    setFormData(prev => ({ ...prev, content }));
    setAiDialogOpen(false);
    setIsDialogOpen(true);
    toast.success('Template added to editor');
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.content.toLowerCase().includes(search.toLowerCase())
  );

  // Extract variables from content
  const extractVariables = (content) => {
    const matches = content.match(/\{(\w+)\}/g) || [];
    return [...new Set(matches)];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="templates-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Message Templates</h1>
            <p className="text-muted-foreground mt-1">Create and manage reusable message templates</p>
          </div>
          <div className="flex gap-2">
            {/* AI Assistant Button */}
            <Button variant="outline" onClick={() => setAiDialogOpen(true)} data-testid="ai-assistant-btn">
              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
              AI Assistant
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90" data-testid="add-template-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-['Outfit']">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </DialogTitle>
                <DialogDescription>
                  {editingTemplate ? 'Update your message template' : 'Create a reusable message template'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Payment Reminder - Friendly"
                    required
                    data-testid="template-name-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="template-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Message Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Hi {name}, this is a friendly reminder about your payment of ${amount}. Please let us know if you have any questions!"
                    rows={5}
                    required
                    data-testid="template-content-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variables: {'{name}'}, {'{amount}'}, {'{company}'}, {'{date}'}, {'{phone}'}
                  </p>
                </div>

                {/* Preview variables */}
                {formData.content && extractVariables(formData.content).length > 0 && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Variables detected:</p>
                    <div className="flex flex-wrap gap-1">
                      {extractVariables(formData.content).map((v, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{v}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" data-testid="save-template-btn">
                    {editingTemplate ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="search-templates-input"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48" data-testid="category-filter-select">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                {search || categoryFilter !== 'all' ? 'No templates found' : 'No templates yet'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-['Outfit'] truncate">{template.name}</CardTitle>
                      <Badge className={`mt-1 ${getCategoryColor(template.category)}`}>
                        {template.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      <span className="text-xs">{template.use_count}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {template.content}
                  </p>
                  
                  {template.variables?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.variables.slice(0, 4).map((v, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{`{${v}}`}</Badge>
                      ))}
                      {template.variables.length > 4 && (
                        <Badge variant="outline" className="text-xs">+{template.variables.length - 4}</Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCopy(template.content)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Templates;
