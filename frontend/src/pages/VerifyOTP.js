import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const VerifyOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOTP } = useAuth();

  const email = location.state?.email;
  const testOtp = location.state?.otp; // For testing purposes

  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, [email, navigate]);

  const handleChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      // Focus the input after the pasted data
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const getOtpString = () => otp.join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = getOtpString();
    
    if (otpString.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(email, otpString);
      toast.success('Account verified successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const logoUrl = "https://customer-assets.emergentagent.com/job_8de675b6-2eb0-4aa2-9eba-eeadd9657b38/artifacts/gcg3jc1g_Image_20260311_161856_605.png";

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-secondary/30">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src={logoUrl} 
            alt="Merchant Follow Up" 
            className="h-16 w-auto mx-auto"
          />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold font-['Outfit']">Verify your account</CardTitle>
            <CardDescription>
              We've sent a verification code to <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-xl font-semibold"
                    data-testid={`otp-input-${index}`}
                  />
                ))}
              </div>

              {testOtp && (
                <p className="text-center text-sm text-muted-foreground">
                  Test OTP: <span className="font-mono font-medium text-primary">{testOtp}</span>
                </p>
              )}

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90" 
                disabled={loading || getOtpString().length !== 6}
                data-testid="verify-otp-btn"
              >
                {loading ? 'Verifying...' : 'Verify Account'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6">
              <Link 
                to="/register" 
                className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                data-testid="back-to-register-link"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to registration
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyOTP;
