import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Search, User, MessageSquare, DollarSign, X } from 'lucide-react';
import { searchApi } from '../lib/api';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search - only search when user has typed at least 2 characters
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if query is too short
    if (query.trim().length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchApi.search(query);
        setResults(response.data);
        setIsOpen(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleResultClick = (type, item) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    
    switch (type) {
      case 'client':
        navigate(`/clients/${item.id}`);
        break;
      case 'message':
        navigate(`/contacts?client=${item.client_id}`);
        break;
      case 'deal':
        navigate(`/funded-deals`);
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const totalResults = results ? 
    (results.clients?.length || 0) + (results.messages?.length || 0) + (results.deals?.length || 0) : 0;

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && results && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search clients, messages... (min 2 chars)"
          className="pl-10 pr-8 w-full"
          data-testid="global-search-input"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              {/* Clients Section */}
              {results?.clients?.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Clients
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {results.clients.length}
                    </Badge>
                  </div>
                  {results.clients.slice(0, 5).map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleResultClick('client', client)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-3 border-b last:border-b-0"
                      data-testid={`search-result-client-${client.id}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-medium text-xs">
                          {client.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.phone}</p>
                      </div>
                    </button>
                  ))}
                  {results.clients.length > 5 && (
                    <div className="px-3 py-1 text-xs text-muted-foreground text-center">
                      +{results.clients.length - 5} more clients
                    </div>
                  )}
                </div>
              )}

              {/* Messages Section */}
              {results?.messages?.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Messages
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {results.messages.length}
                    </Badge>
                  </div>
                  {results.messages.slice(0, 3).map((message) => (
                    <button
                      key={message.id}
                      onClick={() => handleResultClick('message', message)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 border-b last:border-b-0"
                      data-testid={`search-result-message-${message.id}`}
                    >
                      <p className="text-sm truncate">{message.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.timestamp || message.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Deals Section */}
              {results?.deals?.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Deals
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {results.deals.length}
                    </Badge>
                  </div>
                  {results.deals.slice(0, 3).map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => handleResultClick('deal', deal)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 border-b last:border-b-0"
                      data-testid={`search-result-deal-${deal.id}`}
                    >
                      <p className="font-medium text-sm truncate">{deal.business_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>${deal.amount?.toLocaleString() || 0}</span>
                        <Badge variant="outline" className="text-xs">{deal.status}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
