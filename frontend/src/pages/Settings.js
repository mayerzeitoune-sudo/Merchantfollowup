import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, 
  Settings as SettingsIcon,
  User,
  Phone,
  Trash2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Mail,
  Link,
  Unlink,
  Hash,
  Shield,
  Wifi,
  WifiOff,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { smsProvidersApi, gmailApi, phoneNumbersApi, platformApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const smsProviders = [
  { id: 'twilio', name: 'Twilio', color: 'bg-red-500', url: 'https://www.twilio.com/console' },
  { id: 'telnyx', name: 'Telnyx', color: 'bg-green-500', url: 'https://portal.telnyx.com' },
  { id: 'vonage', name: 'Vonage (Nexmo)', color: 'bg-purple-500', url: 'https://dashboard.nexmo.com' },
  { id: 'plivo', name: 'Plivo', color: 'bg-blue-500', url: 'https://console.plivo.com' },
  { id: 'bandwidth', name: 'Bandwidth', color: 'bg-orange-500', url: 'https://dashboard.bandwidth.com' },
];

const Settings = () => {
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [gmailStatus, setGmailStatus] = useState({ connected: false, email: null });
  const [gmailLoading, setGmailLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [formData, setFormData] = useState({
    provider: '',
    account_sid: '',
    auth_token: '',
    api_key: '',
    api_secret: '',
    from_number: '',
    is_active: false
  });
  const [repMonthlyLimit, setRepMonthlyLimit] = useState(0);
  const [phoneSettingsLoading, setPhoneSettingsLoading] = useState(false);
  const [platformStatus, setPlatformStatus] = useState(null);
  const [ownedNumbers, setOwnedNumbers] = useState([]);
  const [selectedDeleteNumber, setSelectedDeleteNumber] = useState('');
  const [deleteRequestSent, setDeleteRequestSent] = useState(false);
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioMs, setTwilioMs] = useState('');
  const [twilioSaving, setTwilioSaving] = useState(false);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSaving, setStripeSaving] = useState(false);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'org_admin';

  useEffect(() => {
    fetchProviders();
    fetchGmailStatus();
    fetchPlatformStatus();
    if (isAdmin) {
      fetchPhoneSettings();
    }
    
    // Check for Gmail callback params
    if (searchParams.get('gmail_connected') === 'true') {
      toast.success('Gmail connected successfully!');
      fetchGmailStatus();
    } else if (searchParams.get('gmail_error')) {
      toast.error(`Gmail connection failed: ${searchParams.get('gmail_error')}`);
    }
  }, [searchParams, isAdmin]);

  const fetchPlatformStatus = async () => {
    try {
      const res = await platformApi.getStatus();
      setPlatformStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch platform status:', error);
    }
  };

  const handleSaveTwilioCreds = async () => {
    if (!twilioSid.trim() || !twilioToken.trim()) {
      toast.error('Account SID and Auth Token are required');
      return;
    }
    setTwilioSaving(true);
    try {
      await platformApi.setTwilioConfig({
        account_sid: twilioSid.trim(),
        auth_token: twilioToken.trim(),
        messaging_service_sid: twilioMs.trim(),
      });
      toast.success('Twilio credentials saved and verified!');
      setTwilioSid('');
      setTwilioToken('');
      setTwilioMs('');
      fetchPlatformStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save Twilio credentials');
    } finally {
      setTwilioSaving(false);
    }
  };

  const handleSaveStripeCreds = async () => {
    if (!stripeSecretKey.trim()) {
      toast.error('Stripe Secret Key is required');
      return;
    }
    setStripeSaving(true);
    try {
      await platformApi.setStripeConfig({
        secret_key: stripeSecretKey.trim(),
        publishable_key: stripePublishableKey.trim(),
      });
      toast.success('Stripe credentials saved and verified!');
      setStripeSecretKey('');
      setStripePublishableKey('');
      fetchPlatformStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save Stripe credentials');
    } finally {
      setStripeSaving(false);
    }
  };

  const fetchPhoneSettings = async () => {
    try {
      const response = await phoneNumbersApi.getSettings();
      setRepMonthlyLimit(response.data.rep_monthly_number_limit || 0);
      // Also fetch owned numbers for deletion request
      const numbersRes = await phoneNumbersApi.getOwned();
      setOwnedNumbers(numbersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch phone settings:', error);
    }
  };

  const handleSavePhoneSettings = async () => {
    setPhoneSettingsLoading(true);
    try {
      await phoneNumbersApi.updateSettings({ rep_monthly_number_limit: repMonthlyLimit });
      toast.success('Phone number settings saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setPhoneSettingsLoading(false);
    }
  };

  const fetchGmailStatus = async () => {
    if (!token) return;
    try {
      const response = await gmailApi.getStatus(token);
      setGmailStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Gmail status:', error);
    } finally {
      setGmailLoading(false);
    }
  };

  const handleGmailConnect = () => {
    if (!token) {
      toast.error('Please log in first');
      return;
    }
    window.location.href = gmailApi.getAuthUrl(token);
  };

  const handleGmailDisconnect = async () => {
    try {
      await gmailApi.disconnect(token);
      setGmailStatus({ connected: false, email: null });
      toast.success('Gmail disconnected');
    } catch (error) {
      toast.error('Failed to disconnect Gmail');
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm.to || !emailForm.subject || !emailForm.body) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setSendingEmail(true);
    try {
      await gmailApi.sendEmail(token, {
        to: emailForm.to,
        subject: emailForm.subject,
        body: emailForm.body,
        html: false
      });
      toast.success('Email sent successfully!');
      setComposeOpen(false);
      setEmailForm({ to: '', subject: '', body: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await smsProvidersApi.getAll();
      setProviders(response.data);
    } catch (error) {
      toast.error('Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await smsProvidersApi.create(formData);
      toast.success('SMS provider added successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchProviders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add provider');
    }
  };

  const handleActivate = async (id) => {
    try {
      await smsProvidersApi.activate(id);
      toast.success('Provider activated');
      fetchProviders();
    } catch (error) {
      toast.error('Failed to activate provider');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this SMS provider configuration?')) return;
    try {
      await smsProvidersApi.delete(id);
      toast.success('Provider deleted');
      fetchProviders();
    } catch (error) {
      toast.error('Failed to delete provider');
    }
  };

  const resetForm = () => {
    setFormData({
      provider: '',
      account_sid: '',
      auth_token: '',
      api_key: '',
      api_secret: '',
      from_number: '',
      is_active: false
    });
  };

  const getProviderInfo = (providerId) => {
    return smsProviders.find(p => p.id === providerId) || { name: providerId, color: 'bg-gray-500' };
  };

  const renderProviderFields = () => {
    switch (formData.provider) {
      case 'twilio':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="account_sid">Account SID</Label>
              <Input
                id="account_sid"
                value={formData.account_sid}
                onChange={(e) => setFormData({ ...formData, account_sid: e.target.value })}
                placeholder="AC..."
                required
                data-testid="provider-account-sid-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth_token">Auth Token</Label>
              <Input
                id="auth_token"
                type="password"
                value={formData.auth_token}
                onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                placeholder="••••••••"
                required
                data-testid="provider-auth-token-input"
              />
            </div>
          </>
        );
      case 'telnyx':
      case 'vonage':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Your API Key"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_secret">API Secret</Label>
              <Input
                id="api_secret"
                type="password"
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
          </>
        );
      case 'plivo':
      case 'bandwidth':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="account_sid">Account ID</Label>
              <Input
                id="account_sid"
                value={formData.account_sid}
                onChange={(e) => setFormData({ ...formData, account_sid: e.target.value })}
                placeholder="Account ID"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth_token">Auth Token / API Key</Label>
              <Input
                id="auth_token"
                type="password"
                value={formData.auth_token}
                onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="settings-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-['Outfit']">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and SMS providers</p>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="integrations">Platform Integrations</TabsTrigger>
            <TabsTrigger value="gmail">Gmail</TabsTrigger>
            {isAdmin && <TabsTrigger value="phone-settings">Phone Numbers</TabsTrigger>}
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Platform Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] flex items-center gap-2">
                  <Shield className="h-5 w-5" /> Platform Integrations
                </CardTitle>
                <CardDescription>
                  These services are managed by the platform administrator and shared across all organizations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Twilio SMS */}
                <div className="flex items-center justify-between p-4 rounded-lg border" data-testid="twilio-status-card">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${platformStatus?.twilio?.connected ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
                      <MessageSquare className={`h-6 w-6 ${platformStatus?.twilio?.connected ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold">Twilio SMS</p>
                      <p className="text-sm text-muted-foreground">
                        SMS messaging, phone number purchasing, and voice calls
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {platformStatus?.twilio?.a2p_10dlc && (
                      <Badge variant="outline" className="border-blue-200 text-blue-700 dark:text-blue-400">
                        A2P 10DLC
                      </Badge>
                    )}
                    {platformStatus?.twilio?.connected ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1" data-testid="twilio-connected-badge">
                        <Wifi className="h-3 w-3" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1" data-testid="twilio-disconnected-badge">
                        <WifiOff className="h-3 w-3" /> Not Connected
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Twilio Config Form - org_admin only, shows when not connected */}
                {user?.role === 'org_admin' && !platformStatus?.twilio?.connected && (
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 space-y-3" data-testid="twilio-config-form">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Enter your Twilio credentials to connect:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="twilio-sid" className="text-xs">Account SID</Label>
                        <Input id="twilio-sid" placeholder="ACxxxxxxx..." value={twilioSid} onChange={e => setTwilioSid(e.target.value)} data-testid="twilio-sid-input" />
                      </div>
                      <div>
                        <Label htmlFor="twilio-token" className="text-xs">Auth Token</Label>
                        <Input id="twilio-token" type="password" placeholder="Your auth token" value={twilioToken} onChange={e => setTwilioToken(e.target.value)} data-testid="twilio-token-input" />
                      </div>
                      <div>
                        <Label htmlFor="twilio-ms" className="text-xs">Messaging Service SID (optional)</Label>
                        <Input id="twilio-ms" placeholder="MGxxxxxxx..." value={twilioMs} onChange={e => setTwilioMs(e.target.value)} data-testid="twilio-ms-input" />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleSaveTwilioCreds} disabled={twilioSaving} className="w-full" data-testid="twilio-save-btn">
                          {twilioSaving ? 'Verifying...' : 'Save & Verify'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Also show config button when connected, for updating */}
                {user?.role === 'org_admin' && platformStatus?.twilio?.connected && (
                  <div className="px-4 pb-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="twilio-update-btn">Update Twilio Credentials</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Twilio Credentials</DialogTitle>
                          <DialogDescription>Enter new credentials. They will be verified before saving.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                          <div>
                            <Label htmlFor="twilio-sid-modal">Account SID</Label>
                            <Input id="twilio-sid-modal" placeholder="ACxxxxxxx..." value={twilioSid} onChange={e => setTwilioSid(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="twilio-token-modal">Auth Token</Label>
                            <Input id="twilio-token-modal" type="password" placeholder="Your auth token" value={twilioToken} onChange={e => setTwilioToken(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="twilio-ms-modal">Messaging Service SID (optional)</Label>
                            <Input id="twilio-ms-modal" placeholder="MGxxxxxxx..." value={twilioMs} onChange={e => setTwilioMs(e.target.value)} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleSaveTwilioCreds} disabled={twilioSaving}>
                            {twilioSaving ? 'Verifying...' : 'Save & Verify'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {/* Stripe Payments - Always visible with config for org_admin */}
                <div className="flex items-center justify-between p-4 rounded-lg border" data-testid="stripe-status-card">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${platformStatus?.stripe?.connected ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
                      <CreditCard className={`h-6 w-6 ${platformStatus?.stripe?.connected ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold">Stripe Payments</p>
                      <p className="text-sm text-muted-foreground">
                        Credit card processing for credit purchases
                      </p>
                    </div>
                  </div>
                  {platformStatus?.stripe?.connected ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1" data-testid="stripe-connected-badge">
                      <Wifi className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1" data-testid="stripe-disconnected-badge">
                      <WifiOff className="h-3 w-3" /> Not Connected
                    </Badge>
                  )}
                </div>

                {/* Stripe Config Form - org_admin only, shows when not connected */}
                {user?.role === 'org_admin' && !platformStatus?.stripe?.connected && (
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 space-y-3" data-testid="stripe-config-form">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Enter your Stripe credentials to connect:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="stripe-secret" className="text-xs">Secret Key (sk_live_... or rk_live_...)</Label>
                        <Input id="stripe-secret" type="password" placeholder="sk_live_... or rk_live_..." value={stripeSecretKey} onChange={e => setStripeSecretKey(e.target.value)} data-testid="stripe-secret-input" />
                      </div>
                      <div>
                        <Label htmlFor="stripe-pub" className="text-xs">Publishable Key (pk_live_...) — optional</Label>
                        <Input id="stripe-pub" placeholder="pk_live_..." value={stripePublishableKey} onChange={e => setStripePublishableKey(e.target.value)} data-testid="stripe-pub-input" />
                      </div>
                      <div className="flex items-end md:col-span-2">
                        <Button onClick={handleSaveStripeCreds} disabled={stripeSaving} className="w-full md:w-auto" data-testid="stripe-save-btn">
                          {stripeSaving ? 'Verifying...' : 'Save & Verify'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stripe update button when already connected */}
                {user?.role === 'org_admin' && platformStatus?.stripe?.connected && (
                  <div className="px-4 pb-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="stripe-update-btn">Update Stripe Credentials</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Stripe Credentials</DialogTitle>
                          <DialogDescription>Enter new credentials. They will be verified before saving.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                          <div>
                            <Label htmlFor="stripe-secret-modal">Secret Key</Label>
                            <Input id="stripe-secret-modal" type="password" placeholder="sk_live_... or rk_live_..." value={stripeSecretKey} onChange={e => setStripeSecretKey(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="stripe-pub-modal">Publishable Key (optional)</Label>
                            <Input id="stripe-pub-modal" placeholder="pk_live_..." value={stripePublishableKey} onChange={e => setStripePublishableKey(e.target.value)} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleSaveStripeCreds} disabled={stripeSaving}>
                            {stripeSaving ? 'Verifying...' : 'Save & Verify'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gmail Tab */}
          <TabsContent value="gmail" className="space-y-6">
            <Card className="bg-red-50 border-red-100">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Gmail Integration</p>
                    <p className="text-sm text-red-700 mt-1">
                      Connect your Gmail account to send team invitations, notifications, and read incoming emails to import leads.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Gmail Account
                </CardTitle>
                <CardDescription>
                  Connect your Gmail to send and receive emails from the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gmailLoading ? (
                  <p className="text-muted-foreground">Loading Gmail status...</p>
                ) : gmailStatus.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-900">Connected</p>
                          <p className="text-sm text-green-700">{gmailStatus.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <Mail className="h-4 w-4 mr-2" />
                              Compose
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Compose Email</DialogTitle>
                              <DialogDescription>
                                Send an email from {gmailStatus.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="space-y-2">
                                <Label>To</Label>
                                <Input
                                  type="email"
                                  placeholder="recipient@example.com"
                                  value={emailForm.to}
                                  onChange={(e) => setEmailForm({...emailForm, to: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input
                                  placeholder="Email subject"
                                  value={emailForm.subject}
                                  onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Message</Label>
                                <Textarea
                                  placeholder="Type your message here..."
                                  rows={6}
                                  value={emailForm.body}
                                  onChange={(e) => setEmailForm({...emailForm, body: e.target.value})}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
                              <Button onClick={handleSendEmail} disabled={sendingEmail}>
                                {sendingEmail ? 'Sending...' : 'Send Email'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="outline" 
                          onClick={handleGmailDisconnect}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">What you can do:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Send team invitation emails</li>
                            <li>• Send notifications to clients</li>
                            <li>• Read incoming emails</li>
                            <li>• Import leads from inbox</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Mail className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-muted-foreground mb-4">No Gmail account connected</p>
                    <Button onClick={handleGmailConnect} className="bg-red-600 hover:bg-red-700">
                      <Link className="h-4 w-4 mr-2" />
                      Connect Gmail
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phone Number Settings Tab (Admin only) */}
          {isAdmin && (
          <TabsContent value="phone-settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Rep Phone Number Limits
                </CardTitle>
                <CardDescription>
                  Control how many phone numbers your reps can purchase per month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="rep-limit" className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    Monthly Purchase Limit Per Rep
                  </Label>
                  <div className="flex items-center gap-4 max-w-sm">
                    <Input
                      id="rep-limit"
                      type="number"
                      min="0"
                      value={repMonthlyLimit}
                      onChange={(e) => setRepMonthlyLimit(parseInt(e.target.value) || 0)}
                      data-testid="rep-monthly-limit-input"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {repMonthlyLimit === 0 ? 'No limit' : `${repMonthlyLimit}/month`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set to 0 for no limit. This controls the maximum number of phone numbers each rep can purchase per calendar month.
                  </p>
                </div>
                <Button 
                  onClick={handleSavePhoneSettings} 
                  disabled={phoneSettingsLoading}
                  data-testid="save-phone-settings-btn"
                >
                  {phoneSettingsLoading ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>

            {/* Number Deletion Request Card */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="font-['Outfit'] flex items-center gap-2 text-red-700">
                  <Trash2 className="h-5 w-5" />
                  Request Number Deletion
                </CardTitle>
                <CardDescription>
                  Select a phone number to request removal. An admin will contact you within 24 hours to confirm.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deleteRequestSent ? (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800" data-testid="delete-request-confirmation">
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <CheckCircle className="h-5 w-5" />
                      Request Received
                    </div>
                    <p className="text-sm">
                      Expect a phone call from the admin within 24 hours to confirm the deletion of your number.
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setDeleteRequestSent(false)}
                    >
                      Submit Another Request
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Select Number to Delete</Label>
                      <Select value={selectedDeleteNumber} onValueChange={setSelectedDeleteNumber}>
                        <SelectTrigger data-testid="delete-number-select">
                          <SelectValue placeholder="Choose a phone number..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ownedNumbers.map((num) => (
                            <SelectItem key={num.id} value={num.id}>
                              {num.phone_number} {num.friendly_name ? `(${num.friendly_name})` : ''} 
                              {num.assigned_user_name ? ` — ${num.assigned_user_name}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="destructive"
                      disabled={!selectedDeleteNumber}
                      onClick={async () => {
                        try {
                          await phoneNumbersApi.requestDeletion(selectedDeleteNumber);
                          setDeleteRequestSent(true);
                          setSelectedDeleteNumber('');
                          toast.success('Deletion request submitted');
                        } catch (error) {
                          toast.error(error.response?.data?.detail || 'Failed to submit request');
                        }
                      }}
                      data-testid="request-delete-btn"
                    >
                      Request Deletion
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Profile Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{user?.name || 'User'}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={user?.name || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={user?.phone || 'Not set'} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <div className="flex items-center gap-2 h-10">
                      {user?.is_verified ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unverified</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
