import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Coins, ShieldCheck, Zap, Crown, Sparkles, ArrowRight, Check,
  Loader2, Clock, User, CreditCard, TrendingUp, Star
} from 'lucide-react';
import { creditsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const TIER_ICONS = {
  starter: Coins, growth: TrendingUp, professional: Zap, scale: Sparkles,
  executive: Crown, enterprise: ShieldCheck, titan: Star, black: Crown,
};

const TIER_COLORS = {
  starter: 'from-zinc-700 to-zinc-800',
  growth: 'from-blue-800 to-blue-900',
  professional: 'from-indigo-800 to-indigo-900',
  scale: 'from-violet-800 to-violet-900',
  executive: 'from-amber-700 to-amber-900',
  enterprise: 'from-emerald-800 to-emerald-900',
  titan: 'from-rose-800 to-rose-900',
  black: 'from-zinc-900 to-black',
};

const TIER_ACCENTS = {
  starter: 'border-zinc-600', growth: 'border-blue-500', professional: 'border-indigo-500',
  scale: 'border-violet-500', executive: 'border-amber-500', enterprise: 'border-emerald-500',
  titan: 'border-rose-500', black: 'border-white/30',
};

const CreditShop = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'org_admin'].includes(user?.role);
  const [packages, setPackages] = useState([]);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [checkoutPkg, setCheckoutPkg] = useState(null);
  const [showSuccess, setShowSuccess] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgRes, balRes, histRes] = await Promise.all([
        creditsApi.getPackages(),
        creditsApi.getBalance(),
        isAdmin ? creditsApi.getHistory().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setPackages(pkgRes.data || []);
      setBalance(balRes.data?.balance || 0);
      setHistory(histRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePurchase = async () => {
    if (!checkoutPkg) return;
    setPurchasing(true);
    try {
      const res = await creditsApi.purchase({ package_id: checkoutPkg.id });
      setBalance(res.data.new_balance);
      setShowSuccess(res.data);
      setCheckoutPkg(null);
      toast.success(`${res.data.credits_added.toLocaleString()} credits added!`);
      // Dispatch event so header updates
      window.dispatchEvent(new CustomEvent('credits-updated', { detail: { balance: res.data.new_balance } }));
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Purchase failed');
    } finally { setPurchasing(false); }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="credit-shop-page">
        {/* Hero Header */}
        <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.04),transparent)] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-black font-['Outfit'] tracking-tight" data-testid="credit-shop-title">Credit Shop</h1>
                <p className="text-zinc-400 mt-1 text-sm max-w-md">
                  Purchase credits for your organization's outreach, automation, and platform activity.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Organization Balance</p>
                <p className="text-4xl font-black font-mono text-white mt-1" data-testid="shop-credit-balance">
                  {balance.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">credits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Packages Grid */}
        <div>
          <h2 className="text-lg font-bold font-['Outfit'] mb-4">Select a Package</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => {
              const Icon = TIER_ICONS[pkg.id] || Coins;
              const gradientClass = TIER_COLORS[pkg.id] || 'from-zinc-700 to-zinc-800';
              const accentClass = TIER_ACCENTS[pkg.id] || 'border-zinc-600';
              return (
                <Card
                  key={pkg.id}
                  className={`relative overflow-hidden border-2 ${accentClass} bg-gradient-to-br ${gradientClass} text-white cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl group`}
                  onClick={() => isAdmin ? setCheckoutPkg(pkg) : null}
                  data-testid={`package-${pkg.id}`}
                >
                  <CardContent className="p-5 space-y-3">
                    {pkg.discount > 0 && (
                      <Badge className="absolute top-3 right-3 bg-green-500/90 text-white text-[10px] font-bold">
                        SAVE {pkg.discount}%
                      </Badge>
                    )}
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{pkg.name}</p>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">{pkg.id === 'black' ? 'Elite' : 'Package'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-black font-mono">{pkg.credits.toLocaleString()}</p>
                      <p className="text-xs text-white/50">credits</p>
                    </div>
                    <div className="border-t border-white/10 pt-2">
                      <p className="text-lg font-bold">${pkg.usd.toLocaleString()}</p>
                      <p className="text-[10px] text-white/40">{pkg.description}</p>
                    </div>
                    {isAdmin ? (
                      <Button
                        className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold"
                        onClick={(e) => { e.stopPropagation(); setCheckoutPkg(pkg); }}
                        data-testid={`buy-${pkg.id}`}
                      >
                        Purchase <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    ) : (
                      <Button disabled className="w-full bg-white/5 text-white/30 text-sm border border-white/10" data-testid={`buy-${pkg.id}-disabled`}>
                        Admins Only
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Purchase History (Admin Only) */}
        {isAdmin && history.length > 0 && (
          <div>
            <h2 className="text-lg font-bold font-['Outfit'] mb-4">Purchase History</h2>
            <Card className="border-zinc-200">
              <CardContent className="p-0">
                <ScrollArea className="max-h-80">
                  <table className="w-full text-sm" data-testid="credit-history-table">
                    <thead>
                      <tr className="border-b bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-left p-3 font-semibold">Type</th>
                        <th className="text-left p-3 font-semibold">Description</th>
                        <th className="text-left p-3 font-semibold">By</th>
                        <th className="text-right p-3 font-semibold">Credits</th>
                        <th className="text-right p-3 font-semibold">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((txn) => (
                        <tr key={txn.id} className="border-b last:border-0 hover:bg-zinc-50 transition-colors">
                          <td className="p-3 text-zinc-500 font-mono text-xs">
                            {new Date(txn.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <Badge variant={txn.type === 'purchase' ? 'default' : 'secondary'} className={`text-[10px] ${txn.type === 'purchase' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {txn.type}
                            </Badge>
                          </td>
                          <td className="p-3 text-zinc-700">{txn.description}</td>
                          <td className="p-3 text-zinc-500">{txn.user_name}</td>
                          <td className={`p-3 text-right font-mono font-bold ${txn.credits_delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {txn.credits_delta > 0 ? '+' : ''}{txn.credits_delta.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono text-zinc-400">
                            {txn.usd_amount ? `$${txn.usd_amount.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={!!checkoutPkg} onOpenChange={(o) => { if (!o) setCheckoutPkg(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">Confirm Purchase</DialogTitle>
          </DialogHeader>
          {checkoutPkg && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-400 uppercase tracking-wider">Package</p>
                    <p className="text-xl font-black">{checkoutPkg.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black font-mono">{checkoutPkg.credits.toLocaleString()}</p>
                    <p className="text-xs text-zinc-400">credits</p>
                  </div>
                </div>
                {checkoutPkg.discount > 0 && (
                  <Badge className="mt-2 bg-green-500/80 text-white text-xs">
                    {checkoutPkg.discount}% savings
                  </Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-zinc-500">Amount</span>
                  <span className="font-bold">${checkoutPkg.usd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-zinc-500">Credits</span>
                  <span className="font-bold font-mono text-green-600">+{checkoutPkg.credits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-zinc-500">New Balance</span>
                  <span className="font-bold font-mono">{(balance + checkoutPkg.credits).toLocaleString()}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCheckoutPkg(null)}>Cancel</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={purchasing}
                  onClick={handlePurchase}
                  data-testid="confirm-purchase-btn"
                >
                  {purchasing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : <><CreditCard className="h-4 w-4 mr-2" /> Pay ${checkoutPkg.usd.toLocaleString()}</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!showSuccess} onOpenChange={(o) => { if (!o) setShowSuccess(null); }}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-4 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold font-['Outfit']">Purchase Complete</h3>
            <p className="text-3xl font-black font-mono text-green-600">
              +{showSuccess?.credits_added?.toLocaleString()}
            </p>
            <p className="text-sm text-zinc-500">credits added to your organization</p>
            <p className="text-lg font-bold font-mono">
              New Balance: {showSuccess?.new_balance?.toLocaleString()}
            </p>
            <Button onClick={() => setShowSuccess(null)} className="w-full" data-testid="success-close-btn">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CreditShop;
