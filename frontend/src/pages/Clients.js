import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
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
  Calendar
} from 'lucide-react';
import { clientsApi } from '../lib/api';
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
  { value: "Funded", color: "bg-green-100 text-green-800 font-semibold" },
  { value: "Lost Deal", color: "bg-red-100 text-red-700" },
];

const getTagColor = (tag) => {
  const found = AVAILABLE_TAGS.find(t => t.value === tag);
  return found ? found.color : "bg-gray-100 text-gray-700";
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    balance: 0,
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
    } catch (error) {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await clientsApi.update(editingClient.id, formData);
        toast.success('Client updated successfully');
      } else {
        await clientsApi.create(formData);
        toast.success('Client created successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
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
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await clientsApi.delete(id);
      toast.success('Client deleted');
      fetchClients();
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const handleQuickTagUpdate = async (clientId, newTag) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    let updatedTags;
    if (client.tags?.includes(newTag)) {
      updatedTags = client.tags.filter(t => t !== newTag);
    } else {
      updatedTags = [...(client.tags || []), newTag];
    }
    
    try {
      await clientsApi.update(clientId, { tags: updatedTags });
      toast.success('Tag updated');
      fetchClients();
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

  // Count clients by tag for filter badges
  const tagCounts = AVAILABLE_TAGS.reduce((acc, tag) => {
    acc[tag.value] = clients.filter(c => c.tags?.includes(tag.value)).length;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="clients-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your customer database with tags</p>
          </div>
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
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="pl-10"
                      required
                      data-testid="client-phone-input"
                    />
                  </div>
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
                    <Label htmlFor="balance">Balance Owed</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="balance"
                        type="number"
                        step="0.01"
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="pl-10"
                        data-testid="client-balance-input"
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

          {/* Active filter indicator */}
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
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Tags</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Company</TableHead>
                    <TableHead className="font-semibold text-right">Balance</TableHead>
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
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-medium text-sm">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">{client.name}</span>
                              {client.notes && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {client.notes}
                                </p>
                              )}
                            </div>
                          </div>
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
                        <TableCell className="text-right font-medium">
                          <span className={client.balance > 0 ? 'text-orange-600' : 'text-green-600'}>
                            ${client.balance.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`client-menu-${client.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEdit(client)}>
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
                                  onClick={() => handleQuickTagUpdate(client.id, tag.value)}
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
                                onClick={() => handleDelete(client.id)}
                                className="text-destructive"
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
    </DashboardLayout>
  );
};

export default Clients;
