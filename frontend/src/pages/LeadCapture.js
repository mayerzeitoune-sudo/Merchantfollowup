import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Plus, 
  Upload,
  Link as LinkIcon,
  FileText,
  Webhook,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Code
} from 'lucide-react';
import { leadsApi, clientsApi } from '../lib/api';
import { toast } from 'sonner';

const LeadCapture = () => {
  const [forms, setForms] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvTags, setCsvTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  
  const [newForm, setNewForm] = useState({
    name: '',
    fields: [
      { name: 'name', type: 'text', required: true, label: 'Full Name' },
      { name: 'phone', type: 'tel', required: true, label: 'Phone Number' },
      { name: 'email', type: 'email', required: false, label: 'Email' }
    ],
    redirect_url: '',
    auto_tags: []
  });

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await leadsApi.getForms();
      setForms(response.data || []);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async () => {
    if (!newForm.name) {
      toast.error('Please enter a form name');
      return;
    }
    
    try {
      await leadsApi.createForm(newForm);
      toast.success('Form created successfully!');
      setFormDialogOpen(false);
      setNewForm({
        name: '',
        fields: [
          { name: 'name', type: 'text', required: true, label: 'Full Name' },
          { name: 'phone', type: 'tel', required: true, label: 'Phone Number' },
          { name: 'email', type: 'email', required: false, label: 'Email' }
        ],
        redirect_url: '',
        auto_tags: []
      });
      fetchForms();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create form');
    }
  };

  const handleCreateWebhook = async () => {
    try {
      const response = await leadsApi.createWebhook();
      setWebhooks([...webhooks, response.data]);
      toast.success('Webhook created!');
    } catch (error) {
      toast.error('Failed to create webhook');
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }
    
    setImporting(true);
    setImportResults(null);
    
    try {
      const response = await leadsApi.importCsv(csvFile, csvTags);
      setImportResults(response.data);
      toast.success(`Imported ${response.data.imported} contacts`);
      setCsvFile(null);
      setCsvTags('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const addFormField = () => {
    setNewForm({
      ...newForm,
      fields: [...newForm.fields, { name: '', type: 'text', required: false, label: '' }]
    });
  };

  const updateFormField = (index, field, value) => {
    const newFields = [...newForm.fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setNewForm({ ...newForm, fields: newFields });
  };

  const removeFormField = (index) => {
    setNewForm({
      ...newForm,
      fields: newForm.fields.filter((_, i) => i !== index)
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="lead-capture-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-['Outfit']">Lead Capture</h1>
          <p className="text-muted-foreground mt-1">Automatically capture leads from multiple sources</p>
        </div>

        <Tabs defaultValue="forms" className="space-y-6">
          <TabsList>
            <TabsTrigger value="forms">
              <FileText className="h-4 w-4 mr-2" />
              Forms
            </TabsTrigger>
            <TabsTrigger value="csv">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Webhooks
            </TabsTrigger>
          </TabsList>

          {/* Forms Tab */}
          <TabsContent value="forms" className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">Create embeddable forms to capture leads from your website</p>
              <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Form
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Lead Capture Form</DialogTitle>
                    <DialogDescription>
                      Design a form to capture leads from your website
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Form Name</Label>
                      <Input
                        value={newForm.name}
                        onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                        placeholder="e.g., Website Contact Form"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Form Fields</Label>
                        <Button variant="outline" size="sm" onClick={addFormField}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Field
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {newForm.fields.map((field, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                            <Input
                              value={field.label}
                              onChange={(e) => updateFormField(index, 'label', e.target.value)}
                              placeholder="Label"
                              className="flex-1"
                            />
                            <select
                              value={field.type}
                              onChange={(e) => updateFormField(index, 'type', e.target.value)}
                              className="h-10 px-3 rounded-md border bg-background"
                            >
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="tel">Phone</option>
                              <option value="number">Number</option>
                              <option value="textarea">Textarea</option>
                            </select>
                            <label className="flex items-center gap-1 text-sm">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateFormField(index, 'required', e.target.checked)}
                                className="rounded"
                              />
                              Required
                            </label>
                            {index >= 2 && (
                              <Button variant="ghost" size="sm" onClick={() => removeFormField(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Redirect URL (optional)</Label>
                      <Input
                        value={newForm.redirect_url}
                        onChange={(e) => setNewForm({ ...newForm, redirect_url: e.target.value })}
                        placeholder="https://yoursite.com/thank-you"
                      />
                      <p className="text-xs text-muted-foreground">
                        Where to redirect users after form submission
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Auto-assign Tags (comma separated)</Label>
                      <Input
                        value={newForm.auto_tags.join(', ')}
                        onChange={(e) => setNewForm({ 
                          ...newForm, 
                          auto_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                        })}
                        placeholder="Website Lead, New Lead"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateForm}>Create Form</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : forms.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No forms created yet</p>
                  <Button onClick={() => setFormDialogOpen(true)}>Create Your First Form</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {forms.map((form) => (
                  <Card key={form.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="font-['Outfit']">{form.name}</CardTitle>
                          <CardDescription>{form.fields?.length || 0} fields</CardDescription>
                        </div>
                        <Badge variant="secondary">{form.submissions_count || 0} submissions</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Form URL</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs flex-1 truncate">{form.form_url}</code>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(form.form_url)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {form.auto_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {form.auto_tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Code className="h-4 w-4 mr-2" />
                          Embed Code
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* CSV Import Tab */}
          <TabsContent value="csv" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import from CSV
                </CardTitle>
                <CardDescription>
                  Upload a CSV file to bulk import contacts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    {csvFile ? (
                      <p className="font-medium">{csvFile.name}</p>
                    ) : (
                      <>
                        <p className="font-medium">Click to upload CSV</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          or drag and drop
                        </p>
                      </>
                    )}
                  </label>
                </div>
                
                <div className="space-y-2">
                  <Label>Auto-assign Tags (optional)</Label>
                  <Input
                    value={csvTags}
                    onChange={(e) => setCsvTags(e.target.value)}
                    placeholder="CSV Import, New Lead"
                  />
                </div>
                
                <div className="p-4 rounded-lg bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-2">CSV Format</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    Your CSV should have these columns (first row as headers):
                  </p>
                  <code className="text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded">
                    name, phone, email, company
                  </code>
                </div>
                
                <Button 
                  onClick={handleCsvImport} 
                  disabled={!csvFile || importing}
                  className="w-full"
                >
                  {importing ? 'Importing...' : 'Import Contacts'}
                </Button>
                
                {importResults && (
                  <div className={`p-4 rounded-lg ${
                    importResults.errors?.length > 0 ? 'bg-yellow-50' : 'bg-green-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {importResults.errors?.length > 0 ? (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      <p className="font-medium">
                        Imported {importResults.imported} contacts
                      </p>
                    </div>
                    {importResults.errors?.length > 0 && (
                      <div className="text-sm text-yellow-700">
                        <p className="mb-1">{importResults.errors.length} errors:</p>
                        <ul className="list-disc list-inside">
                          {importResults.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground">
                  Create webhooks to receive leads from Zapier, Make, or custom integrations
                </p>
              </div>
              <Button onClick={handleCreateWebhook}>
                <Plus className="h-4 w-4 mr-2" />
                Create Webhook
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhook Endpoints
                </CardTitle>
                <CardDescription>
                  Send POST requests to these URLs to create leads
                </CardDescription>
              </CardHeader>
              <CardContent>
                {webhooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No webhooks created yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {webhooks.map((webhook) => (
                      <div key={webhook.id} className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center justify-between mb-2">
                          <Badge>POST</Badge>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(webhook.url)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <code className="text-sm block truncate">{webhook.url}</code>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-6 p-4 rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-2">Expected Payload</h4>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`{
  "name": "John Doe",
  "phone": "+15551234567",
  "email": "john@example.com",
  "company": "ACME Inc",
  "tags": ["Website Lead"]
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Zapier Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Zapier Integration</CardTitle>
                <CardDescription>Connect with 5000+ apps via Zapier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Connect to Zapier</p>
                      <p className="text-sm text-muted-foreground">
                        Automate lead capture from Facebook Ads, Google Forms, and more
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// Add Zap icon component
const Zap = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

export default LeadCapture;
