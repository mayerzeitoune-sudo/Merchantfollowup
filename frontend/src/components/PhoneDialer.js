import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  X, 
  Delete,
  Search,
  User,
  Clock,
  Users
} from 'lucide-react';
import { phoneNumbersApi, clientsApi, callsApi } from '../lib/api';
import { toast } from 'sonner';

// Format phone number for display
const formatPhoneDisplay = (number) => {
  if (!number) return '';
  // Remove all non-digits
  const cleaned = number.replace(/\D/g, '');
  
  // Handle numbers with country code
  let digits = cleaned;
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    digits = cleaned.slice(1); // Remove leading 1 for display formatting
  }
  
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

// Standardize phone number to E.164 format (+1XXXXXXXXXX)
const standardizePhoneNumber = (number) => {
  if (!number) return '';
  // Remove all non-digits
  const cleaned = number.replace(/\D/g, '');
  
  // If already has country code (11 digits starting with 1)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If 10 digits, add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // Return as-is with + prefix if it's valid
  if (cleaned.length >= 10) {
    return `+${cleaned}`;
  }
  
  return cleaned;
};

const PhoneDialer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedFromNumber, setSelectedFromNumber] = useState('');
  const [ownedNumbers, setOwnedNumbers] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [callStatus, setCallStatus] = useState(null);
  const [activeCallId, setActiveCallId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dialpad');

  useEffect(() => {
    if (isOpen) {
      fetchOwnedNumbers();
      fetchClients();
    }
  }, [isOpen]);

  const fetchOwnedNumbers = async () => {
    try {
      const response = await phoneNumbersApi.getOwned();
      setOwnedNumbers(response.data || []);
      const defaultNum = response.data?.find(n => n.is_default) || response.data?.[0];
      if (defaultNum) {
        setSelectedFromNumber(defaultNum.phone_number);
      }
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientsApi.getAll();
      setClients(response.data || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleDialPadClick = (digit) => {
    // Allow up to 15 digits (international numbers)
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 15) {
      setPhoneNumber(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneNumber('');
  };

  const handlePhoneInputChange = (e) => {
    // Allow editing - only keep valid characters
    const value = e.target.value;
    // Allow digits, spaces, dashes, parentheses, and plus sign
    const sanitized = value.replace(/[^\d\s\-()+ ]/g, '');
    setPhoneNumber(sanitized);
  };

  const handleCall = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!selectedFromNumber) {
      toast.error('Please select a "Calling From" number');
      return;
    }

    const standardizedNumber = standardizePhoneNumber(phoneNumber);
    
    if (standardizedNumber.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setCallStatus('calling');

    try {
      const response = await callsApi.initiate(standardizedNumber, selectedFromNumber);
      setActiveCallId(response.data.call_id);
      
      if (response.data.status === 'mock_initiated') {
        toast.info('Call simulated (Twilio not configured)');
        setCallStatus('connected');
      } else {
        toast.success('Call initiated');
        setCallStatus('connected');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate call');
      setCallStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (activeCallId) {
      try {
        await callsApi.end(activeCallId);
        toast.info('Call ended');
      } catch (error) {
        console.error('Failed to end call:', error);
      }
    }
    setCallStatus(null);
    setActiveCallId(null);
  };

  const handleSelectContact = (client) => {
    // Standardize the phone number when selecting a contact
    setPhoneNumber(standardizePhoneNumber(client.phone));
    setSearchQuery('');
    setActiveTab('dialpad');
  };

  // Filter clients for contacts tab
  const filteredClients = searchQuery 
    ? clients.filter(client => 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery)
      ).slice(0, 10)
    : clients.slice(0, 20);

  const dialPadButtons = [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { digit: '*', letters: '' },
    { digit: '0', letters: '+' },
    { digit: '#', letters: '' },
  ];

  return (
    <>
      {/* Floating Phone Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700 z-40"
        data-testid="phone-dialer-btn"
      >
        <Phone className="h-6 w-6" />
      </Button>

      {/* Dialer Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm max-h-[90vh] flex flex-col">
            <CardHeader className="pb-2 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-green-600" />
                Phone Dialer
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 overflow-hidden flex flex-col">
              {/* Calling From Selection */}
              <div className="space-y-1 shrink-0">
                <label className="text-xs font-medium text-muted-foreground">Calling From</label>
                <Select value={selectedFromNumber} onValueChange={setSelectedFromNumber}>
                  <SelectTrigger data-testid="from-number-select" className="h-9">
                    <SelectValue placeholder="Select your number" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownedNumbers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No phone numbers configured
                      </SelectItem>
                    ) : (
                      ownedNumbers.map((num) => (
                        <SelectItem key={num.id} value={num.phone_number}>
                          {formatPhoneDisplay(num.phone_number)} {num.is_default && '(Default)'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {ownedNumbers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Go to Settings → Phone Numbers to add a number
                  </p>
                )}
              </div>

              {/* Phone Number Display/Input */}
              <div className="bg-muted/50 rounded-lg p-3 text-center shrink-0">
                {callStatus === 'calling' ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Calling...</p>
                    <p className="text-xl font-mono">{formatPhoneDisplay(phoneNumber)}</p>
                    <div className="flex justify-center">
                      <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                ) : callStatus === 'connected' ? (
                  <div className="space-y-1">
                    <Badge className="bg-green-100 text-green-700">Connected</Badge>
                    <p className="text-xl font-mono">{formatPhoneDisplay(phoneNumber)}</p>
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>00:00</span>
                    </div>
                  </div>
                ) : (
                  <Input
                    value={phoneNumber}
                    onChange={handlePhoneInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="text-center text-xl font-mono bg-transparent border-none h-auto py-2 focus-visible:ring-0"
                    data-testid="phone-number-input"
                  />
                )}
              </div>

              {/* Tabs for Dialpad and Contacts */}
              {!callStatus && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="grid w-full grid-cols-2 shrink-0">
                    <TabsTrigger value="dialpad">
                      <Phone className="h-4 w-4 mr-1" />
                      Dialpad
                    </TabsTrigger>
                    <TabsTrigger value="contacts">
                      <Users className="h-4 w-4 mr-1" />
                      Contacts
                    </TabsTrigger>
                  </TabsList>

                  {/* Dialpad Tab */}
                  <TabsContent value="dialpad" className="mt-2 shrink-0">
                    <div className="grid grid-cols-3 gap-2">
                      {dialPadButtons.map(({ digit, letters }) => (
                        <Button
                          key={digit}
                          variant="outline"
                          className="h-12 flex flex-col items-center justify-center"
                          onClick={() => handleDialPadClick(digit)}
                          data-testid={`dial-${digit}`}
                        >
                          <span className="text-lg font-semibold">{digit}</span>
                          {letters && <span className="text-[9px] text-muted-foreground">{letters}</span>}
                        </Button>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Contacts Tab */}
                  <TabsContent value="contacts" className="mt-2 flex-1 flex flex-col min-h-0">
                    <div className="relative mb-2 shrink-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search contacts..."
                        className="pl-10 text-sm h-9"
                        data-testid="contact-search-input"
                      />
                    </div>
                    <ScrollArea className="flex-1 border rounded-lg">
                      {filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No contacts found
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectContact(client)}
                            className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-2 text-sm border-b last:border-b-0"
                            data-testid={`quick-contact-${client.id}`}
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{client.name}</p>
                              <p className="text-xs text-muted-foreground">{formatPhoneDisplay(client.phone)}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 shrink-0 pt-2">
                {callStatus ? (
                  <Button
                    onClick={handleEndCall}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    data-testid="end-call-btn"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Call
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleBackspace}
                      disabled={!phoneNumber}
                      data-testid="backspace-btn"
                    >
                      <Delete className="h-4 w-4" />
                    </Button>
                    <Button
                      className="flex-[2] bg-green-600 hover:bg-green-700"
                      onClick={handleCall}
                      disabled={!phoneNumber || !selectedFromNumber || loading}
                      data-testid="call-btn"
                    >
                      {loading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <Phone className="h-4 w-4 mr-2" />
                      )}
                      Call
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default PhoneDialer;
