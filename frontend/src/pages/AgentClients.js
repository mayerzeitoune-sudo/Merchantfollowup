import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  ArrowLeft, 
  User, 
  Search,
  Phone,
  Mail,
  MessageSquare,
  Eye
} from 'lucide-react';
import { teamApi } from '../lib/api';
import { toast } from 'sonner';

const AgentClients = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [agentId]);

  const fetchData = async () => {
    try {
      const clientsRes = await teamApi.getAgentClients(agentId);
      setClients(clientsRes.data || []);
      
      // Get agent info from team members
      const membersRes = await teamApi.getMembers();
      const agentInfo = membersRes.data?.find(m => m.id === agentId);
      setAgent(agentInfo);
    } catch (error) {
      toast.error('Failed to load agent clients');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.phone?.includes(query) ||
      client.email?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="agent-clients-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-['Outfit']">
              {agent?.name || 'Agent'}'s Clients
            </h1>
            <p className="text-muted-foreground">{agent?.email}</p>
          </div>
          <Badge variant="outline">{clients.length} clients</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No clients match your search' : 'No clients found for this agent'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {client.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        {client.company && (
                          <p className="text-xs text-muted-foreground">{client.company}</p>
                        )}
                      </div>
                    </div>
                    {client.tags?.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {client.tags[0]}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/contacts?client=${client.id}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AgentClients;
