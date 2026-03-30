import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  ShieldAlert, Plus, Trash2, Ban, PhoneOff, Search, Loader2, AlertTriangle
} from 'lucide-react';
import { moderationApi } from '../lib/api';
import { toast } from 'sonner';

const ContentModeration = () => {
  const [bannedWords, setBannedWords] = useState([]);
  const [blacklistedNumbers, setBlacklistedNumbers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add forms
  const [newWord, setNewWord] = useState('');
  const [wordReason, setWordReason] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [numberReason, setNumberReason] = useState('');
  const [addingWord, setAddingWord] = useState(false);
  const [addingNumber, setAddingNumber] = useState(false);

  // Search
  const [wordSearch, setWordSearch] = useState('');
  const [numberSearch, setNumberSearch] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wordsRes, numbersRes] = await Promise.all([
        moderationApi.getBannedWords(),
        moderationApi.getBlacklistedNumbers(),
      ]);
      setBannedWords(wordsRes.data);
      setBlacklistedNumbers(numbersRes.data);
    } catch (err) {
      toast.error('Failed to load moderation rules');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    setAddingWord(true);
    try {
      await moderationApi.addBannedWord({ word: newWord.trim(), reason: wordReason.trim() });
      toast.success(`"${newWord.trim()}" added to banned words`);
      setNewWord('');
      setWordReason('');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add word');
    } finally {
      setAddingWord(false);
    }
  };

  const handleRemoveWord = async (id, word) => {
    try {
      await moderationApi.removeBannedWord(id);
      toast.success(`"${word}" removed from banned words`);
      loadAll();
    } catch (err) {
      toast.error('Failed to remove word');
    }
  };

  const handleAddNumber = async (e) => {
    e.preventDefault();
    if (!newNumber.trim()) return;
    setAddingNumber(true);
    try {
      await moderationApi.addBlacklistedNumber({ phone_number: newNumber.trim(), reason: numberReason.trim() });
      toast.success(`${newNumber.trim()} added to blacklist`);
      setNewNumber('');
      setNumberReason('');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add number');
    } finally {
      setAddingNumber(false);
    }
  };

  const handleRemoveNumber = async (id, phone) => {
    try {
      await moderationApi.removeBlacklistedNumber(id);
      toast.success(`${phone} removed from blacklist`);
      loadAll();
    } catch (err) {
      toast.error('Failed to remove number');
    }
  };

  const filteredWords = bannedWords.filter(w =>
    w.word.toLowerCase().includes(wordSearch.toLowerCase())
  );
  const filteredNumbers = blacklistedNumbers.filter(n =>
    n.phone_number.includes(numberSearch)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="content-moderation-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-['Outfit'] flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-600" />
            Content Moderation
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage banned words and blacklisted phone numbers. These rules apply globally across all organizations.
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200">Global Enforcement</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Any message containing a banned word will be blocked before sending. Any attempt to text a blacklisted number will be rejected. These rules apply to all users in every organization.
            </p>
          </div>
        </div>

        <Tabs defaultValue="words" className="space-y-6">
          <TabsList>
            <TabsTrigger value="words" className="flex items-center gap-2">
              <Ban className="h-4 w-4" /> Banned Words
              <Badge variant="secondary" className="ml-1">{bannedWords.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="numbers" className="flex items-center gap-2">
              <PhoneOff className="h-4 w-4" /> Blacklisted Numbers
              <Badge variant="secondary" className="ml-1">{blacklistedNumbers.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* ============ BANNED WORDS TAB ============ */}
          <TabsContent value="words" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Add Banned Word or Phrase</CardTitle>
                <CardDescription>Messages containing these words will be blocked from sending.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddWord} className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="new-word">Word / Phrase</Label>
                    <Input
                      id="new-word"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      placeholder="Enter word or phrase to ban..."
                      data-testid="banned-word-input"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="word-reason">Reason (optional)</Label>
                    <Input
                      id="word-reason"
                      value={wordReason}
                      onChange={(e) => setWordReason(e.target.value)}
                      placeholder="Why is this banned?"
                      data-testid="banned-word-reason"
                    />
                  </div>
                  <Button type="submit" disabled={!newWord.trim() || addingWord} data-testid="add-banned-word-btn">
                    {addingWord ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={wordSearch}
                onChange={(e) => setWordSearch(e.target.value)}
                placeholder="Search banned words..."
                className="pl-10"
                data-testid="search-banned-words"
              />
            </div>

            {/* Words list */}
            {loading ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : filteredWords.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Ban className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    {wordSearch ? 'No matching banned words' : 'No banned words yet. Add one above.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredWords.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive" className="font-mono" data-testid={`banned-word-${entry.word}`}>
                          {entry.word}
                        </Badge>
                        {entry.reason && (
                          <span className="text-sm text-muted-foreground">{entry.reason}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWord(entry.id, entry.word)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`remove-word-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ============ BLACKLISTED NUMBERS TAB ============ */}
          <TabsContent value="numbers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Add Blacklisted Phone Number</CardTitle>
                <CardDescription>No one in any organization will be able to send messages to these numbers.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddNumber} className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="new-number">Phone Number</Label>
                    <Input
                      id="new-number"
                      value={newNumber}
                      onChange={(e) => setNewNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      data-testid="blacklist-number-input"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="number-reason">Reason (optional)</Label>
                    <Input
                      id="number-reason"
                      value={numberReason}
                      onChange={(e) => setNumberReason(e.target.value)}
                      placeholder="Why blacklisted?"
                      data-testid="blacklist-number-reason"
                    />
                  </div>
                  <Button type="submit" disabled={!newNumber.trim() || addingNumber} data-testid="add-blacklist-number-btn">
                    {addingNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={numberSearch}
                onChange={(e) => setNumberSearch(e.target.value)}
                placeholder="Search blacklisted numbers..."
                className="pl-10"
                data-testid="search-blacklisted-numbers"
              />
            </div>

            {/* Numbers list */}
            {loading ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : filteredNumbers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <PhoneOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    {numberSearch ? 'No matching blacklisted numbers' : 'No blacklisted numbers yet. Add one above.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredNumbers.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-red-600 border-red-300" data-testid={`blacklisted-${entry.phone_number}`}>
                          {entry.phone_number}
                        </Badge>
                        {entry.reason && (
                          <span className="text-sm text-muted-foreground">{entry.reason}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveNumber(entry.id, entry.phone_number)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`remove-number-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ContentModeration;
