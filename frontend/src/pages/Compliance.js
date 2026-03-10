import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  Ban,
  Clock,
  Plus,
  Trash2,
  MessageSquare,
  Settings
} from 'lucide-react';
import { complianceApi } from '../lib/api';
import { toast } from 'sonner';

const Compliance = () => {
  const [settings, setSettings] = useState({
    stop_keywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'],
    opt_in_required: true,
    auto_reply_on_stop: 'You have been unsubscribed. Reply START to re-subscribe.',
    quiet_hours_start: null,
    quiet_hours_end: null
  });
  const [optOuts, setOptOuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [newOptOut, setNewOptOut] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, optOutsRes] = await Promise.all([
        complianceApi.getSettings().catch(() => ({ data: settings })),
        complianceApi.getOptOuts().catch(() => ({ data: [] }))
      ]);
      
      setSettings(settingsRes.data);
      setOptOuts(optOutsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await complianceApi.updateSettings(settings);
      toast.success('Compliance settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const keyword = newKeyword.trim().toUpperCase();
    if (!settings.stop_keywords.includes(keyword)) {
      setSettings({
        ...settings,
        stop_keywords: [...settings.stop_keywords, keyword]
      });
    }
    setNewKeyword('');
  };

  const removeKeyword = (keyword) => {
    setSettings({
      ...settings,
      stop_keywords: settings.stop_keywords.filter(k => k !== keyword)
    });
  };

  const handleAddOptOut = async () => {
    if (!newOptOut.trim()) return;
    
    try {
      await complianceApi.addOptOut(newOptOut.trim(), 'manual');
      toast.success('Contact added to opt-out list');
      setNewOptOut('');
      fetchData();
    } catch (error) {
      toast.error('Failed to add opt-out');
    }
  };

  const handleRemoveOptOut = async (phoneNumber) => {
    if (!window.confirm('Re-subscribe this contact?')) return;
    
    try {
      await complianceApi.removeOptOut(phoneNumber);
      toast.success('Contact re-subscribed');
      fetchData();
    } catch (error) {
      toast.error('Failed to re-subscribe');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="compliance-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-['Outfit']">SMS Compliance</h1>
          <p className="text-muted-foreground mt-1">
            Manage opt-outs and comply with SMS regulations (TCPA, CTIA)
          </p>
        </div>

        {/* Compliance Status Card */}
        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-medium">Compliance Status: Active</p>
                </div>
                <p className="text-sm opacity-90">
                  STOP keyword detection is enabled. {optOuts.length} contacts have opted out.
                </p>
              </div>
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="optouts">
              <Ban className="h-4 w-4 mr-2" />
              Opt-Outs ({optOuts.length})
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Stop Keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Stop Keywords</CardTitle>
                <CardDescription>
                  When a contact replies with any of these keywords, they will be automatically unsubscribed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {settings.stop_keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="text-sm py-1 px-3">
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Add keyword..."
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button onClick={addKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Auto Reply */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Auto-Reply on Opt-Out</CardTitle>
                <CardDescription>
                  Message sent automatically when someone unsubscribes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={settings.auto_reply_on_stop}
                  onChange={(e) => setSettings({ ...settings, auto_reply_on_stop: e.target.value })}
                  placeholder="You have been unsubscribed..."
                />
              </CardContent>
            </Card>

            {/* Quiet Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Quiet Hours</CardTitle>
                <CardDescription>
                  Don't send messages during these hours (recommended: 9pm - 8am)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={settings.quiet_hours_start || ''}
                      onChange={(e) => setSettings({ ...settings, quiet_hours_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={settings.quiet_hours_end || ''}
                      onChange={(e) => setSettings({ ...settings, quiet_hours_end: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opt-in Required */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Consent Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">Require Opt-in</p>
                    <p className="text-sm text-muted-foreground">
                      Only send messages to contacts who have explicitly opted in
                    </p>
                  </div>
                  <Switch
                    checked={settings.opt_in_required}
                    onCheckedChange={(checked) => setSettings({ ...settings, opt_in_required: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveSettings} className="w-full">
              Save Compliance Settings
            </Button>
          </TabsContent>

          {/* Opt-Outs Tab */}
          <TabsContent value="optouts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Opted-Out Contacts</CardTitle>
                <CardDescription>
                  These contacts have unsubscribed and will not receive any messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add Manual Opt-Out */}
                <div className="flex gap-2 mb-6">
                  <Input
                    value={newOptOut}
                    onChange={(e) => setNewOptOut(e.target.value)}
                    placeholder="Phone number to opt-out..."
                  />
                  <Button onClick={handleAddOptOut}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                {optOuts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No opted-out contacts</p>
                    <p className="text-sm mt-1">Contacts who reply STOP will appear here</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {optOuts.map((optOut) => (
                        <div
                          key={optOut.id}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">{optOut.phone_number}</p>
                            <p className="text-sm text-muted-foreground">
                              Opted out: {new Date(optOut.opted_out_at).toLocaleDateString()}
                              <span className="ml-2">• Reason: {optOut.reason}</span>
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveOptOut(optOut.phone_number)}
                          >
                            Re-subscribe
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Compliance Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Compliance Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Always honor opt-outs immediately</p>
                      <p className="text-sm text-muted-foreground">
                        Sending messages after an opt-out can result in carrier fines
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Get explicit consent before messaging</p>
                      <p className="text-sm text-muted-foreground">
                        Ensure contacts have opted in to receive messages from you
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Include opt-out instructions</p>
                      <p className="text-sm text-muted-foreground">
                        Add "Reply STOP to unsubscribe" to your messages
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Respect quiet hours</p>
                      <p className="text-sm text-muted-foreground">
                        Avoid sending messages late at night or early morning
                      </p>
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

export default Compliance;
