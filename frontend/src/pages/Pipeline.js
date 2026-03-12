import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  DollarSign,
  MessageSquare,
  MoreHorizontal,
  Plus,
  GripVertical,
  ArrowRight,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';
import { clientsApi } from '../lib/api';
import { toast } from 'sonner';

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: 'new_lead', name: 'New Lead', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  { id: 'interested', name: 'Interested', color: 'bg-cyan-500', textColor: 'text-cyan-700', bgLight: 'bg-cyan-50' },
  { id: 'application_sent', name: 'Application Sent', color: 'bg-indigo-500', textColor: 'text-indigo-700', bgLight: 'bg-indigo-50' },
  { id: 'docs_submitted', name: 'Docs Submitted', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  { id: 'approved', name: 'Approved', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
  { id: 'funded', name: 'Closed', color: 'bg-green-600', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  { id: 'dead', name: 'Dead', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  { id: 'future', name: 'Future', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
];

// Map pipeline stages to tag values for syncing
const STAGE_TO_TAG = {
  'new_lead': 'New Lead',
  'interested': 'Interested',
  'application_sent': 'Application Sent',
  'docs_submitted': 'Docs Submitted',
  'approved': 'Approved',
  'funded': 'Closed',
  'dead': 'Dead',
  'future': 'Future',
};

const getStageColor = (stageId) => {
  const stage = PIPELINE_STAGES.find(s => s.id === stageId);
  return stage ? stage.color : 'bg-gray-500';
};

const getStageName = (stageId) => {
  const stage = PIPELINE_STAGES.find(s => s.id === stageId);
  return stage ? stage.name : stageId;
};

const Pipeline = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientDialog, setShowClientDialog] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.getAll();
      setClients(response.data);
    } catch (error) {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  // Group clients by pipeline stage
  const getClientsByStage = (stageId) => {
    return clients.filter(client => {
      const clientStage = client.pipeline_stage || 'new_lead';
      return clientStage === stageId;
    }).filter(client => 
      search === '' || 
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.includes(search)
    );
  };

  // Calculate stage totals
  const getStageTotals = (stageId) => {
    const stageClients = getClientsByStage(stageId);
    const totalBalance = stageClients.reduce((sum, c) => sum + (c.balance || 0), 0);
    return { count: stageClients.length, total: totalBalance };
  };

  // Handle drag end
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside
    if (!destination) return;

    // Same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Find the client
    const client = clients.find(c => c.id === draggableId);
    if (!client) return;

    const newStage = destination.droppableId;
    const oldStage = source.droppableId;

    // Map stages to tags
    const STAGE_TO_TAG = {
      'new_lead': 'New Lead',
      'interested': 'Interested',
      'application_sent': 'Application Sent',
      'docs_submitted': 'Docs Submitted',
      'approved': 'Approved',
      'funded': 'Closed',
      'dead': 'Dead',
      'future': 'Future',
    };

    // Update tags - remove old stage tags and add new one
    const stageTagValues = Object.values(STAGE_TO_TAG);
    const currentTags = client.tags || [];
    const updatedTags = currentTags.filter(t => !stageTagValues.includes(t));
    updatedTags.push(STAGE_TO_TAG[newStage] || newStage);

    // Optimistic update - update both pipeline_stage and tags
    setClients(prev => prev.map(c => 
      c.id === draggableId ? { ...c, pipeline_stage: newStage, tags: updatedTags } : c
    ));

    try {
      await clientsApi.updatePipeline(draggableId, newStage);
      toast.success(`${client.name} moved to ${getStageName(newStage)}`);
    } catch (error) {
      // Revert on error
      setClients(prev => prev.map(c => 
        c.id === draggableId ? { ...c, pipeline_stage: oldStage, tags: currentTags } : c
      ));
      toast.error('Failed to update pipeline stage');
    }
  };

  const handleClientClick = (client) => {
    setSelectedClient(client);
    setShowClientDialog(true);
  };

  // Calculate overall stats
  const totalDeals = clients.length;
  const totalValue = clients.reduce((sum, c) => sum + (c.balance || 0), 0);
  const closedDeals = clients.filter(c => c.pipeline_stage === 'funded').length;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="pipeline-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit']">Deal Pipeline</h1>
            <p className="text-muted-foreground mt-1">Drag and drop leads through your sales pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-pipeline-input"
              />
            </div>
            <Link to="/clients">
              <Button data-testid="add-deal-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Deal
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDeals}</p>
                  <p className="text-sm text-muted-foreground">Total Deals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{fundedDeals}</p>
                  <p className="text-sm text-muted-foreground">Funded Deals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDeals > 0 ? Math.round((fundedDeals / totalDeals) * 100) : 0}%</p>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Board */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading pipeline...</p>
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map((stage) => {
                const { count, total } = getStageTotals(stage.id);
                const stageClients = getClientsByStage(stage.id);
                
                return (
                  <div key={stage.id} className="flex-shrink-0 w-72">
                    <Card className="h-full">
                      <CardHeader className={`pb-3 ${stage.bgLight} rounded-t-lg`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                            <CardTitle className={`text-sm font-semibold ${stage.textColor}`}>
                              {stage.name}
                            </CardTitle>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                        {total > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ${total.toLocaleString()} total
                          </p>
                        )}
                      </CardHeader>
                      <Droppable droppableId={stage.id}>
                        {(provided, snapshot) => (
                          <CardContent 
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-2 min-h-[400px] transition-colors ${
                              snapshot.isDraggingOver ? 'bg-secondary/50' : ''
                            }`}
                          >
                            <div className="space-y-2">
                              {stageClients.map((client, index) => (
                                <Draggable 
                                  key={client.id} 
                                  draggableId={client.id} 
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`
                                        bg-white rounded-lg border p-3 cursor-pointer
                                        hover:shadow-md transition-all
                                        ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''}
                                      `}
                                      onClick={() => handleClientClick(client)}
                                      data-testid={`deal-card-${client.id}`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div 
                                            {...provided.dragHandleProps}
                                            className="cursor-grab active:cursor-grabbing"
                                          >
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-primary font-medium text-xs">
                                              {client.name.charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      
                                      <h4 className="font-medium text-sm mb-1 line-clamp-1">
                                        {client.name}
                                      </h4>
                                      
                                      {client.company && (
                                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                          {client.company}
                                        </p>
                                      )}
                                      
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {client.phone.slice(-4)}
                                        </span>
                                        {client.balance > 0 && (
                                          <Badge variant="outline" className="text-xs font-semibold text-primary">
                                            ${client.balance.toLocaleString()}
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      {client.tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {client.tags.slice(0, 2).map((tag) => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              
                              {stageClients.length === 0 && !snapshot.isDraggingOver && (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p className="text-xs">No deals</p>
                                  <p className="text-xs">Drag here to add</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Droppable>
                    </Card>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* Client Quick View Dialog */}
        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">
                {selectedClient?.name}
              </DialogTitle>
              <DialogDescription>
                Quick view • {getStageName(selectedClient?.pipeline_stage || 'new_lead')}
              </DialogDescription>
            </DialogHeader>
            {selectedClient && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedClient.phone}</span>
                  </div>
                  {selectedClient.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{selectedClient.email}</span>
                    </div>
                  )}
                </div>
                
                {selectedClient.balance > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-lg font-bold text-primary">
                        ${selectedClient.balance.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Deal Value</p>
                    </div>
                  </div>
                )}
                
                {selectedClient.notes && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm">{selectedClient.notes}</p>
                  </div>
                )}
                
                {selectedClient.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedClient.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Link to={`/clients/${selectedClient?.id}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  View Profile
                </Button>
              </Link>
              <Link to={`/contacts`} className="flex-1">
                <Button className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Pipeline;
