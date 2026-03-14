import React, { useState, useEffect } from 'react';
import { Phone, X, Delete, User, Search, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { clientsApi } from '../lib/api';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PhoneDialer = () => {
  const [open, setOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [selectedFromNumber, setSelectedFromNumber] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [calling, setCalling] = useState(false);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    if (open) {
      fetchPhoneNumbers();
      fetchClients();
    }
  }, [open]);

  const fetchPhoneNumbers = async () => {
    try {
      const res = await axios.get(`${API}/phone-numbers`);
      setPhoneNumbers(res.data || []);
      if (res.data?.length > 0) {
        setSelectedFromNumber(res.data[0].phone_number);
      }
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await clientsApi.getAll();
      setClients(res.data || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleDigit = (digit) => {
    setDialNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setDialNumber(prev => prev.slice(0, -1));
  };

  const handleCall = async () => {
    if (!dialNumber) {
      toast.error('Please enter a number to call');
      return;
    }
    if (!selectedFromNumber) {
      toast.error('Please select a number to call from');
      return;
    }

    setCalling(true);
    try {
      const res = await axios.post(`${API}/calls/initiate`, {
        to: dialNumber,
        from: selectedFromNumber
      });
      
      setActiveCall({
        to: dialNumber,
        from: selectedFromNumber,
        status: 'calling',
        id: res.data?.call_id
      });
      
      toast.success(`Calling ${dialNumber}...`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate call');
    } finally {
      setCalling(false);
    }
  };

  const handleEndCall = async () => {
    if (activeCall?.id) {
      try {
        await axios.post(`${API}/calls/${activeCall.id}/end`);
      } catch (error) {
        console.error('Failed to end call:', error);
      }
    }
    setActiveCall(null);
    toast.info('Call ended');
  };

  const handleQuickCall = (client) => {
    if (client.phone) {
      setDialNumber(client.phone);
    }
  };

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.phone?.includes(query)
    );
  }).slice(0, 5);

  const dialPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <>
      {/* Floating Phone Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-110"
        data-testid="phone-dialer-btn"
      >
        <Phone className="h-6 w-6" />
      </button>

      {/* Dialer Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500" />
              Phone Dialer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Active Call Display */}
            {activeCall && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-700">Active Call</p>
                    <p className="text-sm text-green-600">To: {activeCall.to}</p>
                    <p className="text-xs text-green-500">From: {activeCall.from}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleEndCall}
                  >
                    End Call
                  </Button>
                </div>
              </div>
            )}

            {/* From Number Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Calling From:</label>
              <Select value={selectedFromNumber} onValueChange={setSelectedFromNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phone number" />
                </SelectTrigger>
                <SelectContent>
                  {phoneNumbers.length === 0 ? (
                    <SelectItem value="none" disabled>No numbers available</SelectItem>
                  ) : (
                    phoneNumbers.map((num) => (
                      <SelectItem key={num.id || num.phone_number} value={num.phone_number}>
                        {num.phone_number} {num.label && `(${num.label})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedFromNumber && (
                <Badge variant="outline" className="text-xs">
                  Using: {selectedFromNumber}
                </Badge>
              )}
            </div>

            {/* Number Display */}
            <div className="relative">
              <Input
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                placeholder="Enter number..."
                className="text-2xl text-center font-mono h-14 pr-10"
              />
              {dialNumber && (
                <button
                  onClick={handleBackspace}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Delete className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Dial Pad */}
            <div className="grid grid-cols-3 gap-2">
              {dialPad.map((row, rowIndex) => (
                row.map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleDigit(digit)}
                    className="h-14 text-xl font-semibold rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {digit}
                  </button>
                ))
              ))}
            </div>

            {/* Call Button */}
            <Button
              onClick={handleCall}
              disabled={!dialNumber || calling || activeCall}
              className="w-full h-12 bg-green-500 hover:bg-green-600 text-white"
            >
              <Phone className="h-5 w-5 mr-2" />
              {calling ? 'Connecting...' : 'Call'}
            </Button>

            {/* Quick Contacts */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Quick Contacts</span>
              </div>
              
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleQuickCall(client)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.phone || 'No phone'}</p>
                    </div>
                    {client.phone && (
                      <Phone className="h-4 w-4 text-green-500" />
                    )}
                  </button>
                ))}
                {filteredClients.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    No clients found
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhoneDialer;
