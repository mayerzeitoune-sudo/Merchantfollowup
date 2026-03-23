import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  Phone,
  Trash2,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Star,
  MapPin,
  User,
  Users,
  Edit
} from 'lucide-react';
import { phoneNumbersApi, teamApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

// US State to Area Codes mapping
const STATE_AREA_CODES = {
  'Alabama': ['205', '251', '256', '334', '938'],
  'Alaska': ['907'],
  'Arizona': ['480', '520', '602', '623', '928'],
  'Arkansas': ['479', '501', '870'],
  'California': ['209', '213', '310', '323', '408', '415', '424', '510', '530', '559', '562', '619', '626', '650', '657', '661', '669', '707', '714', '747', '760', '805', '818', '831', '858', '909', '916', '925', '949', '951'],
  'Colorado': ['303', '719', '720', '970'],
  'Connecticut': ['203', '475', '860', '959'],
  'Delaware': ['302'],
  'Florida': ['239', '305', '321', '352', '386', '407', '561', '727', '754', '772', '786', '813', '850', '863', '904', '941', '954'],
  'Georgia': ['229', '404', '470', '478', '678', '706', '762', '770', '912'],
  'Hawaii': ['808'],
  'Idaho': ['208', '986'],
  'Illinois': ['217', '224', '309', '312', '331', '618', '630', '708', '773', '779', '815', '847', '872'],
  'Indiana': ['219', '260', '317', '463', '574', '765', '812', '930'],
  'Iowa': ['319', '515', '563', '641', '712'],
  'Kansas': ['316', '620', '785', '913'],
  'Kentucky': ['270', '364', '502', '606', '859'],
  'Louisiana': ['225', '318', '337', '504', '985'],
  'Maine': ['207'],
  'Maryland': ['240', '301', '410', '443', '667'],
  'Massachusetts': ['339', '351', '413', '508', '617', '774', '781', '857', '978'],
  'Michigan': ['231', '248', '269', '313', '517', '586', '616', '734', '810', '906', '947', '989'],
  'Minnesota': ['218', '320', '507', '612', '651', '763', '952'],
  'Mississippi': ['228', '601', '662', '769'],
  'Missouri': ['314', '417', '573', '636', '660', '816'],
  'Montana': ['406'],
  'Nebraska': ['308', '402', '531'],
  'Nevada': ['702', '725', '775'],
  'New Hampshire': ['603'],
  'New Jersey': ['201', '551', '609', '732', '848', '856', '862', '908', '973'],
  'New Mexico': ['505', '575'],
  'New York': ['212', '315', '332', '347', '516', '518', '585', '607', '631', '646', '680', '716', '718', '845', '914', '917', '929', '934'],
  'North Carolina': ['252', '336', '704', '743', '828', '910', '919', '980', '984'],
  'North Dakota': ['701'],
  'Ohio': ['216', '220', '234', '330', '380', '419', '440', '513', '567', '614', '740', '937'],
  'Oklahoma': ['405', '539', '580', '918'],
  'Oregon': ['458', '503', '541', '971'],
  'Pennsylvania': ['215', '223', '267', '272', '412', '484', '570', '610', '717', '724', '814', '878'],
  'Rhode Island': ['401'],
  'South Carolina': ['803', '843', '854', '864'],
  'South Dakota': ['605'],
  'Tennessee': ['423', '615', '629', '731', '865', '901', '931'],
  'Texas': ['210', '214', '254', '281', '325', '346', '361', '409', '430', '432', '469', '512', '682', '713', '726', '737', '806', '817', '830', '832', '903', '915', '936', '940', '956', '972', '979'],
  'Utah': ['385', '435', '801'],
  'Vermont': ['802'],
  'Virginia': ['276', '434', '540', '571', '703', '757', '804'],
  'Washington': ['206', '253', '360', '425', '509', '564'],
  'West Virginia': ['304', '681'],
  'Wisconsin': ['262', '414', '534', '608', '715', '920'],
  'Wyoming': ['307'],
  'Washington DC': ['202']
};

const PhoneNumbers = () => {
  const { user } = useAuth();
  const [ownedNumbers, setOwnedNumbers] = useState([]);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [numberToDelete, setNumberToDelete] = useState(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [defaultNumber, setDefaultNumber] = useState(null);
  
  // Agent assignment
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [numberToAssign, setNumberToAssign] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  
  const isAdmin = user?.role === 'admin' || user?.role === 'org_admin';

  useEffect(() => {
    fetchOwnedNumbers();
    if (isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin]);

  const fetchTeamMembers = async () => {
    try {
      const response = await teamApi.getMembers();
      setTeamMembers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  // When state is selected, show the area codes for that state
  const handleStateChange = (state) => {
    setSelectedState(state);
    const codes = STATE_AREA_CODES[state];
    if (codes && codes.length === 1) {
      setAreaCode(codes[0]);
    } else {
      setAreaCode('');
    }
  };

  const fetchOwnedNumbers = async () => {
    try {
      const response = await phoneNumbersApi.getOwned();
      setOwnedNumbers(response.data);
      const defaultNum = response.data.find(n => n.is_default);
      setDefaultNumber(defaultNum?.id || (response.data.length > 0 ? response.data[0].id : null));
    } catch (error) {
      toast.error('Failed to fetch phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (numberId) => {
    try {
      await phoneNumbersApi.setDefault(numberId);
      setDefaultNumber(numberId);
      setOwnedNumbers(prev => prev.map(n => ({
        ...n,
        is_default: n.id === numberId
      })));
      toast.success('Default phone number updated');
    } catch (error) {
      toast.error('Failed to set default number');
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

  const handleAssignAgent = async () => {
    if (!numberToAssign) return;
    
    try {
      await phoneNumbersApi.update(numberToAssign.id, {
        assigned_user_id: selectedAgentId || null
      });
      toast.success(selectedAgentId ? 'Agent assigned to phone number' : 'Agent unassigned from phone number');
      setAssignDialogOpen(false);
      setNumberToAssign(null);
      setSelectedAgentId('');
      fetchOwnedNumbers();
    } catch (error) {
      toast.error('Failed to assign agent');
    }
  };

  const openAssignDialog = (number) => {
    setNumberToAssign(number);
    setSelectedAgentId(number.assigned_user_id || '');
    setAssignDialogOpen(true);
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

  // Get area codes for selected state
  const stateAreaCodes = selectedState ? STATE_AREA_CODES[selectedState] || [] : [];

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
              Search by state or enter an area code directly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* State Selection */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Search by State
                  </Label>
                  <Select value={selectedState} onValueChange={handleStateChange}>
                    <SelectTrigger data-testid="state-select">
                      <SelectValue placeholder="Select a state..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-64">
                        {Object.keys(STATE_AREA_CODES).sort().map(state => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Area Code Selection (when state is selected) */}
                {selectedState && stateAreaCodes.length > 1 && (
                  <div className="flex-1 space-y-2">
                    <Label>Select Area Code</Label>
                    <Select value={areaCode} onValueChange={setAreaCode}>
                      <SelectTrigger data-testid="area-code-select">
                        <SelectValue placeholder="Select area code..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stateAreaCodes.map(code => (
                          <SelectItem key={code} value={code}>
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Or enter manually */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-muted" />
                <span className="text-xs text-muted-foreground">or enter manually</span>
                <div className="flex-1 border-t border-muted" />
              </div>

              <div className="flex gap-4 items-end">
                <div className="flex-1 max-w-xs space-y-2">
                  <Label>Area Code</Label>
                  <Input
                    placeholder="e.g., 415, 212, 310"
                    value={areaCode}
                    onChange={(e) => {
                      setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3));
                      setSelectedState('');
                    }}
                    maxLength={3}
                    data-testid="area-code-input"
                  />
                </div>
                <Button onClick={handleSearch} disabled={searching} data-testid="search-numbers-btn">
                  <Search className="h-4 w-4 mr-2" />
                  {searching ? 'Searching...' : 'Search Available'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Numbers Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Available Phone Numbers</DialogTitle>
              <DialogDescription>
                {selectedState && `Numbers in ${selectedState} (${areaCode})`}
                {!selectedState && `Numbers with area code ${areaCode}`}
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
                      className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${selectedNumbers.includes(number.id) ? 'border-primary bg-primary/5' : ''} ${number.id === defaultNumber ? 'ring-2 ring-orange-500' : ''}`}
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
                        <div className="flex flex-col items-end gap-1">
                          {number.id === defaultNumber && (
                            <Badge className="bg-orange-100 text-orange-700">
                              <Star className="h-3 w-3 mr-1 fill-orange-500" />
                              Default
                            </Badge>
                          )}
                          {number.is_active && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">SMS</Badge>
                          <Badge variant="outline" className="text-xs">Voice</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {number.id !== defaultNumber && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefault(number.id)}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Set Default
                            </Button>
                          )}
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
