import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Phone, PhoneOff, Clock, Shield, AlertTriangle, CheckCircle2, XCircle,
  User, Building2, MapPin, MessageSquare, FileText, Search, BarChart3,
  PhoneCall, PhoneForwarded, PhoneMissed, Voicemail, Timer, Zap,
  ArrowRight, Ban, Settings, TrendingUp, Target, Activity
} from 'lucide-react';
import { phoneBlowerApi, phoneNumbersApi, clientsApi } from '../lib/api';
import { toast } from 'sonner';

const DISPOSITIONS = [
  { value: 'no_answer', label: 'No Answer', icon: PhoneMissed, color: 'text-gray-500' },
  { value: 'left_voicemail', label: 'Left Voicemail', icon: Voicemail, color: 'text-blue-500' },
  { value: 'busy', label: 'Busy', icon: PhoneOff, color: 'text-orange-500' },
  { value: 'answered_interested', label: 'Interested', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'answered_not_interested', label: 'Not Interested', icon: XCircle, color: 'text-red-400' },
  { value: 'callback_requested', label: 'Callback Requested', icon: PhoneForwarded, color: 'text-purple-500' },
  { value: 'wrong_number', label: 'Wrong Number', icon: Ban, color: 'text-red-600' },
  { value: 'do_not_call', label: 'Do Not Call', icon: Shield, color: 'text-red-700' },
  { value: 'application_sent', label: 'App Sent', icon: FileText, color: 'text-emerald-500' },
  { value: 'application_started', label: 'App Started', icon: Target, color: 'text-emerald-600' },
  { value: 'funded_elsewhere', label: 'Funded Elsewhere', icon: Building2, color: 'text-gray-400' },
  { value: 'already_funded', label: 'Already Funded', icon: CheckCircle2, color: 'text-gray-400' },
  { value: 'dead_lead', label: 'Dead Lead', icon: XCircle, color: 'text-gray-600' },
];

const PhoneBlower = () => {
  const [queue, setQueue] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadProfile, setLeadProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [ownedNumbers, setOwnedNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ max_attempts_per_day: 3, cooldown_minutes: 60 });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [queueRes, analyticsRes, numbersRes, settingsRes] = await Promise.all([
        phoneBlowerApi.getQueue(),
        phoneBlowerApi.getAnalytics(),
        phoneNumbersApi.getOwned().catch(() => ({ data: [] })),
        phoneBlowerApi.getSettings().catch(() => ({ data: null })),
      ]);
      setQueue(queueRes.data || []);
      setAnalytics(analyticsRes.data);
      setOwnedNumbers(numbersRes.data || []);
      if (numbersRes.data?.length > 0) setSelectedNumber(numbersRes.data[0].phone_number);
      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setSettingsForm({
          max_attempts_per_day: settingsRes.data.max_attempts_per_day || 3,
          cooldown_minutes: settingsRes.data.cooldown_minutes || 60,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectLead = async (clientId) => {
    setProfileLoading(true);
    setSelectedLead(clientId);
    try {
      const res = await phoneBlowerApi.getLeadProfile(clientId);
      setLeadProfile(res.data);
      setCallNotes('');
    } catch (e) {
      toast.error('Failed to load lead profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDisposition = async (disposition) => {
    if (!selectedLead || !selectedNumber) {
      toast.error('Select a lead and outbound number first');
      return;
    }
    try {
      await phoneBlowerApi.logCall({
        client_id: selectedLead,
        outbound_number: selectedNumber,
        disposition,
        notes: callNotes,
        duration_seconds: 0,
      });
      toast.success(`Disposition logged: ${disposition.replace(/_/g, ' ')}`);
      setCallNotes('');
      // Refresh profile and queue
      await Promise.all([selectLead(selectedLead), loadInitialData()]);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to log call');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await phoneBlowerApi.updateSettings(settingsForm);
      toast.success('Settings updated');
      setSettingsOpen(false);
      loadInitialData();
    } catch (e) {
      toast.error('Failed to update settings');
    }
  };

  const filteredQueue = queue.filter(item => {
    if (!search) return true;
    const name = item.client?.name?.toLowerCase() || '';
    const company = item.client?.company?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || company.includes(search.toLowerCase());
  });

  const comp = leadProfile?.compliance || {};
  const client = leadProfile?.client || {};

  return (
    <DashboardLayout>
      <div className="space-y-4" data-testid="phone-blower-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black font-['Outfit'] tracking-tight" data-testid="phone-blower-title">
              PHONE BLOWER
            </h1>
            <p className="text-sm text-muted-foreground">High-intensity outbound call workflow</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(!settingsOpen)} data-testid="pb-settings-btn">
              <Settings className="h-4 w-4 mr-1" /> Settings
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {settingsOpen && (
          <Card className="border-zinc-300">
            <CardContent className="pt-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Max attempts/day</Label>
                  <Input type="number" className="w-20" value={settingsForm.max_attempts_per_day} 
                    onChange={e => setSettingsForm({...settingsForm, max_attempts_per_day: parseInt(e.target.value) || 3})} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Cooldown (min)</Label>
                  <Input type="number" className="w-20" value={settingsForm.cooldown_minutes}
                    onChange={e => setSettingsForm({...settingsForm, cooldown_minutes: parseInt(e.target.value) || 60})} />
                </div>
                <div className="text-sm text-muted-foreground">Call window: 9AM-5PM ET, Mon-Fri</div>
                <Button size="sm" onClick={handleSaveSettings}>Save</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Bar */}
        {analytics && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Attempts', value: analytics.total_attempts, color: 'text-zinc-900' },
              { label: 'Connects', value: analytics.connects, color: 'text-green-600' },
              { label: 'No Answer', value: analytics.no_answers, color: 'text-gray-500' },
              { label: 'Voicemails', value: analytics.voicemails_left, color: 'text-blue-500' },
              { label: 'Interested', value: analytics.positive_contacts, color: 'text-emerald-600' },
              { label: 'Connect Rate', value: `${analytics.connect_rate}%`, color: 'text-amber-600' },
            ].map((stat, i) => (
              <div key={i} className="rounded-lg border bg-white p-3 text-center">
                <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Main Content: Queue + Lead Card */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left: Call Queue */}
          <div className="col-span-4">
            <Card className="h-[calc(100vh-320px)]">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Call Queue</CardTitle>
                  <Badge variant="secondary">{filteredQueue.length}</Badge>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-440px)]">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Loading queue...</div>
                  ) : filteredQueue.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No leads in queue</div>
                  ) : (
                    <div className="divide-y">
                      {filteredQueue.map((item) => (
                        <button
                          key={item.client.id}
                          onClick={() => selectLead(item.client.id)}
                          data-testid={`queue-lead-${item.client.id}`}
                          className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors ${
                            selectedLead === item.client.id ? 'bg-zinc-100 border-l-2 border-zinc-900' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{item.client.name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{item.client.company || item.client.phone}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {item.today_attempts > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1">{item.today_attempts}x</Badge>
                              )}
                              {item.last_disposition && (
                                <div className={`h-2 w-2 rounded-full ${
                                  item.last_disposition === 'answered_interested' ? 'bg-green-500' :
                                  item.last_disposition === 'no_answer' ? 'bg-gray-400' :
                                  item.last_disposition === 'callback_requested' ? 'bg-purple-500' :
                                  'bg-orange-400'
                                }`} />
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right: Lead Profile + Actions */}
          <div className="col-span-8 space-y-4">
            {!selectedLead ? (
              <Card className="h-[calc(100vh-320px)] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a lead to start calling</p>
                  <p className="text-sm">Pick from the queue on the left</p>
                </div>
              </Card>
            ) : profileLoading ? (
              <Card className="h-[calc(100vh-320px)] flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              </Card>
            ) : leadProfile ? (
              <>
                {/* Compliance Banner */}
                {(comp.is_blocked || comp.is_terminal || !comp.in_call_window) && (
                  <div className={`rounded-lg p-3 flex items-center gap-3 ${
                    comp.is_blocked ? 'bg-red-50 border border-red-200' :
                    comp.is_terminal ? 'bg-gray-100 border border-gray-200' :
                    'bg-amber-50 border border-amber-200'
                  }`} data-testid="compliance-banner">
                    {comp.is_blocked ? <Shield className="h-5 w-5 text-red-600" /> :
                     comp.is_terminal ? <Ban className="h-5 w-5 text-gray-500" /> :
                     <AlertTriangle className="h-5 w-5 text-amber-600" />}
                    <div>
                      <p className={`text-sm font-semibold ${comp.is_blocked ? 'text-red-700' : comp.is_terminal ? 'text-gray-600' : 'text-amber-700'}`}>
                        {leadProfile.recommendation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Lead Profile Card */}
                <Card data-testid="lead-profile-card">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Lead Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-zinc-500" />
                          <div>
                            <p className="font-semibold text-lg">{client.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{client.company || 'No company'}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="font-mono">{client.phone || 'No phone'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{client.timezone || 'ET (default)'}</span>
                          </div>
                          {client.amount_requested && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
                              <span className="font-mono font-semibold text-emerald-600">${client.amount_requested?.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">{client.pipeline_stage || 'unknown'}</Badge>
                          {client.tags?.map(t => (
                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* Call Status */}
                      <div className="space-y-3">
                        <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Call Status</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Today's attempts</span>
                            <span className="font-mono font-semibold">{leadProfile.today_attempts} / {settings?.max_attempts_per_day || 3}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Last disposition</span>
                            <span className="font-medium">{leadProfile.last_call?.disposition?.replace(/_/g, ' ') || 'None'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Last call</span>
                            <span className="text-xs">{leadProfile.last_call?.created_at ? new Date(leadProfile.last_call.created_at).toLocaleString() : 'Never'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Next action</span>
                            <Badge className={
                              leadProfile.next_action === 'call' ? 'bg-green-100 text-green-700' :
                              leadProfile.next_action === 'text_first' ? 'bg-blue-100 text-blue-700' :
                              leadProfile.next_action === 'send_application' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {leadProfile.next_action?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                        {comp.cooldown_active && comp.cooldown_expires && (
                          <div className="rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
                            <Timer className="h-3 w-3 inline mr-1" />
                            Cooldown until {new Date(comp.cooldown_expires).toLocaleTimeString()}
                          </div>
                        )}
                      </div>

                      {/* Guardrails */}
                      <div className="space-y-3">
                        <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Compliance</h4>
                        <div className="space-y-1.5">
                          {[
                            { label: 'Call Window', ok: comp.in_call_window, detail: comp.in_call_window ? 'Open' : 'Closed' },
                            { label: 'Weekday', ok: comp.is_weekday, detail: comp.is_weekday ? 'Yes' : 'Weekend' },
                            { label: 'DNC Status', ok: !comp.is_dnc, detail: comp.is_dnc ? 'BLOCKED' : 'Clear' },
                            { label: 'Opt-Out', ok: !comp.is_opted_out, detail: comp.is_opted_out ? 'BLOCKED' : 'Clear' },
                            { label: 'Cooldown', ok: !comp.cooldown_active, detail: comp.cooldown_active ? 'Active' : 'Clear' },
                            { label: 'Daily Limit', ok: !comp.attempts_exhausted, detail: comp.attempts_exhausted ? 'Reached' : 'OK' },
                          ].map((g, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-zinc-500">{g.label}</span>
                              <div className="flex items-center gap-1">
                                {g.ok ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                                <span className={g.ok ? 'text-green-600' : 'text-red-600'}>{g.detail}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Call Controls + Disposition */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Outbound Number + Call */}
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Outbound Number</h4>
                      <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select number" /></SelectTrigger>
                        <SelectContent>
                          {ownedNumbers.map(n => (
                            <SelectItem key={n.phone_number} value={n.phone_number}>
                              {n.friendly_name || n.phone_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        className={`w-full h-12 text-base font-bold ${comp.can_call ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
                        disabled={!comp.can_call}
                        onClick={() => {
                          if (comp.can_call) toast.info(`Calling ${client.phone} from ${selectedNumber}...`);
                        }}
                        data-testid="call-now-btn"
                      >
                        <PhoneCall className="h-5 w-5 mr-2" />
                        {comp.can_call ? 'CALL NOW' : 'BLOCKED'}
                      </Button>
                      {!comp.can_call && (
                        <p className="text-xs text-red-500 text-center">{leadProfile.recommendation}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Dispositions */}
                  <Card className="col-span-2">
                    <CardContent className="pt-4 space-y-3">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Log Disposition</h4>
                      <div className="grid grid-cols-4 gap-1.5">
                        {DISPOSITIONS.map(d => {
                          const Icon = d.icon;
                          return (
                            <Button
                              key={d.value}
                              variant="outline"
                              size="sm"
                              className={`h-auto py-2 px-2 text-xs justify-start ${d.color}`}
                              onClick={() => handleDisposition(d.value)}
                              data-testid={`disposition-${d.value}`}
                            >
                              <Icon className="h-3.5 w-3.5 mr-1 shrink-0" />
                              <span className="truncate">{d.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Notes + Attempt History */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Call Notes</h4>
                      <Textarea
                        placeholder="Add notes about this call..."
                        value={callNotes}
                        onChange={e => setCallNotes(e.target.value)}
                        className="h-24 text-sm"
                        data-testid="call-notes"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Attempt History</h4>
                      <ScrollArea className="h-24">
                        {leadProfile.attempts?.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No call history</p>
                        ) : (
                          <div className="space-y-1.5">
                            {leadProfile.attempts?.slice(0, 10).map((a, i) => (
                              <div key={i} className="flex items-center justify-between text-xs border-b pb-1">
                                <div className="flex items-center gap-1.5">
                                  <div className={`h-1.5 w-1.5 rounded-full ${
                                    a.disposition === 'answered_interested' ? 'bg-green-500' :
                                    a.disposition === 'no_answer' ? 'bg-gray-400' : 'bg-orange-400'
                                  }`} />
                                  <span className="capitalize">{a.disposition?.replace(/_/g, ' ')}</span>
                                </div>
                                <span className="text-zinc-400">{new Date(a.created_at).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PhoneBlower;
