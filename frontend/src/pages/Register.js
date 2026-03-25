import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [business, setBusiness] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const logoUrl = "https://customer-assets.emergentagent.com/job_8de675b6-2eb0-4aa2-9eba-eeadd9657b38/artifacts/gcg3jc1g_Image_20260311_161856_605.png";

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    
    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    
    if (!business.trim()) {
      toast.error('Please enter your business name');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await register(name, email, password, phone, business, smsOptIn);
      // Navigate to OTP verification page
      toast.success('Account created! Please verify your account.');
      navigate('/verify-otp', { state: { email, otp: response.otp } });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Dark Background with Logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-black relative items-center justify-center">
        <div className="text-center px-12">
          <img 
            src={logoUrl} 
            alt="Merchant Follow Up" 
            className="w-64 h-auto mx-auto mb-6"
          />
          <p className="text-orange-400 text-lg opacity-90 mb-8">Start automating your payment reminders today.</p>
          <ul className="space-y-3 text-white/80 text-left">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              Send automated SMS reminders
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              Build drip campaigns with AI
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              Track all client conversations
            </li>
          </ul>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-4">
          <div className="text-center mb-6 lg:hidden">
            <img 
              src={logoUrl} 
              alt="Merchant Follow Up" 
              className="h-16 w-auto mx-auto"
            />
          </div>

          <Card className="border-0 shadow-none lg:shadow-lg lg:border">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold font-['Outfit']">Create an account</CardTitle>
              <CardDescription>Enter your details to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="register-name-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="register-email-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="register-phone-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business">Business Name <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="business"
                      type="text"
                      placeholder="Your Company Inc."
                      value={business}
                      onChange={(e) => setBusiness(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="register-business-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      data-testid="register-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="register-confirm-password-input"
                    />
                  </div>
                </div>

                {/* SMS Opt-In Checkbox */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="smsOptIn"
                      checked={smsOptIn}
                      onCheckedChange={(checked) => setSmsOptIn(checked)}
                      className="mt-1"
                      data-testid="sms-optin-checkbox"
                    />
                    <label
                      htmlFor="smsOptIn"
                      className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      By checking this box, you agree to receive text messages (e.g., payment reminders, 2FA, account notifications, alerts, customer service) from Merchant Follow Up LLC at the cell number used when signing up. Consent is not a condition of any purchase. Reply STOP to unsubscribe, HELP for help. Message & data rates may apply. Message frequency varies. I have read and agree with the{' '}
                      <Link to="/terms" className="text-primary hover:underline" target="_blank">
                        Terms and Conditions
                      </Link>
                      {' & '}
                      <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>
                      . <span className="text-red-500">*</span>
                    </label>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90" 
                  disabled={loading}
                  data-testid="register-submit-btn"
                >
                  {loading ? 'Creating account...' : 'Create account'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link to="/login" className="text-primary hover:underline font-medium" data-testid="login-link">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;
