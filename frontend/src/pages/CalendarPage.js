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
  AlertCircle,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { followupsApi, clientsApi } from '../lib/api';
import { toast } from 'sonner';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isBefore, startOfWeek, endOfWeek, addDays } from 'date-fns';

const REMINDER_TYPES = [
  { value: 'call', label: 'Call', icon: Phone, color: 'bg-blue-500' },
  { value: 'sms', label: 'SMS', icon: MessageSquare, color: 'bg-green-500' },
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-purple-500' },
  { value: 'reminder', label: 'Reminder', icon: Bell, color: 'bg-orange-500' }
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

  // Filter followups
  const filteredFollowups = followups.filter(f => {
    if (filterType === 'all') return true;
    if (filterType === 'pending') return f.status !== 'completed';
    if (filterType === 'completed') return f.status === 'completed';
    return f.reminder_type === filterType;
  });

  // Stats
  const overdueFollowups = filteredFollowups.filter(f => {
    try {
      const date = parseISO(f.scheduled_date);
      return isBefore(date, new Date()) && f.status !== 'completed';
    } catch { return false; }
  });

  const todayFollowups = getFollowupsForDate(new Date());
  
  const upcomingFollowups = filteredFollowups.filter(f => {
    try {
      const date = parseISO(f.scheduled_date);
      const now = new Date();
      const weekFromNow = addDays(now, 7);
      return date >= now && date <= weekFromNow && f.status !== 'completed';
    } catch { return false; }
  }).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  const completedCount = followups.filter(f => f.status === 'completed').length;
  const selectedDateFollowups = getFollowupsForDate(selectedDate);

  const getTypeInfo = (type) => REMINDER_TYPES.find(t => t.value === type) || REMINDER_TYPES[0];

  const FollowupItem = ({ followup, showDate = false }) => {
    const typeInfo = getTypeInfo(followup.reminder_type);
    const TypeIcon = typeInfo.icon;
    const isOverdue = isBefore(parseISO(followup.scheduled_date), new Date()) && followup.status !== 'completed';
    const isCompleted = followup.status === 'completed';
    
    return (
      <div className={`group flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${
        isCompleted ? 'bg-green-50/50 border-green-200' : 
        isOverdue ? 'bg-red-50/50 border-red-200' : 
        'bg-white dark:bg-zinc-800 border-border hover:border-primary/30'
      }`}>
        <div className={`h-10 w-10 rounded-xl ${typeInfo.color} flex items-center justify-center shrink-0`}>
          <TypeIcon className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {followup.title}
            </span>
            {isOverdue && <Badge variant="destructive" className="text-xs px-1.5 py-0">Overdue</Badge>}
            {isCompleted && <Badge className="bg-green-100 text-green-700 text-xs px-1.5 py-0">Done</Badge>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <User className="h-3 w-3" />
            <span className="truncate">{followup.client_name}</span>
            {showDate && (
              <>
                <span>•</span>
                <CalendarIcon className="h-3 w-3" />
                <span>{format(parseISO(followup.scheduled_date), 'MMM d')}</span>
              </>
            )}
            {followup.scheduled_time && (
              <>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>{followup.scheduled_time}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isCompleted && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => handleComplete(followup.id)}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(followup)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { setFollowupToDelete(followup); setDeleteDialogOpen(true); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
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
              <SelectTrigger className="w-32" data-testid="calendar-filter">
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
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
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
                    <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Payment follow-up call" required data-testid="followup-title-input" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {REMINDER_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <Button key={type.value} type="button" variant={formData.reminder_type === type.value ? "default" : "outline"} className="h-auto py-2 px-3 flex flex-col items-center gap-1" onClick={() => setFormData({ ...formData, reminder_type: type.value })}>
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
                      <Input id="date" type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} required data-testid="followup-date-input" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input id="time" type="time" value={formData.scheduled_time} onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })} data-testid="followup-time-input" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Notes</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Additional notes..." rows={3} data-testid="followup-notes-input" />
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" data-testid="save-followup-btn">{editingFollowup ? 'Update' : 'Schedule'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={overdueFollowups.length > 0 ? 'border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-zinc-900' : 'bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-zinc-900'}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-xl ${overdueFollowups.length > 0 ? 'bg-red-500' : 'bg-orange-500'} flex items-center justify-center`}>
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{overdueFollowups.length}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-zinc-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{todayFollowups.filter(f => f.status !== 'completed').length}</p>
                  <p className="text-sm text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-zinc-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{upcomingFollowups.length}</p>
                  <p className="text-sm text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-zinc-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{completedCount}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handlePrevMonth} data-testid="prev-month-btn">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-xl font-semibold min-w-[200px] text-center font-['Outfit']">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={handleNextMonth} data-testid="next-month-btn">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={handleToday} data-testid="today-btn">Today</Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Week headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dayFollowups = getFollowupsForDate(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isPast = isBefore(day, new Date()) && !isToday(day);
                  const hasOverdue = dayFollowups.some(f => f.status !== 'completed' && isPast);
                  const hasPending = dayFollowups.some(f => f.status !== 'completed');
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(day)}
                      className={`relative min-h-[90px] p-2 rounded-xl border-2 transition-all text-left ${
                        isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/30'
                      } ${!isCurrentMonth ? 'opacity-40' : ''} ${isToday(day) ? 'bg-blue-50/50' : ''} ${hasOverdue ? 'bg-red-50/30' : ''}`}
                      data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    >
                      <span className={`text-sm font-semibold ${isToday(day) ? 'h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center' : ''} ${isSelected && !isToday(day) ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      
                      {dayFollowups.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {dayFollowups.slice(0, 2).map((f, i) => {
                            const typeInfo = getTypeInfo(f.reminder_type);
                            return (
                              <div key={i} className={`text-xs px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 ${f.status === 'completed' ? 'bg-green-100 text-green-700 line-through' : `${typeInfo.color} text-white`}`}>
                                {f.title}
                              </div>
                            );
                          })}
                          {dayFollowups.length > 2 && (
                            <div className="text-xs text-muted-foreground px-1">+{dayFollowups.length - 2} more</div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Selected Day Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-['Outfit']">{format(selectedDate, 'EEEE, MMM d')}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)} data-testid="add-followup-day-btn">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : selectedDateFollowups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No follow-ups for this day</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateFollowups.map((followup) => (
                      <FollowupItem key={followup.id} followup={followup} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming */}
            {upcomingFollowups.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-['Outfit']">Upcoming</CardTitle>
                  <CardDescription>Next 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px] pr-3">
                    <div className="space-y-2">
                      {upcomingFollowups.slice(0, 6).map((followup) => (
                        <FollowupItem key={followup.id} followup={followup} showDate />
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="confirm-delete-followup">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CalendarPage;
