import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  Phone,
  Trash2,
  ShoppingCart,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { phoneNumbersApi } from '../lib/api';
import { toast } from 'sonner';

const PhoneNumbers = () => {
  const [ownedNumbers, setOwnedNumbers] = useState([]);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [numberToDelete, setNumberToDelete] = useState(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchOwnedNumbers();
  }, []);

  const fetchOwnedNumbers = async () => {
    try {
      const response = await phoneNumbersApi.getOwned();
      setOwnedNumbers(response.data);
    } catch (error) {
      toast.error('Failed to fetch phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!areaCode || areaCode.length !== 3) {
      toast.error('Please enter a valid 3-digit area code');
      return;
    }
    
    setSearching(true);
    try {
      const response = await phoneNumbersApi.searchAvailable(areaCode);
      setAvailableNumbers(response.data.available_numbers);
      setProviderConfigured(response.data.provider_configured);
      setIsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to search numbers');
    } finally {
      setSearching(false);
    }
  };

  const handlePurchase = async (number) => {
    try {
      await phoneNumbersApi.purchase({
        phone_number: number.phone_number,
        friendly_name: number.friendly_name,
        provider: 'twilio'
      });
      toast.success('Phone number added successfully!');
      setIsDialogOpen(false);
      fetchOwnedNumbers();
    } catch (error) {
      toast.error('Failed to add number');
    }
  };

  const handleRelease = async (id) => {
    try {
      await phoneNumbersApi.release(id);
      toast.success('Phone number released');
      setDeleteDialogOpen(false);
      setNumberToDelete(null);
      fetchOwnedNumbers();
    } catch (error) {
      toast.error('Failed to release number');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedNumbers.map(id => phoneNumbersApi.release(id)));
      toast.success(`${selectedNumbers.length} phone number(s) released`);
      setBulkDeleteDialogOpen(false);
      setSelectedNumbers([]);
      fetchOwnedNumbers();
    } catch (error) {
      toast.error('Failed to release some numbers');
    }
  };

  const toggleSelectNumber = (numberId) => {
    setSelectedNumbers(prev => 
      prev.includes(numberId) 
        ? prev.filter(id => id !== numberId)
        : [...prev, numberId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNumbers.length === ownedNumbers.length) {
      setSelectedNumbers([]);
    } else {
      setSelectedNumbers(ownedNumbers.map(n => n.id));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="phone-numbers-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Phone Numbers</h1>
            <p className="text-muted-foreground mt-1">Manage your SMS and voice phone numbers</p>
          </div>
        </div>

        {/* Search for Numbers */}
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardHeader>
            <CardTitle className="font-['Outfit'] flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Buy New Phone Numbers
            </CardTitle>
            <CardDescription>
              Search for available phone numbers by area code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-xs space-y-2">
                <Label>Area Code</Label>
                <Input
                  placeholder="e.g., 415, 212, 310"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  maxLength={3}
                  data-testid="area-code-input"
                />
              </div>
              <Button onClick={handleSearch} disabled={searching} data-testid="search-numbers-btn">
                <Search className="h-4 w-4 mr-2" />
                {searching ? 'Searching...' : 'Search Available'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Numbers Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Available Phone Numbers</DialogTitle>
              <DialogDescription>
                Select a number to add to your account
              </DialogDescription>
            </DialogHeader>
            
            {!providerConfigured && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">SMS Provider Not Configured</p>
                  <p className="text-sm text-yellow-700">
                    Configure Twilio or another provider in Settings to purchase real phone numbers.
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-2 mt-4">
              {availableNumbers.map((number, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{number.friendly_name}</p>
                      <p className="text-sm text-muted-foreground">{number.phone_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-primary">
                      ${number.monthly_cost}/mo
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => handlePurchase(number)}
                      data-testid={`buy-number-${index}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Owned Numbers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-['Outfit']">Your Phone Numbers</CardTitle>
                <CardDescription>
                  Phone numbers you own for SMS and voice
                </CardDescription>
              </div>
              {selectedNumbers.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedNumbers.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : ownedNumbers.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">No phone numbers yet</p>
                <p className="text-sm text-muted-foreground">
                  Search for available numbers above to get started
                </p>
              </div>
            ) : (
              <>
                {/* Select All */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                  <Checkbox
                    checked={selectedNumbers.length === ownedNumbers.length && ownedNumbers.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    Select All ({ownedNumbers.length})
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownedNumbers.map((number) => (
                    <div 
                      key={number.id}
                      className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${selectedNumbers.includes(number.id) ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedNumbers.includes(number.id)}
                            onCheckedChange={() => toggleSelectNumber(number.id)}
                          />
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Phone className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{number.friendly_name || number.phone_number}</p>
                            <p className="text-sm text-muted-foreground">{number.phone_number}</p>
                          </div>
                        </div>
                        {number.is_active && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">SMS</Badge>
                          <Badge variant="outline" className="text-xs">Voice</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setNumberToDelete(number);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Provider: {number.provider} • ${number.monthly_cost}/mo
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Single Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Release Phone Number</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to release <strong>{numberToDelete?.phone_number}</strong>? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setNumberToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleRelease(numberToDelete?.id)} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Release
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Release {selectedNumbers.length} Phone Number(s)</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to release {selectedNumbers.length} phone number(s)? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleBulkDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Release {selectedNumbers.length} Number(s)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default PhoneNumbers;
