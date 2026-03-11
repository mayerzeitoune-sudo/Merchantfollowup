import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  CalendarDays,
  MessageSquare
} from 'lucide-react';
import { remindersApi, clientsApi } from '../lib/api';
import { toast } from 'sonner';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    amount_due: '',
    start_date: '',
    end_date: '',
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    message: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate total reminders based on form data
  const calculatedReminders = useMemo(() => {
    if (!formData.start_date || !formData.end_date || formData.days_of_week.length === 0) {
      return 0;
    }

    const dayMap = {
      monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
      friday: 4, saturday: 5, sunday: 6
    };

    const selectedDays = formData.days_of_week.map(d => dayMap[d.toLowerCase()]);
    
    try {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      
      if (end < start) return 0;
      
      let count = 0;
      const current = new Date(start);
      while (current <= end) {
        if (selectedDays.includes(current.getDay() === 0 ? 6 : current.getDay() - 1)) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return count;
    } catch {
      return 0;
    }
  }, [formData.start_date, formData.end_date, formData.days_of_week]);

  const fetchData = async () => {
    try {
      const [remindersRes, clientsRes] = await Promise.all([
        remindersApi.getAll(),
        clientsApi.getAll()
      ]);
      setReminders(remindersRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.days_of_week.length === 0) {
      toast.error('Please select at least one day');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        amount_due: parseFloat(formData.amount_due)
      };
      
      if (editingReminder) {
        await remindersApi.update(editingReminder.id, payload);
        toast.success('Reminder updated');
      } else {
        await remindersApi.create(payload);
        toast.success(`Reminder schedule created with ${calculatedReminders} reminders`);
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      client_id: reminder.client_id,
      amount_due: reminder.amount_due.toString(),
      start_date: reminder.start_date || '',
      end_date: reminder.end_date || '',
      days_of_week: reminder.days_of_week || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      message: reminder.message || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder schedule?')) return;
    try {
      await remindersApi.delete(id);
      toast.success('Reminder deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete reminder');
    }
  };

  const handleSend = async (id) => {
    try {
      await remindersApi.send(id);
      toast.success('Reminder sent successfully!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reminder');
    }
  };

  const resetForm = () => {
    setEditingReminder(null);
    setFormData({ 
      client_id: '', 
      amount_due: '', 
      start_date: '', 
      end_date: '',
      days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      message: '' 
    });
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'active':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50"><Clock className="h-3 w-3 mr-1" />Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = reminder.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      reminder.amount_due.toString().includes(search);
    const matchesStatus = statusFilter === 'all' || reminder.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDateRange = (start, end) => {
    if (!start || !end) return '-';
    return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
  };

  const formatDays = (days) => {
    if (!days || days.length === 0) return '-';
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) return 'Weekdays';
    return days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="reminders-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Payment Reminders</h1>
            <p className="text-muted-foreground mt-1">Schedule recurring payment reminders</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" data-testid="add-reminder-btn">
                <Plus className="h-4 w-4 mr-2" />
                New Reminder Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-['Outfit']">
                  {editingReminder ? 'Edit Reminder Schedule' : 'Create Reminder Schedule'}
                </DialogTitle>
                <DialogDescription>
                  {editingReminder ? 'Update reminder details' : 'Set up recurring payment reminders'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger data-testid="reminder-client-select">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount Due *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount_due}
                      onChange={(e) => setFormData({ ...formData, amount_due: e.target.value })}
                      placeholder="0.00"
                      className="pl-10"
                      required
                      data-testid="reminder-amount-input"
                    />
                  </div>
                </div>
                
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="pl-10"
                        required
                        data-testid="reminder-start-date-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="pl-10"
                        required
                        data-testid="reminder-end-date-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Days of Week */}
                <div className="space-y-3">
                  <Label>Send Reminders On *</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <div
                        key={day.id}
                        className={`
                          flex items-center justify-center w-12 h-10 rounded-md border cursor-pointer transition-all
                          ${formData.days_of_week.includes(day.id) 
                            ? 'bg-primary text-white border-primary' 
                            : 'bg-white text-muted-foreground border-input hover:border-primary'
                          }
                        `}
                        onClick={() => toggleDay(day.id)}
                        data-testid={`day-${day.id}`}
                      >
                        <span className="text-sm font-medium">{day.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click to toggle days when reminders will be sent
                  </p>
                </div>

                {/* Calculated Reminders Preview */}
                {(formData.start_date && formData.end_date && formData.days_of_week.length > 0) && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary font-['Outfit']">
                          {calculatedReminders}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          reminders will be sent
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="message">Custom Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Hi {name}, this is a reminder about your payment of ${amount}..."
                    rows={3}
                    data-testid="reminder-message-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{name}'}, {'{amount}'} as placeholders
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-primary hover:bg-primary/90" 
                    disabled={formData.days_of_week.length === 0}
                    data-testid="save-reminder-btn"
                  >
                    {editingReminder ? 'Update' : 'Create Schedule'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reminders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="search-reminders-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="status-filter-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Date Range</TableHead>
                    <TableHead className="font-semibold">Days</TableHead>
                    <TableHead className="font-semibold text-center">Reminders</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredReminders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {search || statusFilter !== 'all' ? 'No reminders found' : 'No reminder schedules yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReminders.map((reminder) => (
                      <TableRow key={reminder.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{reminder.client_name}</p>
                            <p className="text-sm text-muted-foreground">{reminder.client_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          ${reminder.amount_due.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateRange(reminder.start_date, reminder.end_date)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDays(reminder.days_of_week)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold">{reminder.sent_count || 0}/{reminder.total_reminders || 0}</span>
                            <span className="text-xs text-muted-foreground">sent</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(reminder.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {reminder.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSend(reminder.id)}
                                className="text-primary hover:text-primary"
                                data-testid={`send-reminder-${reminder.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleEdit(reminder)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onSelect={() => handleDelete(reminder.id)}
                                  className="text-destructive cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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

export default Reminders;
