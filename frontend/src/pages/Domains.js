import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  Globe,
  Mail,
  CheckCircle,
  AlertCircle,
  Copy,
  Trash2,
  ExternalLink,
  ShoppingCart,
  Settings
} from 'lucide-react';
import { domainsApi, emailAccountsApi } from '../lib/api';
import { toast } from 'sonner';

const Domains = () => {
  const [domains, setDomains] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [marketplace, setMarketplace] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDomainOpen, setIsAddDomainOpen] = useState(false);
  const [isAddEmailOpen, setIsAddEmailOpen] = useState(false);
  const [isDnsDialogOpen, setIsDnsDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [dnsInstructions, setDnsInstructions] = useState(null);
  
  const [domainForm, setDomainForm] = useState({ domain_name: '' });
  const [emailForm, setEmailForm] = useState({
    domain_id: '',
    email_address: '',
    display_name: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [domainsRes, emailsRes, marketplaceRes] = await Promise.all([
        domainsApi.getAll(),
        emailAccountsApi.getAll(),
        domainsApi.getMarketplace()
      ]);
      setDomains(domainsRes.data);
      setEmailAccounts(emailsRes.data);
      setMarketplace(marketplaceRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!domainForm.domain_name) {
      toast.error('Please enter a domain name');
      return;
    }
    try {
      await domainsApi.create(domainForm);
      toast.success('Domain added! Configure DNS to verify.');
      setIsAddDomainOpen(false);
      setDomainForm({ domain_name: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add domain');
    }
  };

  const handleViewDns = async (domain) => {
    try {
      const response = await domainsApi.getDnsInstructions(domain.id);
      setDnsInstructions(response.data);
      setSelectedDomain(domain);
      setIsDnsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load DNS instructions');
    }
  };

  const handleVerifyDomain = async (domainId) => {
    try {
      await domainsApi.verify(domainId);
      toast.success('Domain verified!');
      fetchData();
    } catch (error) {
      toast.error('Verification failed');
    }
  };

  const handleDeleteDomain = async (id) => {
    if (!window.confirm('Delete this domain and all email accounts?')) return;
    try {
      await domainsApi.delete(id);
      toast.success('Domain deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete domain');
    }
  };

  const handleAddEmail = async () => {
    if (!emailForm.domain_id || !emailForm.email_address) {
      toast.error('Please fill in required fields');
      return;
    }
    try {
      await emailAccountsApi.create(emailForm);
      toast.success('Email account added!');
      setIsAddEmailOpen(false);
      setEmailForm({
        domain_id: '',
        email_address: '',
        display_name: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: ''
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to add email account');
    }
  };

  const handleDeleteEmail = async (id) => {
    if (!window.confirm('Delete this email account?')) return;
    try {
      await emailAccountsApi.delete(id);
      toast.success('Email account deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="domains-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-['Outfit']">Domains & Email</h1>
          <p className="text-muted-foreground mt-1">Manage domains and email accounts for merchant communication</p>
        </div>

        <Tabs defaultValue="domains" className="space-y-6">
          <TabsList>
            <TabsTrigger value="domains">My Domains</TabsTrigger>
            <TabsTrigger value="email">Email Accounts</TabsTrigger>
            <TabsTrigger value="marketplace">Buy Domains</TabsTrigger>
          </TabsList>

          {/* Domains Tab */}
          <TabsContent value="domains" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold font-['Outfit']">Connected Domains</h2>
              <Dialog open={isAddDomainOpen} onOpenChange={setIsAddDomainOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-domain-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-['Outfit']">Connect Your Domain</DialogTitle>
                    <DialogDescription>
                      Add a domain you own to send emails from
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Domain Name</Label>
                      <Input
                        placeholder="yourdomain.com"
                        value={domainForm.domain_name}
                        onChange={(e) => setDomainForm({ domain_name: e.target.value })}
                        data-testid="domain-name-input"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setIsAddDomainOpen(false)}>
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={handleAddDomain}>
                        Add Domain
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : domains.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No domains connected</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your domain to send emails from your own address
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {domains.map((domain) => (
                  <Card key={domain.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                            domain.dns_verified ? 'bg-green-100' : 'bg-yellow-100'
                          }`}>
                            <Globe className={`h-6 w-6 ${
                              domain.dns_verified ? 'text-green-600' : 'text-yellow-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold">{domain.domain_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Added {new Date(domain.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            domain.dns_verified 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }>
                            {domain.dns_verified ? (
                              <><CheckCircle className="h-3 w-3 mr-1" />Verified</>
                            ) : (
                              <><AlertCircle className="h-3 w-3 mr-1" />Pending</>
                            )}
                          </Badge>
                          <Button variant="outline" size="sm" onClick={() => handleViewDns(domain)}>
                            <Settings className="h-4 w-4 mr-1" />
                            DNS
                          </Button>
                          {!domain.dns_verified && (
                            <Button size="sm" onClick={() => handleVerifyDomain(domain.id)}>
                              Verify
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteDomain(domain.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Email Accounts Tab */}
          <TabsContent value="email" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold font-['Outfit']">Email Accounts</h2>
              <Dialog open={isAddEmailOpen} onOpenChange={setIsAddEmailOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-email-btn" disabled={domains.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Email Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-['Outfit']">Add Email Account</DialogTitle>
                    <DialogDescription>
                      Configure an email account to send from
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Domain *</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={emailForm.domain_id}
                        onChange={(e) => setEmailForm({ ...emailForm, domain_id: e.target.value })}
                      >
                        <option value="">Select domain</option>
                        {domains.map(d => (
                          <option key={d.id} value={d.id}>{d.domain_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input
                        placeholder="hello@yourdomain.com"
                        value={emailForm.email_address}
                        onChange={(e) => setEmailForm({ ...emailForm, email_address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        placeholder="Merchant Follow Up"
                        value={emailForm.display_name}
                        onChange={(e) => setEmailForm({ ...emailForm, display_name: e.target.value })}
                      />
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-3">SMTP Settings (Optional)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>SMTP Host</Label>
                          <Input
                            placeholder="smtp.gmail.com"
                            value={emailForm.smtp_host}
                            onChange={(e) => setEmailForm({ ...emailForm, smtp_host: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Port</Label>
                          <Input
                            type="number"
                            value={emailForm.smtp_port}
                            onChange={(e) => setEmailForm({ ...emailForm, smtp_port: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Username</Label>
                          <Input
                            value={emailForm.smtp_username}
                            onChange={(e) => setEmailForm({ ...emailForm, smtp_username: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <Input
                            type="password"
                            value={emailForm.smtp_password}
                            onChange={(e) => setEmailForm({ ...emailForm, smtp_password: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setIsAddEmailOpen(false)}>
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={handleAddEmail}>
                        Add Account
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {emailAccounts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No email accounts</p>
                  <p className="text-sm text-muted-foreground">
                    {domains.length === 0 
                      ? 'Connect a domain first, then add email accounts'
                      : 'Add an email account to start sending from your domain'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {emailAccounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{account.email_address}</p>
                            <p className="text-sm text-muted-foreground">
                              {account.display_name || 'No display name'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={account.is_active ? 'bg-green-100 text-green-700' : ''}>
                            {account.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteEmail(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-4">
            <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-zinc-900 border-blue-100 dark:border-blue-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  <CardTitle className="font-['Outfit']">Domain Marketplace</CardTitle>
                </div>
                <CardDescription>
                  {marketplace.note}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {marketplace.available_domains?.map((domain, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{domain.domain}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-primary">${domain.price}/yr</span>
                        <Badge variant="outline" className="text-green-600">Available</Badge>
                        <Button size="sm" disabled>
                          Coming Soon
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Supported Registrars:</strong> {marketplace.supported_registrars?.join(', ')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* DNS Instructions Dialog */}
        <Dialog open={isDnsDialogOpen} onOpenChange={setIsDnsDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">DNS Configuration</DialogTitle>
              <DialogDescription>
                Add these DNS records to verify {selectedDomain?.domain_name}
              </DialogDescription>
            </DialogHeader>
            {dnsInstructions && (
              <div className="space-y-4 mt-4">
                {dnsInstructions.instructions.map((record, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge>{record.type}</Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(record.value)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-mono">{record.name}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Value</p>
                        <p className="font-mono text-xs break-all">{record.value}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{record.description}</p>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Domains;
