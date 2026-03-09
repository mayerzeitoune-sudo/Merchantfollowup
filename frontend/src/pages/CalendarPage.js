import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  Phone,
  MessageSquare,
  Clock,
  CheckCircle,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { followupsApi, clientsApi } from '../lib/api';
import { toast } from 'sonner';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const CalendarPage = () => {
  const [followups, setFollowups] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      setFollowups(followupsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await followupsApi.create(formData);
      toast.success('Follow-up scheduled');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create follow-up');
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this follow-up?')) return;
    try {
      await followupsApi.delete(id);
      toast.success('Follow-up deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete follow-up');
    }
  };

  const resetForm = () => {
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
      const followupDate = parseISO(f.scheduled_date);
      return isSameDay(followupDate, date);
    });
  };

  const selectedDateFollowups = getFollowupsForDate(selectedDate);

  // Get days with followups for calendar highlighting
  const daysWithFollowups = followups.map(f => parseISO(f.scheduled_date));

  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({ ...prev, scheduled_date: format(date, 'yyyy-MM-dd') }));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="calendar-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Calendar</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage follow-ups</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" data-testid="add-followup-btn">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Follow-up
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-['Outfit']">Schedule Follow-up</DialogTitle>
                <DialogDescription>
                  Create a new follow-up reminder
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
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Payment follow-up call"
                    required
                    data-testid="followup-title-input"
                  />
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
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.reminder_type}
                    onValueChange={(value) => setFormData({ ...formData, reminder_type: value })}
                  >
                    <SelectTrigger data-testid="followup-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Notes</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                    data-testid="followup-notes-input"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" data-testid="save-followup-btn">
                    Schedule
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="w-full"
                modifiers={{
                  hasFollowup: daysWithFollowups
                }}
                modifiersStyles={{
                  hasFollowup: { 
                    backgroundColor: 'hsl(24 95% 53% / 0.1)',
                    fontWeight: '600',
                    color: 'hsl(24 95% 53%)'
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Selected Day's Follow-ups */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-['Outfit'] text-lg">
                {format(selectedDate, 'EEEE, MMMM d')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : selectedDateFollowups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No follow-ups scheduled</p>
                  <Button 
                    variant="link" 
                    className="mt-2 text-primary"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    Schedule one
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateFollowups.map((followup) => (
                    <div 
                      key={followup.id}
                      className={`p-3 rounded-lg border ${
                        followup.status === 'completed' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-secondary/50 border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {followup.reminder_type === 'call' && <Phone className="h-3 w-3 text-muted-foreground" />}
                            {followup.reminder_type === 'sms' && <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                            <span className="text-xs text-muted-foreground">
                              {followup.scheduled_time}
                            </span>
                            {followup.status === 'completed' && (
                              <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                Done
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm">{followup.title}</p>
                          <p className="text-xs text-muted-foreground">{followup.client_name}</p>
                        </div>
                        <div className="flex gap-1">
                          {followup.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              onClick={() => handleComplete(followup.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(followup.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {followup.description && (
                        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                          {followup.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CalendarPage;
