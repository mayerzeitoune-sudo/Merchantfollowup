import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  Receipt,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2
} from 'lucide-react';
import { organizationsApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Billing = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Org admin should use Organizations page for billing
    if (user?.role === 'org_admin') {
      navigate('/organizations');
      return;
    }
    
    if (user?.org_id) {
      fetchBilling();
    } else {
      setLoading(false);
    }
  }, [user, token, navigate]);

  const fetchBilling = async () => {
    try {
      const response = await organizationsApi.getOrgBilling(token, user.org_id);
      setBilling(response.data);
    } catch (error) {
      console.error('Failed to fetch billing:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user?.org_id) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No Organization</h2>
          <p className="text-muted-foreground">You are not assigned to any organization.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="billing-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-['Outfit']">Billing</h1>
          <p className="text-muted-foreground mt-1">
            View billing information for {billing?.organization?.name || 'your organization'}
          </p>
        </div>

        {billing ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{billing.billing.user_count}</p>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{(billing.billing.amount_owed * 5).toLocaleString()} credits</p>
                      <p className="text-sm text-muted-foreground">Amount Owed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-600">{(billing.billing.amount_paid * 5).toLocaleString()} credits</p>
                      <p className="text-sm text-muted-foreground">Amount Paid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={billing.billing.balance > 0 ? 'border-red-200' : 'border-green-200'}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-lg ${billing.billing.balance > 0 ? 'bg-red-100' : 'bg-green-100'} flex items-center justify-center`}>
                      {billing.billing.balance > 0 ? (
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      ) : (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className={`text-3xl font-bold ${billing.billing.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(Math.abs(billing.billing.balance) * 5).toLocaleString()} credits
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {billing.billing.balance > 0 ? 'Outstanding Balance' : 'Credit Balance'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pricing Info */}
            <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-bold text-orange-600">{billing.billing.price_per_user * 5}</p>
                    <p className="text-muted-foreground">credits per user / month</p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={billing.billing.status === 'paid' ? 'default' : billing.billing.status === 'partial' ? 'secondary' : 'destructive'}
                      className={`text-sm px-4 py-2 ${
                        billing.billing.status === 'paid' ? 'bg-green-100 text-green-700' :
                        billing.billing.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}
                    >
                      {billing.billing.status === 'paid' ? (
                        <><CheckCircle className="h-4 w-4 mr-1" /> Paid</>
                      ) : billing.billing.status === 'partial' ? (
                        <><Clock className="h-4 w-4 mr-1" /> Partial Payment</>
                      ) : (
                        <><AlertCircle className="h-4 w-4 mr-1" /> Payment Due</>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>Users ({billing.users.length})</CardTitle>
                <CardDescription>Each user costs {billing.billing.price_per_user * 5} credits/month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {billing.users.map((u) => (
                    <div key={u.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{u.role}</Badge>
                        <span className="text-sm text-muted-foreground">{billing.billing.price_per_user * 5} credits/mo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Recent payments for your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {billing.payments.length > 0 ? (
                  <div className="divide-y">
                    {billing.payments.map((p) => (
                      <div key={p.id} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-green-600">{(p.amount * 5).toLocaleString()} credits</p>
                          {p.notes && <p className="text-sm text-muted-foreground">{p.notes}</p>}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No payments recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact for Payment */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">
                    To make a payment, please contact your account manager or the platform administrator.
                  </p>
                  <Button variant="outline">
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No billing information available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Billing;
