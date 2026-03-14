import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  Phone,
  MessageSquare,
  Mail,
  Clock,
  CheckCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  Bell,
  Filter,
  List,
  LayoutGrid,
  AlertCircle,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { followupsApi, clientsApi } from '../lib/api';
import { toast } from 'sonner';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isBefore, startOfWeek, endOfWeek, addDays } from 'date-fns';

const REMINDER_TYPES = [
  { value: 'call', label: 'Phone Call', icon: Phone, color: 'bg-blue-100 text-blue-700' },
  { value: 'sms', label: 'SMS', icon: MessageSquare, color: 'bg-green-100 text-green-700' },
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-purple-100 text-purple-700' },
  { value: 'reminder', label: 'Reminder', icon: Bell, color: 'bg-orange-100 text-orange-700' }
];

const CalendarPage = () => {
  const [followups, setFollowups] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [followupToDelete, setFollowupToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // month, week, list
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    description: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '09:00',
    reminder_type: 'call'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [followupsRes, clientsRes] = await Promise.all([
        followupsApi.getAll(),
        clientsApi.getAll()
      ]);
      setFollowups(followupsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFollowup) {
        await followupsApi.update(editingFollowup.id, formData);
        toast.success('Follow-up updated');
      } else {
        await followupsApi.create(formData);
        toast.success('Follow-up scheduled');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save follow-up');
    }
  };

  const handleComplete = async (id) => {
    try {
      await followupsApi.update(id, { status: 'completed' });
      toast.success('Marked as complete');
      fetchData();
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
  };

  const handleDelete = async () => {
    if (!followupToDelete) return;
    try {
      await followupsApi.delete(followupToDelete.id);
      toast.success('Follow-up deleted');
      setDeleteDialogOpen(false);
      setFollowupToDelete(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete follow-up');
    }
  };

  const handleEdit = (followup) => {
    setEditingFollowup(followup);
    setFormData({
      client_id: followup.client_id,
      title: followup.title,
      description: followup.description || '',
      scheduled_date: followup.scheduled_date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
      scheduled_time: followup.scheduled_time || '09:00',
      reminder_type: followup.reminder_type || 'call'
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingFollowup(null);
    setFormData({
      client_id: '',
      title: '',
      description: '',
      scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
      scheduled_time: '09:00',
      reminder_type: 'call'
    });
  };

  const getFollowupsForDate = (date) => {
    return followups.filter(f => {
      try {
        const followupDate = parseISO(f.scheduled_date);
        return isSameDay(followupDate, date);
      } catch {
        return false;
      }
    });
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setFormData(prev => ({ ...prev, scheduled_date: format(date, 'yyyy-MM-dd') }));
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get week days for week view
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter followups
  const filteredFollowups = followups.filter(f => {
    if (filterType === 'all') return true;
    if (filterType === 'pending') return f.status !== 'completed';
    if (filterType === 'completed') return f.status === 'completed';
    return f.reminder_type === filterType;
  });

  // Upcoming followups (next 7 days)
  const upcomingFollowups = filteredFollowups.filter(f => {
    try {
      const date = parseISO(f.scheduled_date);
      const now = new Date();
      const weekFromNow = addDays(now, 7);
      return date >= now && date <= weekFromNow && f.status !== 'completed';
    } catch {
      return false;
    }
  }).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  // Overdue followups
  const overdueFollowups = filteredFollowups.filter(f => {
    try {
      const date = parseISO(f.scheduled_date);
      return isBefore(date, new Date()) && f.status !== 'completed';
    } catch {
      return false;
    }
  });

  const selectedDateFollowups = getFollowupsForDate(selectedDate);

  const getTypeInfo = (type) => REMINDER_TYPES.find(t => t.value === type) || REMINDER_TYPES[0];

  const FollowupCard = ({ followup, compact = false }) => {
    const typeInfo = getTypeInfo(followup.reminder_type);
    const TypeIcon = typeInfo.icon;
    const isOverdue = isBefore(parseISO(followup.scheduled_date), new Date()) && followup.status !== 'completed';
    
    return (
      <div className={`p-3 rounded-lg border ${
        followup.status === 'completed' 
          ? 'bg-green-50/50 border-green-200' 
          : isOverdue
            ? 'bg-red-50/50 border-red-200'
            : 'bg-white border-border hover:border-primary/50'
      } transition-colors`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`h-8 w-8 rounded-lg ${typeInfo.color} flex items-center justify-center shrink-0`}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{followup.title}</span>
                {followup.status === 'completed' && (
                  <Badge className="bg-green-100 text-green-700 text-xs">Done</Badge>
                )}
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{followup.client_name}</p>
              {!compact && (
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {format(parseISO(followup.scheduled_date), 'MMM d, yyyy')}
                  </span>
                  {followup.scheduled_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {followup.scheduled_time}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {followup.status !== 'completed' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleComplete(followup.id)}
                title="Mark as complete"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleEdit(followup)}
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                setFollowupToDelete(followup);
                setDeleteDialogOpen(true);
              }}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!compact && followup.description && (
          <p className="text-xs text-muted-foreground mt-2 border-t pt-2 line-clamp-2">
            {followup.description}
          </p>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="calendar-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Calendar</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage your follow-ups</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="call">Calls</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90" data-testid="add-followup-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  New Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-['Outfit']">
                    {editingFollowup ? 'Edit Follow-up' : 'Schedule Follow-up'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingFollowup ? 'Update the follow-up details' : 'Create a new follow-up reminder'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    >
                      <SelectTrigger data-testid="followup-client-select">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-48">
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {client.name}
                              </div>
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Payment follow-up call"
                      required
                      data-testid="followup-title-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {REMINDER_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <Button
                            key={type.value}
                            type="button"
                            variant={formData.reminder_type === type.value ? "default" : "outline"}
                            className="h-auto py-2 px-3 flex flex-col items-center gap-1"
                            onClick={() => setFormData({ ...formData, reminder_type: type.value })}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-xs">{type.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                        required
                        data-testid="followup-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.scheduled_time}
                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                        data-testid="followup-time-input"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Notes</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                      data-testid="followup-notes-input"
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="save-followup-btn">
                      {editingFollowup ? 'Update' : 'Schedule'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={overdueFollowups.length > 0 ? 'border-red-200 bg-red-50/50' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${overdueFollowups.length > 0 ? 'bg-red-100' : 'bg-orange-100'} flex items-center justify-center`}>
                  <AlertCircle className={`h-5 w-5 ${overdueFollowups.length > 0 ? 'text-red-600' : 'text-orange-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueFollowups.length}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{selectedDateFollowups.length}</p>
                  <p className="text-sm text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingFollowups.length}</p>
                  <p className="text-sm text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{followups.filter(f => f.status === 'completed').length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold min-w-[180px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dayFollowups = getFollowupsForDate(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isPast = isBefore(day, new Date()) && !isToday(day);
                  const hasOverdue = dayFollowups.some(f => f.status !== 'completed' && isPast);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(day)}
                      className={`
                        relative h-20 p-1 rounded-lg border transition-all text-left
                        ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-transparent hover:border-muted-foreground/20'}
                        ${!isCurrentMonth ? 'opacity-40' : ''}
                        ${isToday(day) ? 'bg-primary/5' : ''}
                        ${hasOverdue ? 'bg-red-50' : ''}
                      `}
                    >
                      <span className={`
                        text-sm font-medium
                        ${isToday(day) ? 'text-primary' : ''}
                        ${isSelected ? 'text-primary' : ''}
                      `}>
                        {format(day, 'd')}
                      </span>
                      
                      {dayFollowups.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {dayFollowups.slice(0, 2).map((f, i) => {
                            const typeInfo = getTypeInfo(f.reminder_type);
                            return (
                              <div 
                                key={i}
                                className={`text-xs px-1 py-0.5 rounded truncate ${
                                  f.status === 'completed' 
                                    ? 'bg-green-100 text-green-700 line-through' 
                                    : typeInfo.color
                                }`}
                              >
                                {f.title}
                              </div>
                            );
                          })}
                          {dayFollowups.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayFollowups.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected Day */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{format(selectedDate, 'EEEE, MMMM d')}</span>
                  <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-4">Loading...</p>
                ) : selectedDateFollowups.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No follow-ups scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateFollowups.map((followup) => (
                      <FollowupCard key={followup.id} followup={followup} compact />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming */}
            {upcomingFollowups.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Upcoming</CardTitle>
                  <CardDescription>Next 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-3">
                      {upcomingFollowups.slice(0, 5).map((followup) => (
                        <FollowupCard key={followup.id} followup={followup} compact />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Follow-up</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{followupToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CalendarPage;
