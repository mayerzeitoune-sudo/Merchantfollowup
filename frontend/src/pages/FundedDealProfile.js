import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import { Textarea } from '../components/ui/textarea';
import { 
  ArrowLeft,
  DollarSign, 
  Calendar,
  User,
  Building,
  FileText,
  MessageSquare,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Edit,
  Award,
  TrendingUp,
  Phone
} from 'lucide-react';
import { fundedApi, contactsApi, templatesApi } from '../lib/api';
import { toast } from 'sonner';

const getStatusColor = (status) => {
  const colors = {
    pending: "bg-gray-100 text-gray-700",
    cleared: "bg-green-100 text-green-700",
    missed: "bg-red-100 text-red-700",
    late: "bg-orange-100 text-orange-700",
    severely_late: "bg-red-200 text-red-800",
    overridden: "bg-purple-100 text-purple-700",
    due_today: "bg-yellow-100 text-yellow-700",
    current: "bg-green-100 text-green-700",
    paid_off: "bg-emerald-100 text-emerald-700"
  };
  return colors[status] || "bg-gray-100 text-gray-700";
};

const FundedDealProfile = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState([]);
  
  // Edit Deal Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    funded_amount: 0,
    total_payback: 0,
    payment_amount: 0,
    payment_frequency: 'daily',
    deal_type: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDeal();
    fetchTemplates();
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const response = await fundedApi.getOne(dealId);
      setDeal(response.data);
    } catch (error) {
      toast.error('Failed to load deal');
      navigate('/funded');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await templatesApi.getAll();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch templates');
    }
  };

  const handlePaymentUpdate = async (paymentNumber, updates) => {
    try {
      const response = await fundedApi.updatePayment(dealId, paymentNumber, updates);
      toast.success('Payment updated');
      
      if (response.data.milestone_50_reached) {
        toast.success('🎉 50% Milestone Reached!', { 
          description: 'This client has paid half of their balance!'
        });
      }
      
      fetchDeal();
    } catch (error) {
      toast.error('Failed to update payment');
    }
  };

  // Open edit dialog with current deal data
  const handleEditDeal = () => {
    setEditFormData({
      funded_amount: deal.funded_amount || 0,
      total_payback: deal.total_payback || 0,
      payment_amount: deal.payment_amount || 0,
      payment_frequency: deal.payment_frequency || 'daily',
      deal_type: deal.deal_type || '',
      notes: deal.notes || ''
    });
    setEditDialogOpen(true);
  };

  // Save edited deal
  const handleSaveDeal = async () => {
    setSaving(true);
    try {
      await fundedApi.update(dealId, editFormData);
      toast.success('Deal updated successfully');
      setEditDialogOpen(false);
      fetchDeal();
    } catch (error) {
      toast.error('Failed to update deal');
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !deal?.client_id) return;
    
    setSending(true);
    try {
      await contactsApi.sendSms(deal.client_id, message);
      toast.success('Message sent!');
      setMessage('');
      fetchDeal();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendReminder = async (type) => {
    const reminderTemplates = {
      '3_days_before': `Hi ${deal?.client_name}, this is a reminder that your payment of $${deal?.payment_amount?.toLocaleString()} is due soon. Let us know if you need anything.`,
      '1_day_before': `Hi ${deal?.client_name}, just a quick reminder that your payment of $${deal?.payment_amount?.toLocaleString()} is due tomorrow.`,
      'due_today': `Hi ${deal?.client_name}, your payment of $${deal?.payment_amount?.toLocaleString()} is due today. Thank you.`,
      '1_day_late': `Hi ${deal?.client_name}, it looks like your payment is still outstanding. Please submit payment when possible.`,
      '3_days_late': `Hi ${deal?.client_name}, this is a reminder that your payment is overdue. Please make payment as soon as possible.`,
      '7_days_late': `Hi ${deal?.client_name}, your payment is still outstanding. Please complete payment as soon as possible.`
    };
    
    const msg = reminderTemplates[type] || reminderTemplates['due_today'];
    
    setSending(true);
    try {
      await contactsApi.sendSms(deal.client_id, msg);
      toast.success('Reminder sent!');
      fetchDeal();
    } catch (error) {
      toast.error('Failed to send reminder');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading deal...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!deal) return null;

  const percentPaid = deal.percent_paid || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="funded-deal-profile">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/funded">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-['Outfit']">{deal.client_name}</h1>
              {percentPaid >= 50 && (
                <Badge className="bg-yellow-100 text-yellow-700">
                  <Award className="h-3 w-3 mr-1" />
                  50% Paid
                </Badge>
              )}
              <Badge className={getStatusColor(deal.payment_status)}>
                {deal.payment_status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{deal.business_name}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/clients/${deal.client_id}`}>
              <Button variant="outline">View Client</Button>
            </Link>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Deal
            </Button>
          </div>
        </div>

        {/* Deal Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Funded Amount</p>
              <p className="text-xl font-bold text-green-600">${deal.funded_amount?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Total Payback</p>
              <p className="text-xl font-bold">${deal.total_payback?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Collected</p>
              <p className="text-xl font-bold text-emerald-600">${deal.total_collected?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p className="text-xl font-bold text-orange-600">${deal.remaining_balance?.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Payments Made</p>
              <p className="text-xl font-bold">{deal.payments_cleared} / {deal.total_payments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Percent Paid</p>
              <p className="text-xl font-bold">{percentPaid}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Payment Progress</span>
              <span className="text-sm text-muted-foreground">{percentPaid}% Complete</span>
            </div>
            <Progress value={percentPaid} className="h-3" />
            {percentPaid >= 50 && (
              <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                <Award className="h-4 w-4" />
                50% milestone reached - consider renewal or upsell opportunity
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payments">
              <DollarSign className="h-4 w-4 mr-2" />
              Payment Schedule
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="reminders">
              <Bell className="h-4 w-4 mr-2" />
              Payment Reminders
            </TabsTrigger>
            <TabsTrigger value="details">
              <FileText className="h-4 w-4 mr-2" />
              Deal Details
            </TabsTrigger>
          </TabsList>

          {/* Payment Schedule Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Payment Schedule</CardTitle>
                <CardDescription>
                  Payments are auto-cleared by default after due date. Use checkboxes to override.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">#</th>
                        <th className="text-left p-3 font-medium">Due Date</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium">Cleared</th>
                        <th className="text-center p-3 font-medium">Missed</th>
                        <th className="text-left p-3 font-medium">Paid Date</th>
                        <th className="text-left p-3 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deal.payment_schedule?.map((payment) => (
                        <tr key={payment.payment_number} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{payment.payment_number}</td>
                          <td className="p-3">{new Date(payment.due_date).toLocaleDateString()}</td>
                          <td className="p-3 text-right font-medium">${payment.expected_amount?.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <Badge className={getStatusColor(payment.status || 'pending')}>
                              {payment.status || 'pending'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={payment.cleared}
                              onCheckedChange={(checked) => handlePaymentUpdate(payment.payment_number, { cleared: checked })}
                              data-testid={`payment-cleared-${payment.payment_number}`}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={payment.missed}
                              onCheckedChange={(checked) => handlePaymentUpdate(payment.payment_number, { missed: checked })}
                              data-testid={`payment-missed-${payment.payment_number}`}
                            />
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-3">
                            <Input
                              value={payment.notes || ''}
                              onChange={(e) => handlePaymentUpdate(payment.payment_number, { notes: e.target.value })}
                              placeholder="Add note..."
                              className="h-8 text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Messages</CardTitle>
                <CardDescription>Communication history with this client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      rows={2}
                    />
                    <Button onClick={handleSendMessage} disabled={sending || !message.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>

                  {/* Quick Templates */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Quick templates:</span>
                    {templates.slice(0, 3).map(t => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        onClick={() => setMessage(t.content)}
                      >
                        {t.name}
                      </Button>
                    ))}
                  </div>

                  {/* Conversation History */}
                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    {deal.conversations?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deal.conversations?.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                msg.direction === 'outbound'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${
                                msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {new Date(msg.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Reminders Tab */}
          <TabsContent value="reminders">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Payment Reminders</CardTitle>
                <CardDescription>Send automated reminders based on payment schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="pt-4">
                        <h4 className="font-medium text-blue-800 mb-2">3 Days Before Due</h4>
                        <p className="text-xs text-blue-600 mb-3">Friendly reminder about upcoming payment</p>
                        <Button size="sm" variant="outline" onClick={() => handleSendReminder('3_days_before')} disabled={sending}>
                          Send Reminder
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardContent className="pt-4">
                        <h4 className="font-medium text-yellow-800 mb-2">1 Day Before Due</h4>
                        <p className="text-xs text-yellow-600 mb-3">Payment due tomorrow reminder</p>
                        <Button size="sm" variant="outline" onClick={() => handleSendReminder('1_day_before')} disabled={sending}>
                          Send Reminder
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-orange-200 bg-orange-50">
                      <CardContent className="pt-4">
                        <h4 className="font-medium text-orange-800 mb-2">Due Today</h4>
                        <p className="text-xs text-orange-600 mb-3">Payment is due today</p>
                        <Button size="sm" variant="outline" onClick={() => handleSendReminder('due_today')} disabled={sending}>
                          Send Reminder
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="pt-4">
                        <h4 className="font-medium text-red-800 mb-2">1 Day Late</h4>
                        <p className="text-xs text-red-600 mb-3">Payment is now overdue</p>
                        <Button size="sm" variant="outline" onClick={() => handleSendReminder('1_day_late')} disabled={sending}>
                          Send Reminder
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-300 bg-red-100">
                      <CardContent className="pt-4">
                        <h4 className="font-medium text-red-800 mb-2">3 Days Late</h4>
                        <p className="text-xs text-red-600 mb-3">Overdue payment reminder</p>
                        <Button size="sm" variant="outline" onClick={() => handleSendReminder('3_days_late')} disabled={sending}>
                          Send Reminder
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-red-400 bg-red-200">
                      <CardContent className="pt-4">
                        <h4 className="font-medium text-red-900 mb-2">7 Days Late</h4>
                        <p className="text-xs text-red-700 mb-3">Urgent payment reminder</p>
                        <Button size="sm" variant="outline" onClick={() => handleSendReminder('7_days_late')} disabled={sending}>
                          Send Reminder
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Reminder Log */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Reminder Activity Log</h4>
                    {deal.reminder_logs?.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No reminders sent yet</p>
                    ) : (
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {deal.reminder_logs?.map((log, i) => (
                            <div key={i} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{log.type}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.sent_at).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deal Details Tab */}
          <TabsContent value="details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit']">Deal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Deal Type</Label>
                      <p className="font-medium">{deal.deal_type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Funding Date</Label>
                      <p className="font-medium">{new Date(deal.funding_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Start Date</Label>
                      <p className="font-medium">{new Date(deal.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Maturity Date</Label>
                      <p className="font-medium">{new Date(deal.maturity_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Payment Frequency</Label>
                      <p className="font-medium capitalize">{deal.payment_frequency}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Payment Amount</Label>
                      <p className="font-medium">${deal.payment_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Assigned Rep</Label>
                      <p className="font-medium">{deal.assigned_rep_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Status</Label>
                      <Badge className={getStatusColor(deal.status)}>{deal.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit']">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{deal.client_name}</p>
                      <p className="text-sm text-muted-foreground">{deal.business_name}</p>
                    </div>
                  </div>
                  
                  {deal.notes && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Notes</Label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{deal.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default FundedDealProfile;
