import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Unlink
} from 'lucide-react';
import { smsProvidersApi, gmailApi } from '../lib/api';
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
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    provider: '',
    account_sid: '',
    auth_token: '',
    api_key: '',
    api_secret: '',
    from_number: '',
    is_active: false
  });

  useEffect(() => {
    fetchProviders();
  }, []);

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

        <Tabs defaultValue="providers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="providers">SMS Providers</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* SMS Providers Tab */}
          <TabsContent value="providers" className="space-y-6">
            {/* Info Banner */}
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Connect Your SMS Provider</p>
                    <p className="text-sm text-blue-700 mt-1">
                      To send payment reminders, you'll need to connect an SMS provider. 
                      We support Twilio, Telnyx, Vonage, Plivo, and Bandwidth.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Provider Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold font-['Outfit']">Connected Providers</h2>
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90" data-testid="add-provider-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Provider
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-['Outfit']">Add SMS Provider</DialogTitle>
                    <DialogDescription>
                      Connect your SMS service provider
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value) => setFormData({ ...formData, provider: value })}
                      >
                        <SelectTrigger data-testid="provider-select">
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {smsProviders.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${provider.color}`} />
                                {provider.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.provider && (
                      <>
                        <a
                          href={getProviderInfo(formData.provider).url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          Get credentials from {getProviderInfo(formData.provider).name}
                          <ExternalLink className="h-3 w-3" />
                        </a>

                        {renderProviderFields()}

                        <div className="space-y-2">
                          <Label htmlFor="from_number">From Phone Number *</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="from_number"
                              value={formData.from_number}
                              onChange={(e) => setFormData({ ...formData, from_number: e.target.value })}
                              placeholder="+1234567890"
                              className="pl-10"
                              required
                              data-testid="provider-from-number-input"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            The phone number messages will be sent from
                          </p>
                        </div>
                      </>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-primary hover:bg-primary/90" 
                        disabled={!formData.provider}
                        data-testid="save-provider-btn"
                      >
                        Add Provider
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Providers List */}
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : providers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No SMS providers configured</p>
                  <p className="text-sm text-muted-foreground">
                    Add a provider to start sending payment reminders
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((provider) => {
                  const info = getProviderInfo(provider.provider);
                  return (
                    <Card key={provider.id} className={provider.is_active ? 'ring-2 ring-primary' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg ${info.color} flex items-center justify-center text-white font-bold`}>
                              {info.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{info.name}</p>
                              <p className="text-sm text-muted-foreground">{provider.from_number}</p>
                            </div>
                          </div>
                          {provider.is_active && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          {!provider.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleActivate(provider.id)}
                            >
                              Set as Active
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(provider.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

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
