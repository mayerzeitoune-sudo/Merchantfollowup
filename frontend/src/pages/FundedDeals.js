import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Checkbox } from '../components/ui/checkbox';
import { 
  DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Clock, Users, Calendar,
  FileText, Plus, Search, Filter, BarChart3, ArrowRight, Bell, MessageSquare,
  ExternalLink, Award, Trash2, Edit, MoreHorizontal, Target, Zap, TrendingDown
} from 'lucide-react';
import { fundedApi, clientsApi, teamApi, enhancedCampaignsApi } from '../lib/api';
import { toast } from 'sonner';

const DEAL_TYPES = ["MCA", "Term Loan", "Line of Credit", "Equipment Financing", "Revenue Based", "Invoice Factoring"];
const PAYMENT_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" }
];

const getStatusColor = (status) => {
  const colors = {
    current: "bg-green-100 text-green-700",
    upcoming: "bg-blue-100 text-blue-700",
    due_today: "bg-yellow-100 text-yellow-700",
    late: "bg-orange-100 text-orange-700",
    severely_late: "bg-red-100 text-red-700",
    paid_off: "bg-emerald-100 text-emerald-700",
    active: "bg-blue-100 text-blue-700"
  };
  return colors[status] || "bg-gray-100 text-gray-700";
};

const fmt = (n) => n >= 1000 ? `${(n/1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n).toLocaleString()}`;
const fmtFull = (n) => n.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});

const FundedDeals = () => {
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [collectionsQueue, setCollectionsQueue] = useState([]);
  const [recentDeals, setRecentDeals] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [showNewDealDialog, setShowNewDealDialog] = useState(false);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState(null);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  // Projections state
  const [projections, setProjections] = useState(null);

  const [newDeal, setNewDeal] = useState({
    client_id: '', client_name: '', business_name: '', deal_type: 'MCA',
    funded_amount: '', rate_percent: '', funding_date: new Date().toISOString().split('T')[0],
    payback_amount: '', payment_frequency: 'weekly', num_payments: '', payment_amount: '',
    start_date: new Date().toISOString().split('T')[0], assigned_rep: '', notes: '', auto_calculate: true
  });

  const handleFundedAmountChange = (value) => {
    const fundedAmount = parseFloat(value) || 0;
    const ratePercent = parseFloat(newDeal.rate_percent) || 0;
    const numPayments = parseInt(newDeal.num_payments) || 0;
    let updates = { funded_amount: value };
    if (newDeal.auto_calculate && ratePercent > 0) {
      const paybackAmount = fundedAmount * (1 + ratePercent / 100);
      updates.payback_amount = paybackAmount.toFixed(2);
      if (numPayments > 0) updates.payment_amount = (paybackAmount / numPayments).toFixed(2);
    }
    setNewDeal({ ...newDeal, ...updates });
  };

  const handleRateChange = (value) => {
    const fundedAmount = parseFloat(newDeal.funded_amount) || 0;
    const ratePercent = parseFloat(value) || 0;
    const numPayments = parseInt(newDeal.num_payments) || 0;
    let updates = { rate_percent: value };
    if (newDeal.auto_calculate && fundedAmount > 0) {
      const paybackAmount = fundedAmount * (1 + ratePercent / 100);
      updates.payback_amount = paybackAmount.toFixed(2);
      if (numPayments > 0) updates.payment_amount = (paybackAmount / numPayments).toFixed(2);
    }
    setNewDeal({ ...newDeal, ...updates });
  };

  const handleNumPaymentsChange = (value) => {
    const numPayments = parseInt(value) || 0;
    const paybackAmount = parseFloat(newDeal.payback_amount) || 0;
    let updates = { num_payments: value };
    if (newDeal.auto_calculate && paybackAmount > 0 && numPayments > 0)
      updates.payment_amount = (paybackAmount / numPayments).toFixed(2);
    setNewDeal({ ...newDeal, ...updates });
  };

  const handlePaybackChange = (value) => {
    const paybackAmount = parseFloat(value) || 0;
    const numPayments = parseInt(newDeal.num_payments) || 0;
    let updates = { payback_amount: value, auto_calculate: false };
    if (numPayments > 0 && paybackAmount > 0)
      updates.payment_amount = (paybackAmount / numPayments).toFixed(2);
    setNewDeal({ ...newDeal, ...updates });
  };

  useEffect(() => { fetchData(); }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealsRes, statsRes, queueRes, recentRes, milestonesRes, clientsRes, teamRes, projectionsRes] = await Promise.all([
        fundedApi.getAll(filters),
        fundedApi.getStats(),
        fundedApi.getCollectionsQueue(),
        fundedApi.getRecent(),
        fundedApi.getMilestones(),
        clientsApi.getAll(),
        teamApi.getMembers().catch(() => ({ data: [] })),
        enhancedCampaignsApi.getSystemProjections().catch(() => ({ data: null }))
      ]);
      setDeals(dealsRes.data || []);
      setStats(statsRes.data || {});
      setCollectionsQueue(queueRes.data || []);
      setRecentDeals(recentRes.data || []);
      setMilestones(milestonesRes.data || []);
      setClients(clientsRes.data || []);
      setTeamMembers(teamRes.data || []);
      setProjections(projectionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeal = async () => {
    if (!newDeal.client_id || !newDeal.funded_amount || !newDeal.payback_amount) {
      toast.error('Please fill in required fields');
      return;
    }
    try {
      const client = clients.find(c => c.id === newDeal.client_id);
      const rep = teamMembers.find(m => m.id === newDeal.assigned_rep);
      await fundedApi.create({
        ...newDeal, client_name: client?.name || '',
        funded_amount: parseFloat(newDeal.funded_amount), payback_amount: parseFloat(newDeal.payback_amount),
        num_payments: parseInt(newDeal.num_payments), payment_amount: parseFloat(newDeal.payment_amount),
        assigned_rep_name: rep?.name || ''
      });
      toast.success('Funded deal created!');
      setShowNewDealDialog(false);
      setNewDeal({
        client_id: '', client_name: '', business_name: '', deal_type: 'MCA',
        funded_amount: '', funding_date: new Date().toISOString().split('T')[0],
        payback_amount: '', payment_frequency: 'weekly', num_payments: '', payment_amount: '',
        start_date: new Date().toISOString().split('T')[0], assigned_rep: '', notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create deal');
    }
  };

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return;
    try {
      await fundedApi.delete(dealToDelete.id);
      toast.success('Deal deleted');
      setDeleteDialogOpen(false);
      setDealToDelete(null);
      fetchData();
    } catch (error) { toast.error('Failed to delete deal'); }
  };

  const handleBulkDelete = async () => {
    if (selectedDeals.length === 0) return;
    try {
      await Promise.all(selectedDeals.map(id => fundedApi.delete(id)));
      toast.success(`${selectedDeals.length} deal(s) deleted`);
      setBulkDeleteDialogOpen(false);
      setSelectedDeals([]);
      fetchData();
    } catch (error) { toast.error('Failed to delete some deals'); }
  };

  const toggleSelectDeal = (dealId) => {
    setSelectedDeals(prev => prev.includes(dealId) ? prev.filter(id => id !== dealId) : [...prev, dealId]);
  };

  const filteredDeals = deals.filter(deal =>
    search === '' ||
    deal.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    deal.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Projection calculations
  const totalLeads = projections?.total_leads || 0;
  const convLow = Math.max(1, Math.round(totalLeads * 0.05));
  const convHigh = Math.max(1, Math.round(totalLeads * 0.12));
  const dealValue = 25000; // credits (5x $5,000)
  const leadValue = 470; // credits (5x $94)
  const profitLow = convLow * dealValue;
  const profitHigh = convHigh * dealValue;
  const activeCampaigns = projections?.active_campaigns || 0;
  const activeEnrollments = projections?.active_enrollments || 0;

  // Per-message cost projections (54 messages per new lead campaign) - in credits
  const avgMsgsPerLead = 54;
  const textCostCredits = 0.316; // credits per text
  const totalTextCostCreditsLow = convLow * avgMsgsPerLead * textCostCredits;
  const totalTextCostCreditsHigh = convHigh * avgMsgsPerLead * textCostCredits;
  const leadValueCredits = Math.round((profitLow / Math.max(1, totalLeads)) * 5); // convert lead value to credits

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="funded-deals-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']" data-testid="projections-title">Projections</h1>
            <p className="text-muted-foreground mt-1">System-wide earnings forecast & deal tracking</p>
          </div>
          <Dialog open={showNewDealDialog} onOpenChange={setShowNewDealDialog}>
            <DialogTrigger asChild>
              <Button data-testid="new-funded-deal-btn">
                <Plus className="h-4 w-4 mr-2" />
                New Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Deal</DialogTitle>
                <DialogDescription>Record a new deal to track payments</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="col-span-2 space-y-2">
                  <Label>Client *</Label>
                  <Select value={newDeal.client_id} onValueChange={(v) => setNewDeal({...newDeal, client_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input value={newDeal.business_name} onChange={(e) => setNewDeal({...newDeal, business_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Deal Type *</Label>
                  <Select value={newDeal.deal_type} onValueChange={(v) => setNewDeal({...newDeal, deal_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DEAL_TYPES.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Funded Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">cr</span>
                    <Input type="number" value={newDeal.funded_amount} onChange={(e) => handleFundedAmountChange(e.target.value)} placeholder="100,000" className="pl-7" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rate (Factor) %</Label>
                  <div className="relative">
                    <Input type="number" value={newDeal.rate_percent} onChange={(e) => handleRateChange(e.target.value)} placeholder="50" className="pr-7" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Funding Date *</Label>
                  <Input type="date" value={newDeal.funding_date} onChange={(e) => setNewDeal({...newDeal, funding_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Total Payback Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">cr</span>
                    <Input type="number" value={newDeal.payback_amount} onChange={(e) => handlePaybackChange(e.target.value)} placeholder="150,000" className={`pl-7 ${newDeal.auto_calculate ? 'bg-muted/50' : ''}`} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Frequency *</Label>
                  <Select value={newDeal.payment_frequency} onValueChange={(v) => setNewDeal({...newDeal, payment_frequency: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_FREQUENCIES.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Payments *</Label>
                  <Input type="number" value={newDeal.num_payments} onChange={(e) => handleNumPaymentsChange(e.target.value)} placeholder="e.g., 52" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">cr</span>
                    <Input type="number" value={newDeal.payment_amount} onChange={(e) => setNewDeal({...newDeal, payment_amount: e.target.value})} className="pl-7 bg-muted/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>First Payment Date *</Label>
                  <Input type="date" value={newDeal.start_date} onChange={(e) => setNewDeal({...newDeal, start_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Assigned Rep</Label>
                  <Select value={newDeal.assigned_rep} onValueChange={(v) => setNewDeal({...newDeal, assigned_rep: v})}>
                    <SelectTrigger><SelectValue placeholder="Select rep" /></SelectTrigger>
                    <SelectContent>{teamMembers.map(m => (<SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notes</Label>
                  <Input value={newDeal.notes} onChange={(e) => setNewDeal({...newDeal, notes: e.target.value})} />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowNewDealDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateDeal}>Create Deal</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* System-Wide Projections Panel */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5 shadow-sm" data-testid="projections-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 font-['Outfit']">Earning Projections</h2>
                <p className="text-xs text-zinc-500">Based on {totalLeads} total leads in your system</p>
              </div>
            </div>
            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              Live
            </Badge>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Leads */}
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4" data-testid="kpi-total-leads">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Leads</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 font-['Outfit']">{totalLeads.toLocaleString()}</p>
              <p className="text-xs text-zinc-400 mt-1">System-wide pipeline</p>
            </div>

            {/* Estimated Conversions */}
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4" data-testid="kpi-est-conversions">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Est. Conversions</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 font-['Outfit']">
                {convLow} <span className="text-sm font-normal text-zinc-400">to</span> {convHigh}
              </p>
              <p className="text-xs text-zinc-400 mt-1">5% - 12% conversion rate</p>
            </div>

            {/* Projected Revenue */}
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4" data-testid="kpi-projected-revenue">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Projected Revenue</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 font-['Outfit']">
                {fmt(profitLow)} <span className="text-sm font-normal text-zinc-400">to</span> {fmt(profitHigh)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">25,000 credits avg per closed deal</p>
            </div>

            {/* Net Profit (after text costs) */}
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4" data-testid="kpi-net-profit">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Campaign Credit Cost</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 font-['Outfit']">
                {Math.round(totalTextCostCreditsLow).toLocaleString()} <span className="text-sm font-normal text-zinc-400">to</span> {Math.round(totalTextCostCreditsHigh).toLocaleString()}
              </p>
              <p className="text-xs text-zinc-400 mt-1">credits for messaging all leads</p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Cost Breakdown */}
            <div className="rounded-lg bg-zinc-50/80 border border-zinc-100 p-4">
              <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Credit Cost Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Credits per text</span>
                  <span className="text-zinc-800 font-mono">0.316</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Avg texts per campaign</span>
                  <span className="text-zinc-800 font-mono">{avgMsgsPerLead}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Credits per lead contacted</span>
                  <span className="text-zinc-800 font-mono">{Math.round(avgMsgsPerLead * textCostCredits)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Credit value per lead</span>
                  <span className="text-emerald-600 font-mono font-semibold">{leadValueCredits.toLocaleString()}</span>
                </div>
                <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm">
                  <span className="text-zinc-500">Total credit spend range</span>
                  <span className="text-amber-600 font-mono">{Math.round(totalTextCostCreditsLow).toLocaleString()} - {Math.round(totalTextCostCreditsHigh).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Pipeline Summary */}
            <div className="rounded-lg bg-zinc-50/80 border border-zinc-100 p-4">
              <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Pipeline Summary</h3>
              <div className="space-y-2">
                {projections?.pipeline_stages && Object.entries(projections.pipeline_stages)
                  .sort((a, b) => b[1] - a[1])
                  .map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500 capitalize">{stage.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-zinc-200 w-16">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, (count / totalLeads) * 100)}%` }}
                          />
                        </div>
                        <span className="text-zinc-800 font-mono w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                {(!projections?.pipeline_stages || Object.keys(projections.pipeline_stages).length === 0) && (
                  <p className="text-zinc-400 text-sm">No pipeline data yet</p>
                )}
              </div>
            </div>

            {/* Campaign Activity */}
            <div className="rounded-lg bg-zinc-50/80 border border-zinc-100 p-4">
              <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Campaign Activity</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Active campaigns</span>
                  <span className="text-zinc-800 font-mono">{activeCampaigns}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Leads in campaigns</span>
                  <span className="text-zinc-800 font-mono">{activeEnrollments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Campaign coverage</span>
                  <span className="text-emerald-600 font-mono">
                    {totalLeads > 0 ? ((activeEnrollments / totalLeads) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm">
                  <span className="text-zinc-500">Funded deals</span>
                  <span className="text-emerald-600 font-mono">{projections?.funded_count || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Formula Footnote */}
          <div className="flex items-center gap-2 pt-1">
            <BarChart3 className="h-3.5 w-3.5 text-zinc-400" />
            <p className="text-[11px] text-zinc-400">
              Revenue = Conversions (5%-12%) x 25,000 credits/deal &mdash; Credit Cost (0.316 credits/msg x {avgMsgsPerLead} msgs) &mdash; Credit value: {leadValueCredits}/lead
            </p>
          </div>
        </div>

        {/* Deal Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="hover:shadow-md hover:border-green-300 transition-all" data-testid="stat-projected-volume">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xl font-bold">{((stats.total_funded_volume || 0) * 5).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Projected Volume (credits)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md hover:border-blue-300 transition-all" data-testid="stat-active-deals">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xl font-bold">{stats.active_deals || 0}</p>
                    <p className="text-xs text-muted-foreground">Active Deals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md hover:border-purple-300 transition-all" data-testid="stat-outstanding">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xl font-bold">{((stats.total_outstanding || 0) * 5).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md hover:border-emerald-300 transition-all" data-testid="stat-collected">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-xl font-bold">{((stats.total_collected || 0) * 5).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Collected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md hover:border-orange-300 transition-all" data-testid="stat-late">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-xl font-bold">{stats.late_accounts || 0}</p>
                    <p className="text-xs text-muted-foreground">Late Accounts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md hover:border-cyan-300 transition-all" data-testid="stat-avg-deal">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-cyan-600" />
                  <div>
                    <p className="text-xl font-bold">{((stats.average_deal_size || 0) * 5).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Milestones Alert */}
        {milestones.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800">50% Paid Milestones</p>
                  <p className="text-sm text-yellow-700">{milestones.length} deal(s) have reached 50% paid</p>
                </div>
                <div className="flex gap-2">
                  {milestones.slice(0, 2).map(m => (
                    <Badge key={m.deal_id} className="bg-yellow-200 text-yellow-800">{m.client_name} - ${m.total_collected.toLocaleString()}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit'] flex items-center gap-2"><Bell className="h-5 w-5" />Collections Queue</CardTitle>
                  <CardDescription>Payments due soon or overdue</CardDescription>
                </CardHeader>
                <CardContent>
                  {collectionsQueue.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>All payments current</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {collectionsQueue.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium">{item.client_name}</p>
                              <p className="text-sm text-muted-foreground">{item.business_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{(item.amount * 5).toLocaleString()} cr</p>
                              <Badge className={getStatusColor(item.status)}>
                                {item.days_diff < 0 ? `${Math.abs(item.days_diff)} days late` : item.days_diff === 0 ? 'Due today' : `Due in ${item.days_diff} days`}
                              </Badge>
                            </div>
                            <Link to={`/funded/${item.deal_id}`}>
                              <Button variant="ghost" size="sm"><ArrowRight className="h-4 w-4" /></Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit'] flex items-center gap-2"><TrendingUp className="h-5 w-5" />Recent Funded Deals</CardTitle>
                  <CardDescription>Latest deals that funded</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentDeals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No funded deals yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {recentDeals.map((deal) => (
                          <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                            <div>
                              <p className="font-medium text-green-800">{deal.client_name}</p>
                              <p className="text-sm text-green-600">{deal.business_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-700">{(deal.funded_amount * 5)?.toLocaleString()} cr</p>
                              <p className="text-xs text-green-600">{new Date(deal.funding_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading deals...</p>
              </div>
            ) : filteredDeals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No funded deals yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                {selectedDeals.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                    <span className="text-sm font-medium">{selectedDeals.length} deal(s) selected</span>
                    <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialogOpen(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />Delete Selected
                    </Button>
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 w-10">
                        <Checkbox checked={selectedDeals.length === filteredDeals.length && filteredDeals.length > 0} onCheckedChange={() => setSelectedDeals(prev => prev.length === filteredDeals.length ? [] : filteredDeals.map(d => d.id))} />
                      </th>
                      <th className="text-left p-3 font-medium">Client</th>
                      <th className="text-left p-3 font-medium">Deal Type</th>
                      <th className="text-right p-3 font-medium">Funded</th>
                      <th className="text-right p-3 font-medium">Payback</th>
                      <th className="text-right p-3 font-medium">Collected</th>
                      <th className="text-center p-3 font-medium">% Paid</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Rep</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeals.map((deal) => (
                      <tr key={deal.id} className={`border-b hover:bg-muted/30 ${selectedDeals.includes(deal.id) ? 'bg-primary/5' : ''}`}>
                        <td className="p-3"><Checkbox checked={selectedDeals.includes(deal.id)} onCheckedChange={() => toggleSelectDeal(deal.id)} /></td>
                        <td className="p-3"><p className="font-medium">{deal.client_name}</p><p className="text-xs text-muted-foreground">{deal.business_name}</p></td>
                        <td className="p-3">{deal.deal_type}</td>
                        <td className="p-3 text-right font-medium">{(deal.funded_amount * 5)?.toLocaleString()} cr</td>
                        <td className="p-3 text-right">{(deal.payback_amount * 5)?.toLocaleString()} cr</td>
                        <td className="p-3 text-right text-green-600">{(deal.total_collected * 5)?.toLocaleString()} cr</td>
                        <td className="p-3 text-center"><Badge className={deal.percent_paid >= 50 ? "bg-green-100 text-green-700" : "bg-gray-100"}>{deal.percent_paid}%</Badge></td>
                        <td className="p-3 text-center"><Badge className={getStatusColor(deal.payment_status)}>{deal.payment_status}</Badge></td>
                        <td className="p-3">{deal.assigned_rep_name || '-'}</td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link to={`/funded/${deal.id}`}><DropdownMenuItem><ExternalLink className="h-4 w-4 mr-2" />View Details</DropdownMenuItem></Link>
                              <Link to={`/funded/${deal.id}`}><DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit Deal</DropdownMenuItem></Link>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => { setDealToDelete(deal); setDeleteDialogOpen(true); }} className="text-destructive cursor-pointer">
                                <Trash2 className="h-4 w-4 mr-2" />Delete Deal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Collections Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-blue-50"><p className="text-sm text-blue-600">Auto-Cleared Today</p><p className="text-2xl font-bold text-blue-700">{collectionsQueue.filter(q => q.status === 'cleared').length}</p></div>
                  <div className="p-4 rounded-lg bg-red-50"><p className="text-sm text-red-600">Payments Overdue</p><p className="text-2xl font-bold text-red-700">{collectionsQueue.filter(q => q.days_diff < 0).length}</p></div>
                  <div className="p-4 rounded-lg bg-yellow-50"><p className="text-sm text-yellow-600">Due Today</p><p className="text-2xl font-bold text-yellow-700">{collectionsQueue.filter(q => q.days_diff === 0).length}</p></div>
                  <div className="p-4 rounded-lg bg-green-50"><p className="text-sm text-green-600">50% Milestones</p><p className="text-2xl font-bold text-green-700">{milestones.length}</p></div>
                </div>
                <h3 className="font-medium mb-3">Action Required</h3>
                {collectionsQueue.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No collections actions needed</p>
                ) : (
                  <div className="space-y-2">
                    {collectionsQueue.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${item.days_diff < 0 ? 'bg-red-500' : item.days_diff === 0 ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                          <div><p className="font-medium">{item.client_name}</p><p className="text-sm text-muted-foreground">{(item.amount * 5).toLocaleString()} cr - Payment #{item.payment_number}</p></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(item.status)}>
                            {item.days_diff < 0 ? `${Math.abs(item.days_diff)} days late` : item.days_diff === 0 ? 'Due today' : `Due in ${item.days_diff} days`}
                          </Badge>
                          <Button variant="outline" size="sm">Send Reminder</Button>
                          <Link to={`/funded/${item.deal_id}`}><Button variant="ghost" size="sm">View</Button></Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Book Value Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                    <p className="text-sm text-green-600 mb-1">Total Book Value</p>
                    <p className="text-3xl font-bold text-green-700">{((stats?.book_value || 0) * 5).toLocaleString()} cr</p>
                    <p className="text-xs text-green-500 mt-1">Outstanding receivables</p>
                  </div>
                  <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                    <p className="text-sm text-blue-600 mb-1">Expected Receivables</p>
                    <p className="text-3xl font-bold text-blue-700">{((stats?.expected_receivables || 0) * 5).toLocaleString()} cr</p>
                    <p className="text-xs text-blue-500 mt-1">Future collections</p>
                  </div>
                  <div className="p-6 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                    <p className="text-sm text-purple-600 mb-1">Monthly Funded</p>
                    <p className="text-3xl font-bold text-purple-700">{((stats?.monthly_funded_volume || 0) * 5).toLocaleString()} cr</p>
                    <p className="text-xs text-purple-500 mt-1">This month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Funded Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this funded deal for <strong>{dealToDelete?.client_name}</strong>? This will permanently remove all payment records and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDealToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDeal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedDeals.length} Funded Deal(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedDeals.length} funded deal(s)? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete {selectedDeals.length} Deal(s)</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default FundedDeals;
