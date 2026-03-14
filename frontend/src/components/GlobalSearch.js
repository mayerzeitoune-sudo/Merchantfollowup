import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, MessageSquare, DollarSign, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { searchApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const res = await searchApi.search(query);
          setResults(res.data);
          setOpen(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults(null);
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSelect = (type, item) => {
    setOpen(false);
    setQuery('');
    if (type === 'client') {
      navigate(`/clients/${item.id}`);
    } else if (type === 'deal') {
      navigate(`/pipeline`);
    }
  };

  const totalResults = results 
    ? (results.clients?.length || 0) + (results.messages?.length || 0) + (results.deals?.length || 0)
    : 0;

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search clients, messages, deals..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 w-64 lg:w-80"
          data-testid="global-search-input"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {query && !loading && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={() => { setQuery(''); setResults(null); setOpen(false); }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {open && results && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {totalResults === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="p-2">
              {/* Clients */}
              {results.clients?.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                    Clients ({results.clients.length})
                  </div>
                  {results.clients.map((client) => (
                    <button
                      key={client.id}
                      className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md text-left"
                      onClick={() => handleSelect('client', client)}
                    >
                      <User className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium text-sm">{client.name}</div>
                        <div className="text-xs text-muted-foreground">{client.email || client.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Messages */}
              {results.messages?.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                    Messages ({results.messages.length})
                  </div>
                  {results.messages.slice(0, 5).map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded-md"
                    >
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{msg.message}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Deals */}
              {results.deals?.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                    Deals ({results.deals.length})
                  </div>
                  {results.deals.map((deal) => (
                    <button
                      key={deal.id}
                      className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md text-left"
                      onClick={() => handleSelect('deal', deal)}
                    >
                      <DollarSign className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-medium text-sm">{deal.business_name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${deal.amount?.toLocaleString() || 0}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
