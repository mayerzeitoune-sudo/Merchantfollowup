import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Phone,
  Mail,
  Building,
  User,
  DollarSign,
  Tag,
  Filter,
  X,
  Calendar,
  MapPin,
  Eye,
  CheckSquare
} from 'lucide-react';
import { clientsApi, bulkApi, enhancedCampaignsApi } from '../lib/api';
import { toast } from 'sonner';

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

const STAGE_TO_TAG = {
  'new_lead': 'New Lead',
  'interested': 'Interested',
  'application_sent': 'Application Sent',
  'docs_submitted': 'Docs Submitted',
  'approved': 'Approved',
  'funded': 'Funded',
  'dead': 'Dead',
  'future': 'Future',
};

const TAG_TO_STAGE = Object.fromEntries(
  Object.entries(STAGE_TO_TAG).map(([k, v]) => [v, k])
);

const getTagColor = (tag) => {
  const found = AVAILABLE_TAGS.find(t => t.value === tag);
  return found ? found.color : "bg-gray-100 text-gray-700";
};

// Standardize phone number to +1 format
const formatPhoneInput = (value) => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // If starts with 1 and has 11 digits, format as +1 (XXX) XXX-XXXX
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }
  
  // If has 10 digits, format as +1 (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  
  // For partial input, format progressively
  if (digits.length <= 3) {
    return digits.length > 0 ? `+1 (${digits}` : '';
  }
  if (digits.length <= 6) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  if (digits.length <= 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // For longer numbers (international), just clean format
  return `+${digits}`;
};

// Get raw phone number for storage (E.164 format)
const getE164Phone = (formattedPhone) => {
  const digits = formattedPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return digits.length > 0 ? `+${digits}` : '';
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [fundedDialogOpen, setFundedDialogOpen] = useState(false);
  const [fundedClient, setFundedClient] = useState(null);
  const [fundedDealType, setFundedDealType] = useState('');
  const [fundedLaunching, setFundedLaunching] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    balance: 0,
    amount_requested: '',
    tags: [],
    birthday: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US'
  });

  useEffect(() => {
    fetchClients();
  }, [tagFilter]);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.getAll(tagFilter === 'all' ? null : tagFilter);
      setClients(response.data);
      setSelectedClients([]); // Reset selection on fetch
    } catch (error) {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Standardize phone number to E.164 format before saving
    const dataToSave = {
      ...formData,
      phone: getE164Phone(formData.phone)
    };
    
    try {
      if (editingClient) {
        await clientsApi.update(editingClient.id, dataToSave);
        toast.success('Client updated successfully');
      } else {
        await clientsApi.create(dataToSave);
        toast.success('Client created successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg || 'Operation failed' : 'Operation failed';
      toast.error(message);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone,
      company: client.company || '',
      notes: client.notes || '',
      balance: client.balance,
      amount_requested: client.amount_requested || '',
      tags: client.tags || [],
      birthday: client.birthday || '',
      address_line1: client.address_line1 || '',
      address_line2: client.address_line2 || '',
      city: client.city || '',
      state: client.state || '',
      zip_code: client.zip_code || '',
      country: client.country || 'US'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    setClientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      await clientsApi.delete(clientToDelete);
      toast.success('Client deleted');
      fetchClients();
    } catch (error) {
      toast.error('Failed to delete client');
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleSelectClient = (clientId, checked) => {
    if (checked) {
      setSelectedClients([...selectedClients, clientId]);
    } else {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedClients(filteredClients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await bulkApi.deleteClients(selectedClients);
      toast.success(result.data.message);
      fetchClients();
    } catch (error) {
      toast.error('Failed to delete clients');
    } finally {
      setBulkDeleteDialogOpen(false);
      setSelectedClients([]);
    }
  };

  const handleQuickTagUpdate = async (clientId, newTag) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    const newStage = TAG_TO_STAGE[newTag];
    
    let updatedTags;
    if (client.tags?.includes(newTag)) {
      updatedTags = client.tags.filter(t => t !== newTag);
    } else {
      if (newStage) {
        const stageTags = Object.values(STAGE_TO_TAG);
        updatedTags = (client.tags || []).filter(t => !stageTags.includes(t));
        updatedTags.push(newTag);
      } else {
        updatedTags = [...(client.tags || []), newTag];
      }
    }
    
    try {
      const updateData = { tags: updatedTags };
      if (newStage && !client.tags?.includes(newTag)) {
        updateData.pipeline_stage = newStage;
      }
      await clientsApi.update(clientId, updateData);
      toast.success(newStage ? `Moved to ${newTag}` : 'Tag updated');
      fetchClients();
      
      // If moved to "Funded", prompt for funded deal campaign
      if (newTag === 'Funded' && !client.tags?.includes('Funded')) {
        const foundClient = clients.find(c => c.id === clientId);
        setFundedClient(foundClient || { id: clientId, name: client.name });
        setFundedDialogOpen(true);
      }
    } catch (error) {
      toast.error('Failed to update tag');
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({ 
      name: '', 
      email: '', 
      phone: '', 
      company: '', 
      notes: '', 
      balance: 0, 
      amount_requested: '',
      tags: [], 
      birthday: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'US'
    });
  };

  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.phone.includes(search) ||
    (client.email && client.email.toLowerCase().includes(search.toLowerCase()))
  );

  const tagCounts = AVAILABLE_TAGS.reduce((acc, tag) => {
    acc[tag.value] = clients.filter(c => c.tags?.includes(tag.value)).length;
    return acc;
  }, {});

  const isAllSelected = filteredClients.length > 0 && selectedClients.length === filteredClients.length;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="clients-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your customer database with tags</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedClients.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => setBulkDeleteDialogOpen(true)}
                data-testid="bulk-delete-btn"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedClients.length})
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90" data-testid="add-client-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-['Outfit']">
                    {editingClient ? 'Edit Client' : 'Add New Client'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingClient ? 'Update client information' : 'Add a new customer to your database'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="pl-10"
                        required
                        data-testid="client-name-input"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })}
                        placeholder="+1 (555) 000-0000"
                        className="pl-10"
                        required
                        data-testid="client-phone-input"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Phone numbers are automatically formatted to US format (+1)</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        className="pl-10"
                        data-testid="client-email-input"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="Acme Inc."
                          className="pl-10"
                          data-testid="client-company-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount_requested">Amount Requested</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount_requested"
                          type="number"
                          value={formData.amount_requested}
                          onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value ? parseFloat(e.target.value) : '' })}
                          placeholder="50000"
                          className="pl-10"
                          data-testid="client-amount-requested-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthday">Birthday</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="birthday"
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        className="pl-10"
                        data-testid="client-birthday-input"
                      />
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Address (optional - needed for gift delivery)
                    </Label>
                    
                    <div className="space-y-2">
                      <Input
                        value={formData.address_line1}
                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                        placeholder="Street Address"
                        data-testid="client-address1-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Input
                        value={formData.address_line2}
                        onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                        placeholder="Apt, Suite, Unit (optional)"
                        data-testid="client-address2-input"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                        data-testid="client-city-input"
                      />
                      <Input
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="State"
                        data-testid="client-state-input"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        placeholder="ZIP Code"
                        data-testid="client-zip-input"
                      />
                      <Select 
                        value={formData.country} 
                        onValueChange={(value) => setFormData({ ...formData, country: value })}
                      >
                        <SelectTrigger data-testid="client-country-select">
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tags Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_TAGS.map((tag) => (
                        <Badge
                          key={tag.value}
                          variant="outline"
                          className={`cursor-pointer transition-all ${
                            formData.tags.includes(tag.value) 
                              ? tag.color + ' border-transparent' 
                              : 'hover:bg-secondary'
                          }`}
                          onClick={() => toggleTag(tag.value)}
                          data-testid={`tag-${tag.value.toLowerCase().replace(/\s/g, '-')}`}
                        >
                          {formData.tags.includes(tag.value) && (
                            <X className="h-3 w-3 mr-1" />
                          )}
                          {tag.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about this client..."
                      rows={3}
                      data-testid="client-notes-input"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" data-testid="save-client-btn">
                      {editingClient ? 'Update' : 'Add Client'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-clients-input"
              />
            </div>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-48" data-testid="tag-filter-select">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients ({clients.length})</SelectItem>
                <DropdownMenuSeparator />
                {AVAILABLE_TAGS.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{tag.value}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {tagCounts[tag.value] || 0}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active filter and selection indicator */}
          <div className="flex items-center gap-4">
            {tagFilter !== 'all' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtered by:</span>
                <Badge className={getTagColor(tagFilter)}>
                  {tagFilter}
                  <button 
                    onClick={() => setTagFilter('all')}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}
            {selectedClients.length > 0 && (
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{selectedClients.length} selected</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedClients([])}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                        data-testid="select-all-checkbox"
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Tags</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Company</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {search || tagFilter !== 'all' ? 'No clients found' : 'No clients yet. Add your first client!'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Checkbox 
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={(checked) => handleSelectClient(client.id, checked)}
                            aria-label={`Select ${client.name}`}
                            data-testid={`select-client-${client.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Link to={`/clients/${client.id}`} className="flex items-center gap-3 hover:opacity-80">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-medium text-sm">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium hover:text-primary">{client.name}</span>
                              {client.notes && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {client.notes}
                                </p>
                              )}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>{client.phone}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {client.tags?.length > 0 ? (
                              client.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} className={`text-xs ${getTagColor(tag)}`}>
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No tags</span>
                            )}
                            {client.tags?.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{client.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {client.company || '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`client-menu-${client.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <Link to={`/clients/${client.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem onSelect={() => handleEdit(client)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                Quick Tags
                              </div>
                              {AVAILABLE_TAGS.slice(0, 6).map((tag) => (
                                <DropdownMenuItem 
                                  key={tag.value}
                                  onSelect={() => handleQuickTagUpdate(client.id, tag.value)}
                                >
                                  <div className={`h-2 w-2 rounded-full mr-2 ${tag.color.split(' ')[0]}`} />
                                  {tag.value}
                                  {client.tags?.includes(tag.value) && (
                                    <span className="ml-auto text-primary">✓</span>
                                  )}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onSelect={() => handleDelete(client.id)}
                                className="text-destructive cursor-pointer"
                                data-testid={`delete-client-${client.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="confirm-delete-btn">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedClients.length} Clients</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedClients.length} clients? This action cannot be undone and will also delete all associated conversations, deals, and reminders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} data-testid="confirm-bulk-delete-btn">
              Delete {selectedClients.length} Clients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Funded Deal Campaign Dialog */}
      <Dialog open={fundedDialogOpen} onOpenChange={setFundedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">Enroll in Funded Campaign</DialogTitle>
            <DialogDescription>
              Would you like to put {fundedClient?.name} into a funded deal campaign to keep in touch?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm font-medium">Select deal type:</p>
            <div className="space-y-2">
              {[
                { id: 'funded_short', label: 'Short Term (8-12 weeks)', desc: '12 weekly check-ins with early renewal focus' },
                { id: 'funded_medium', label: 'Medium Term (12-24 weeks)', desc: '24 weekly messages, relationship-first to renewal' },
                { id: 'funded_long', label: 'Long Term (24-52 weeks)', desc: '52 weekly messages, gradual expansion discussions' }
              ].map((type) => (
                <div
                  key={type.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    fundedDealType === type.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/30'
                  }`}
                  onClick={() => setFundedDealType(type.id)}
                  data-testid={`funded-type-${type.id}`}
                >
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFundedDialogOpen(false); setFundedDealType(''); }}>
              Skip
            </Button>
            <Button
              disabled={!fundedDealType || fundedLaunching}
              onClick={async () => {
                setFundedLaunching(true);
                try {
                  await enhancedCampaignsApi.launchPrebuilt(fundedDealType, {
                    name: `${fundedClient?.name} - Funded Deal`,
                    tag: 'Funded'
                  });
                  toast.success('Client enrolled in funded deal campaign!');
                  setFundedDialogOpen(false);
                  setFundedDealType('');
                } catch (error) {
                  toast.error(error.response?.data?.detail || 'Failed to enroll in campaign');
                } finally {
                  setFundedLaunching(false);
                }
              }}
              data-testid="confirm-funded-campaign-btn"
            >
              {fundedLaunching ? 'Enrolling...' : 'Confirm Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Clients;
