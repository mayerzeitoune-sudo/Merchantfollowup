import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Gift, 
  Wine,
  Cake,
  Calendar,
  ShoppingBag,
  Clock,
  CheckCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { giftsApi, clientsApi } from '../lib/api';
import { toast } from 'sonner';

const GiftStore = () => {
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Order dialog state
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderForm, setOrderForm] = useState({
    client_id: '',
    occasion: '',
    delivery_date: '',
    message: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catalogRes, categoriesRes, ordersRes, eventsRes, clientsRes] = await Promise.all([
        giftsApi.getCatalog(),
        giftsApi.getCategories(),
        giftsApi.getOrders(),
        giftsApi.getUpcomingEvents(),
        clientsApi.getAll()
      ]);
      setCatalog(catalogRes.data.products);
      setCategories(categoriesRes.data.categories);
      setOrders(ordersRes.data);
      setUpcomingEvents(eventsRes.data.upcoming_events);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Failed to load gift store');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setIsOrderDialogOpen(true);
  };

  const handleCreateOrder = async () => {
    if (!orderForm.client_id || !orderForm.occasion || !orderForm.delivery_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await giftsApi.createOrder({
        ...orderForm,
        product_id: selectedProduct.id
      });
      toast.success('Gift order created!');
      setIsOrderDialogOpen(false);
      setSelectedProduct(null);
      setOrderForm({ client_id: '', occasion: '', delivery_date: '', message: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to create order');
    }
  };

  const filteredCatalog = selectedCategory === 'all' 
    ? catalog 
    : catalog.filter(p => p.category === selectedCategory);

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'wine': return Wine;
      case 'spirits': return Wine;
      case 'baskets': return Gift;
      case 'flowers': return Sparkles;
      case 'gift_cards': return ShoppingBag;
      default: return Gift;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="gift-store-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Gift Store</h1>
            <p className="text-muted-foreground mt-1">Send gifts to your merchants for special occasions</p>
          </div>
        </div>

        <Tabs defaultValue="store" className="space-y-6">
          <TabsList>
            <TabsTrigger value="store">Browse Gifts</TabsTrigger>
            <TabsTrigger value="orders">My Orders</TabsTrigger>
            <TabsTrigger value="events">Upcoming Events</TabsTrigger>
          </TabsList>

          {/* Gift Store Tab */}
          <TabsContent value="store" className="space-y-6">
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All Gifts
              </Button>
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat.id);
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="whitespace-nowrap"
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {cat.name}
                  </Button>
                );
              })}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading ? (
                <p className="col-span-full text-center py-12 text-muted-foreground">Loading...</p>
              ) : filteredCatalog.length === 0 ? (
                <p className="col-span-full text-center py-12 text-muted-foreground">No products found</p>
              ) : (
                filteredCatalog.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div 
                      className="aspect-square bg-cover bg-center"
                      style={{ backgroundImage: `url(${product.image_url})` }}
                    />
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-lg font-bold text-primary">
                          ${product.price.toFixed(2)}
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => handleSelectProduct(product)}
                          data-testid={`select-gift-${product.id}`}
                        >
                          <Gift className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No gift orders yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Gift className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{order.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              For: {order.client_name} • {order.occasion}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {order.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            Delivery: {new Date(order.delivery_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Upcoming Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Cake className="h-5 w-5 text-purple-600" />
                  <CardTitle className="font-['Outfit']">Upcoming Birthdays & Events</CardTitle>
                </div>
                <CardDescription>
                  Don't miss these opportunities to send a gift!
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming events</p>
                    <p className="text-sm">Add birthdays and events to your client profiles</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-white border hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            event.event_type === 'birthday' ? 'bg-pink-100' : 'bg-blue-100'
                          }`}>
                            {event.event_type === 'birthday' 
                              ? <Cake className="h-5 w-5 text-pink-600" />
                              : <Calendar className="h-5 w-5 text-blue-600" />
                            }
                          </div>
                          <div>
                            <p className="font-medium">{event.client_name}</p>
                            <p className="text-sm text-muted-foreground">{event.event_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {event.days_until === 0 ? 'Today!' : 
                               event.days_until === 1 ? 'Tomorrow' : 
                               `In ${event.days_until} days`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.event_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Gift className="h-4 w-4 mr-1" />
                            Send Gift
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Dialog */}
        <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Send Gift</DialogTitle>
              <DialogDescription>
                {selectedProduct?.name} - ${selectedProduct?.price.toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Recipient Client *</Label>
                <Select
                  value={orderForm.client_id}
                  onValueChange={(value) => setOrderForm({ ...orderForm, client_id: value })}
                >
                  <SelectTrigger data-testid="gift-client-select">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Occasion *</Label>
                <Select
                  value={orderForm.occasion}
                  onValueChange={(value) => setOrderForm({ ...orderForm, occasion: value })}
                >
                  <SelectTrigger data-testid="gift-occasion-select">
                    <SelectValue placeholder="Select occasion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="thank_you">Thank You</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="congratulations">Congratulations</SelectItem>
                    <SelectItem value="get_well">Get Well</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Delivery Date *</Label>
                <Input
                  type="date"
                  value={orderForm.delivery_date}
                  onChange={(e) => setOrderForm({ ...orderForm, delivery_date: e.target.value })}
                  data-testid="gift-delivery-date"
                />
              </div>

              <div className="space-y-2">
                <Label>Personal Message</Label>
                <Textarea
                  placeholder="Add a personal message to include with the gift..."
                  value={orderForm.message}
                  onChange={(e) => setOrderForm({ ...orderForm, message: e.target.value })}
                  rows={3}
                  data-testid="gift-message-input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsOrderDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCreateOrder} data-testid="confirm-gift-order-btn">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GiftStore;
