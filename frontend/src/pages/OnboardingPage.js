import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  Building2, 
  User, 
  MessageSquare, 
  FileText, 
  CheckCircle, 
  Phone, 
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  Search,
  Send
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const OnboardingPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  
  const totalSteps = 10;

  const [formData, setFormData] = useState({
    // Step 1 - Business Information
    business_legal_name: '',
    business_dba: '',
    business_website: '',
    business_industry: '',
    business_type: '',
    business_ein: '',
    business_address: '',
    business_city: '',
    business_state: '',
    business_zip: '',
    business_country: 'United States',
    business_phone: '',
    business_email: '',
    
    // Step 2 - Contact Person
    contact_full_name: '',
    contact_job_title: '',
    contact_email: '',
    contact_phone: '',
    is_authorized_representative: false,
    
    // Step 3 - Messaging Use Case
    messaging_use_case: '',
    messaging_description: '',
    
    // Step 4 - Example Messages
    example_message_1: '',
    example_message_2: '',
    example_message_3: '',
    
    // Step 5 - Opt-In Method
    opt_in_method: '',
    opt_in_description: '',
    
    // Step 6 - Opt-Out Process
    opt_out_description: 'Recipients can reply STOP to unsubscribe.',
    
    // Step 7 - Message Frequency
    message_frequency: '',
    
    // Step 8 - Disclaimers
    consent_confirmed: false,
    no_spam_confirmed: false,
    
    // Step 9 - Phone Number
    area_code_search: '',
    selected_phone_number: '',
    phone_number_type: 'local'
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const searchPhoneNumbers = async () => {
    if (!formData.area_code_search || formData.area_code_search.length < 3) {
      toast.error('Please enter a valid area code (3 digits)');
      return;
    }
    
    setSearchingNumbers(true);
    // Simulated phone number search - in production this would call Twilio API
    setTimeout(() => {
      const mockNumbers = [
        `+1${formData.area_code_search}5551234`,
        `+1${formData.area_code_search}5555678`,
        `+1${formData.area_code_search}5559012`,
        `+1${formData.area_code_search}5553456`,
        `+1${formData.area_code_search}5557890`
      ];
      setAvailableNumbers(mockNumbers);
      setSearchingNumbers(false);
    }, 1500);
  };

  const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/api/onboarding/submit`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Onboarding submitted successfully! Your SMS registration is pending approval.');
      navigate('/settings/sms-status');
    } catch (error) {
      toast.error('Failed to submit onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIcons = {
    1: Building2,
    2: User,
    3: MessageSquare,
    4: FileText,
    5: CheckCircle,
    6: Shield,
    7: Clock,
    8: ClipboardCheck,
    9: Phone,
    10: Send
  };

  const stepTitles = {
    1: 'Business Information',
    2: 'Contact Person',
    3: 'Messaging Use Case',
    4: 'Example Messages',
    5: 'Opt-In Method',
    6: 'Opt-Out Process',
    7: 'Message Frequency',
    8: 'Compliance Confirmation',
    9: 'Phone Number Selection',
    10: 'Review & Submit'
  };

  const industries = [
    'Financial Services',
    'Real Estate',
    'Healthcare',
    'Insurance',
    'Automotive',
    'Home Services',
    'Legal Services',
    'Education',
    'Retail',
    'Technology',
    'Other'
  ];

  const businessTypes = [
    'Sole Proprietor',
    'LLC',
    'Corporation',
    'Partnership'
  ];

  const useCases = [
    'Customer Support',
    'Account Notifications',
    'Appointment Reminders',
    'Payment Reminders',
    'Marketing / Promotions',
    'Lead Follow Ups',
    'Other'
  ];

  const optInMethods = [
    'Website form',
    'Verbal consent',
    'Written consent',
    'Existing customer relationship',
    'Keyword opt-in',
    'Other'
  ];

  const frequencies = [
    '1–2 messages per week',
    '3–5 messages per week',
    'Daily',
    'Only when necessary'
  ];

  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_legal_name">Business Legal Name *</Label>
                <Input
                  id="business_legal_name"
                  value={formData.business_legal_name}
                  onChange={(e) => updateField('business_legal_name', e.target.value)}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_dba">DBA (if different)</Label>
                <Input
                  id="business_dba"
                  value={formData.business_dba}
                  onChange={(e) => updateField('business_dba', e.target.value)}
                  placeholder="Acme Funding"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_website">Business Website *</Label>
                <Input
                  id="business_website"
                  value={formData.business_website}
                  onChange={(e) => updateField('business_website', e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_industry">Business Industry *</Label>
                <Select value={formData.business_industry} onValueChange={(v) => updateField('business_industry', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map(ind => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_type">Business Type *</Label>
                <Select value={formData.business_type} onValueChange={(v) => updateField('business_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_ein">Business EIN / Tax ID *</Label>
                <Input
                  id="business_ein"
                  value={formData.business_ein}
                  onChange={(e) => updateField('business_ein', e.target.value)}
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_address">Business Address *</Label>
              <Input
                id="business_address"
                value={formData.business_address}
                onChange={(e) => updateField('business_address', e.target.value)}
                placeholder="123 Main Street, Suite 100"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_city">City *</Label>
                <Input
                  id="business_city"
                  value={formData.business_city}
                  onChange={(e) => updateField('business_city', e.target.value)}
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_state">State *</Label>
                <Select value={formData.business_state} onValueChange={(v) => updateField('business_state', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {usStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_zip">ZIP Code *</Label>
                <Input
                  id="business_zip"
                  value={formData.business_zip}
                  onChange={(e) => updateField('business_zip', e.target.value)}
                  placeholder="10001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_country">Country</Label>
                <Input
                  id="business_country"
                  value={formData.business_country}
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_phone">Business Phone Number *</Label>
                <Input
                  id="business_phone"
                  value={formData.business_phone}
                  onChange={(e) => updateField('business_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_email">Business Email *</Label>
                <Input
                  id="business_email"
                  type="email"
                  value={formData.business_email}
                  onChange={(e) => updateField('business_email', e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              This identifies the person responsible for the messaging campaign.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_full_name">Full Name *</Label>
                <Input
                  id="contact_full_name"
                  value={formData.contact_full_name}
                  onChange={(e) => updateField('contact_full_name', e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_job_title">Job Title *</Label>
                <Input
                  id="contact_job_title"
                  value={formData.contact_job_title}
                  onChange={(e) => updateField('contact_job_title', e.target.value)}
                  placeholder="Marketing Manager"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email Address *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone Number *</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
              <Checkbox
                id="is_authorized"
                checked={formData.is_authorized_representative}
                onCheckedChange={(checked) => updateField('is_authorized_representative', checked)}
              />
              <Label htmlFor="is_authorized" className="cursor-pointer">
                I am the authorized representative for this business
              </Label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Twilio requires the platform to describe what type of messages will be sent.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="messaging_use_case">Primary Use Case *</Label>
              <Select value={formData.messaging_use_case} onValueChange={(v) => updateField('messaging_use_case', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your primary use case" />
                </SelectTrigger>
                <SelectContent>
                  {useCases.map(uc => (
                    <SelectItem key={uc} value={uc}>{uc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="messaging_description">Describe how you will use SMS messaging *</Label>
              <Textarea
                id="messaging_description"
                value={formData.messaging_description}
                onChange={(e) => updateField('messaging_description', e.target.value)}
                placeholder="Users will send follow-up messages to clients regarding funding inquiries, application status, and payment reminders."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about the types of messages and who will receive them.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Carriers require real message examples. Provide 3 examples of messages you plan to send.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="example_1">Example Message 1 *</Label>
                <Textarea
                  id="example_1"
                  value={formData.example_message_1}
                  onChange={(e) => updateField('example_message_1', e.target.value)}
                  placeholder="Hi John, just following up on your funding request. Let me know if you're still interested."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="example_2">Example Message 2 *</Label>
                <Textarea
                  id="example_2"
                  value={formData.example_message_2}
                  onChange={(e) => updateField('example_message_2', e.target.value)}
                  placeholder="Reminder: Your payment of $750 is due tomorrow."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="example_3">Example Message 3 *</Label>
                <Textarea
                  id="example_3"
                  value={formData.example_message_3}
                  onChange={(e) => updateField('example_message_3', e.target.value)}
                  placeholder="Hey Sarah, we received your application. We'll review it shortly."
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Carriers must know how contacts consent to receive messages. This is very important for compliance.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="opt_in_method">How do your clients opt in to receive SMS messages? *</Label>
              <Select value={formData.opt_in_method} onValueChange={(v) => updateField('opt_in_method', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select opt-in method" />
                </SelectTrigger>
                <SelectContent>
                  {optInMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opt_in_description">Describe how opt-in consent is collected *</Label>
              <Textarea
                id="opt_in_description"
                value={formData.opt_in_description}
                onChange={(e) => updateField('opt_in_description', e.target.value)}
                placeholder="Clients provide their phone number through a website form or during a funding application and consent to receive follow-up messages."
                rows={4}
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Recipients must be able to stop messages at any time. 
                The system automatically supports: STOP, UNSUBSCRIBE, CANCEL, END, QUIT
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="opt_out_description">How can users opt out of messages? *</Label>
              <Textarea
                id="opt_out_description"
                value={formData.opt_out_description}
                onChange={(e) => updateField('opt_out_description', e.target.value)}
                placeholder="Recipients can reply STOP to unsubscribe."
                rows={3}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Supported opt-out keywords:</p>
              <div className="flex flex-wrap gap-2">
                {['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].map(keyword => (
                  <Badge key={keyword} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Carriers want to know how often messages will be sent to recipients.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="message_frequency">How often will recipients receive messages? *</Label>
              <Select value={formData.message_frequency} onValueChange={(v) => updateField('message_frequency', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map(freq => (
                    <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Recommended:</strong> "Only when necessary" is the best option for follow-up, 
                notification, and reminder-based messaging.
              </p>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Please confirm your compliance with messaging regulations.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                <Checkbox
                  id="consent_confirmed"
                  checked={formData.consent_confirmed}
                  onCheckedChange={(checked) => updateField('consent_confirmed', checked)}
                />
                <Label htmlFor="consent_confirmed" className="cursor-pointer leading-relaxed">
                  I confirm that all recipients have consented to receive messages and can opt out at any time.
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                <Checkbox
                  id="no_spam_confirmed"
                  checked={formData.no_spam_confirmed}
                  onCheckedChange={(checked) => updateField('no_spam_confirmed', checked)}
                />
                <Label htmlFor="no_spam_confirmed" className="cursor-pointer leading-relaxed">
                  I agree not to send spam, prohibited content, or unsolicited marketing messages.
                </Label>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> Violation of these terms may result in account suspension 
                and legal consequences. Please ensure you understand and comply with all regulations.
              </p>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Choose a phone number to use for your SMS messaging.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number Type</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={formData.phone_number_type === 'local' ? 'default' : 'outline'}
                    onClick={() => updateField('phone_number_type', 'local')}
                  >
                    Local Number
                  </Button>
                  <Button
                    type="button"
                    variant={formData.phone_number_type === 'toll-free' ? 'default' : 'outline'}
                    onClick={() => updateField('phone_number_type', 'toll-free')}
                  >
                    Toll-Free Number
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_code">Search by Area Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="area_code"
                    value={formData.area_code_search}
                    onChange={(e) => updateField('area_code_search', e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="212"
                    maxLength={3}
                    className="w-32"
                  />
                  <Button 
                    type="button" 
                    onClick={searchPhoneNumbers}
                    disabled={searchingNumbers}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {searchingNumbers ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {availableNumbers.length > 0 && (
                <div className="space-y-2">
                  <Label>Available Numbers</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableNumbers.map(number => (
                      <Button
                        key={number}
                        type="button"
                        variant={formData.selected_phone_number === number ? 'default' : 'outline'}
                        className="justify-start font-mono"
                        onClick={() => updateField('selected_phone_number', number)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {formatPhoneDisplay(number)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {formData.selected_phone_number && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Selected:</strong> {formatPhoneDisplay(formData.selected_phone_number)}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Review your information before submitting for SMS approval.
            </p>
            
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Business Name</p>
                    <p className="font-medium">{formData.business_legal_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Website</p>
                    <p className="font-medium">{formData.business_website || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Industry</p>
                    <p className="font-medium">{formData.business_industry || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Business Type</p>
                    <p className="font-medium">{formData.business_type || '-'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Messaging Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Use Case</p>
                    <p className="font-medium">{formData.messaging_use_case || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Description</p>
                    <p className="font-medium">{formData.messaging_description || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Message Frequency</p>
                    <p className="font-medium">{formData.message_frequency || '-'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Example Messages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="p-3 bg-muted rounded">
                    <p>{formData.example_message_1 || '-'}</p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <p>{formData.example_message_2 || '-'}</p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <p>{formData.example_message_3 || '-'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Phone Number</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <p className="font-medium font-mono">
                      {formData.selected_phone_number ? formatPhoneDisplay(formData.selected_phone_number) : 'Not selected'}
                    </p>
                    <Badge variant="secondary">{formData.phone_number_type}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {formData.consent_confirmed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-red-500" />
                    )}
                    <p>Consent confirmation</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.no_spam_confirmed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-red-500" />
                    )}
                    <p>No spam agreement</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const StepIcon = stepIcons[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_8de675b6-2eb0-4aa2-9eba-eeadd9657b38/artifacts/gcg3jc1g_Image_20260311_161856_605.png" 
                alt="Merchant Follow Up" 
                className="h-10 w-auto" 
              />
              <div>
                <h1 className="text-lg font-bold">SMS Onboarding</h1>
                <p className="text-xs text-muted-foreground">Twilio A2P 10DLC Registration</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-24">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <StepIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{stepTitles[currentStep]}</CardTitle>
                <CardDescription>Step {currentStep} of {totalSteps}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-4">
        <div className="max-w-4xl mx-auto px-4 flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.consent_confirmed || !formData.no_spam_confirmed}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for SMS Approval'}
              <Send className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
