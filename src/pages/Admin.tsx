import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users, Database, FileUp, Settings,
  BrainCircuit, Activity, BarChart, Search, AlertTriangle, RefreshCcw, Server, ShieldAlert, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MarathiAdminPanel } from '../components/admin/MarathiAdminPanel';
import { SyllabusValidationWidget } from '../components/admin/SyllabusValidationWidget';

interface Stats {
  activeStudents: number;
  totalQuestions: number;
  pendingReview: number;
  testsToday: number;
}

interface ActivityItem {
  id: string;
  text: string;
  when: string;
  timestamp: number;
}

export default function AdminPage({ fallbackAdmin }: { fallbackAdmin?: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'integrations' | 'syllabus'>('overview');
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats>({ activeStudents: 0, totalQuestions: 0, pendingReview: 0, testsToday: 0 });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  useEffect(() => {
    fetch('/api/admin/gateway-status')
      .then(async res => {
        if (!res.ok) {
           const text = await res.text();
           throw new Error(`API Error ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then(data => setGatewayStatus(data))
      .catch(err => console.warn("Failed to fetch gateway stats", err));
  }, [activeTab]);

  const fetchQuestions = useCallback(async (search: string) => {
    setLoadingQuestions(true);
    let query = supabase.from('questions').select('*').order('created_at', { ascending: false }).limit(50);
    if (search.trim()) {
      query = query.ilike('question', `%${search.trim()}%`);
    }
    const { data, error } = await query;
    if (!error && data) setQuestions(data);
    setLoadingQuestions(false);
  }, []);

  useEffect(() => {
    if (fallbackAdmin) {
      // The old client-side-only bypass has no real backend session, so there's nothing real to show.
      setIsAdmin(false);
      return;
    }

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setIsAdmin(false); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const admin = profile?.role === 'admin';
      setIsAdmin(admin);
      if (!admin) return;

      const [studentsRes, questionsRes, pendingRes, todayRes, recentExamsRes, recentUsersRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('exam_results').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().slice(0, 10)),
        supabase.from('exam_results').select('id, score, total_questions, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('display_name, username, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        activeStudents: studentsRes.count || 0,
        totalQuestions: questionsRes.count || 0,
        pendingReview: pendingRes.count || 0,
        testsToday: todayRes.count || 0,
      });

      const activity: ActivityItem[] = [];
      (recentExamsRes.data || []).forEach((e: any) => {
        activity.push({ id: `exam-${e.id}`, text: `Mock test completed — score ${e.score}/${e.total_questions}`, when: e.created_at, timestamp: new Date(e.created_at).getTime() });
      });
      (recentUsersRes.data || []).forEach((u: any, idx: number) => {
        activity.push({ id: `user-${idx}-${u.created_at}`, text: `New student joined: ${u.display_name || u.username || 'Student'}`, when: u.created_at, timestamp: new Date(u.created_at).getTime() });
      });
      activity.sort((a, b) => b.timestamp - a.timestamp);
      setRecentActivity(activity.slice(0, 5));

      fetchQuestions('');
    })();
  }, [fallbackAdmin, fetchQuestions]);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => fetchQuestions(questionSearch), 300);
    return () => clearTimeout(t);
  }, [questionSearch, isAdmin, fetchQuestions]);

  const generateAiBatch = async () => {
    setGeneratingBatch(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topics: [], difficulty: 'Mixed', count: 10, categoryMode: 'combined' })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('New batch generated and added to the question bank.');
      await fetchQuestions(questionSearch);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to generate batch. Check your AI provider keys under Integrations.');
    } finally {
      setGeneratingBatch(false);
    }
  };

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
          if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
          field = ''; row = [];
        } else field += c;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter(r => r.length > 1 || r[0]?.trim());
  };

  const handleBulkUpload = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) { toast.error('CSV appears empty.'); return; }

      const header = rows[0].map(h => h.trim().toLowerCase());
      const idx = (name: string) => header.indexOf(name);
      const required = ['question', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer', 'difficulty', 'category', 'subtopic'];
      const missing = required.filter(r => idx(r) === -1);
      if (missing.length > 0) {
        toast.error(`CSV missing required columns: ${missing.join(', ')}`);
        return;
      }

      const toInsert = rows.slice(1).filter(r => r[idx('question')]?.trim()).map(r => ({
        question: r[idx('question')],
        options: [r[idx('optiona')], r[idx('optionb')], r[idx('optionc')], r[idx('optiond')]],
        correct_answer: r[idx('correctanswer')],
        difficulty: r[idx('difficulty')],
        category: r[idx('category')],
        subtopic: r[idx('subtopic')],
        language: 'en',
        script: 'Latin',
        status: 'pending_review',
        source_api: 'Bulk Upload (CSV)'
      }));

      if (toInsert.length === 0) { toast.error('No valid rows found in CSV.'); return; }

      const { error } = await supabase.from('questions').insert(toInsert);
      if (error) throw error;

      toast.success(`Uploaded ${toInsert.length} questions for review.`);
      await fetchQuestions(questionSearch);
    } catch (e: any) {
      console.error(e);
      toast.error('Bulk upload failed: ' + (e.message || 'Invalid file.'));
    }
  };

  const relativeTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-slate-500 max-w-md">This console is only available to admin accounts. Sign in with an admin account to manage question banks, AI endpoints, and platform settings.</p>
      </div>
    );
  }

  const availableProviders = gatewayStatus?.providers?.filter((p: any) => p.available).length || 0;
  const totalProviders = gatewayStatus?.providers?.length || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full mx-auto p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="w-8 h-8 text-teal-600" /> Admin Console
        </h1>
        <p className="text-slate-500 mt-2">Manage question banks, AI endpoints, analytics, and platform settings.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'questions' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Question Bank Management
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'integrations' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          AI Gateway & Integrations
        </button>
        <button
          onClick={() => setActiveTab('syllabus')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'syllabus' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Syllabus Management
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm shadow-blue-100 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-slate-500 font-medium text-sm">Active Students</h3>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.activeStudents.toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-medium mt-2">Total registered accounts</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm shadow-teal-100 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                    <Database className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-slate-500 font-medium text-sm">Total Questions</h3>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalQuestions.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 font-medium mt-2">{stats.pendingReview.toLocaleString()} pending review</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm shadow-purple-100 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-slate-500 font-medium text-sm">Tests Taken (Today)</h3>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.testsToday.toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-medium mt-2">Since midnight</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm shadow-amber-100 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <BarChart className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-slate-500 font-medium text-sm">AI Providers Online</h3>
                <p className="text-3xl font-bold text-slate-900 mt-1">{gatewayStatus ? `${availableProviders}/${totalProviders}` : '—'}</p>
                <p className="text-xs text-slate-500 font-medium mt-2">{availableProviders === totalProviders && totalProviders > 0 ? 'All services operational' : availableProviders === 0 ? 'No providers configured' : 'Degraded'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest events across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No activity yet.</p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">{item.text}</p>
                          <p className="text-xs text-slate-500 mt-1">{relativeTime(item.when)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="bg-slate-50 pb-6 rounded-t-xl border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-xl">Question Bank</CardTitle>
                <CardDescription>Manage and generate mock test content.</CardDescription>
              </div>
            </CardHeader>
            <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between bg-white">
                 <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search questions..."
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                 </div>
                 <div className="flex items-center gap-3">
                   <input
                     id="bulk-upload-input"
                     type="file"
                     accept=".csv"
                     className="hidden"
                     onChange={(e) => { if (e.target.files?.[0]) handleBulkUpload(e.target.files[0]); e.target.value = ''; }}
                   />
                   <Button variant="outline" className="text-sm font-medium border-slate-200 text-slate-700 bg-white" onClick={() => document.getElementById('bulk-upload-input')?.click()}>
                     <FileUp className="w-4 h-4 mr-2" /> Bulk Upload (CSV)
                   </Button>
                   <Button disabled={generatingBatch} onClick={generateAiBatch} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-2">
                     {generatingBatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />} Generate AI Batch
                   </Button>
                 </div>
            </div>

            <CardContent className="p-0">
               {loadingQuestions ? (
                 <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
               ) : questions.length === 0 ? (
                 <div className="text-center py-10 text-slate-500 text-sm">No questions in the bank yet. Generate a batch or take a mock test to populate it.</div>
               ) : (
               <Table>
                 <TableHeader className="bg-slate-50">
                   <TableRow>
                     <TableHead className="w-20 pl-6">ID</TableHead>
                     <TableHead>Category</TableHead>
                     <TableHead>Subject</TableHead>
                     <TableHead>Difficulty</TableHead>
                     <TableHead>Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {questions.map((q) => (
                     <TableRow key={q.id} className="hover:bg-slate-50/50">
                       <TableCell className="font-mono text-xs text-slate-500 pl-6">#{q.id.slice(0, 8)}</TableCell>
                       <TableCell className="font-medium text-slate-800">{q.category}</TableCell>
                       <TableCell className="text-slate-600">{q.subtopic}</TableCell>
                       <TableCell><Badge variant="secondary" className="border-none">{q.difficulty}</Badge></TableCell>
                       <TableCell>
                         {q.status === 'published' ? (
                           <Badge className="bg-emerald-500 hover:bg-emerald-600">Published</Badge>
                         ) : (
                           <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending Review</Badge>
                         )}
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
               )}
            </CardContent>
          </Card>

        </div>
      )}

      {activeTab === 'syllabus' && (
        <div className="space-y-6">
          <SyllabusValidationWidget />
          <div className="mt-8">
            <h2 className="text-xl font-bold">Marathi Content Administration</h2>
            <MarathiAdminPanel />
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-slate-200 shadow-md h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-teal-600" /> LLM API Routing (Waterfall)
                </CardTitle>
                <CardDescription>Primary AI providers used to construct mock tests.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {gatewayStatus?.providers ? gatewayStatus.providers.map((provider: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${provider.available ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                          <div>
                            <h4 className="font-semibold text-slate-800">{provider.name}</h4>
                            <p className="text-xs text-slate-500">Priority Level: {idx + 1}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <Badge variant="outline" className={provider.available ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-red-600 border-red-200 bg-red-50'}>
                             {provider.available ? 'Connected' : 'Missing Key'}
                          </Badge>
                       </div>
                    </div>
                  )) : (
                     <div className="flex justify-center py-4"><RefreshCcw className="w-5 h-5 animate-spin text-slate-400" /></div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-md h-full">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-600" /> External Data Aggregation
                </CardTitle>
                <CardDescription>Free sources used for zero-latency mock generation.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {gatewayStatus?.dataSources ? gatewayStatus.dataSources.map((ds: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center">
                            <Database className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800">{ds.name}</h4>
                            <p className="text-xs text-slate-500">Cached Items: {ds.count}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <Badge variant="outline" className={ds.available ? 'text-blue-700 border-blue-200 bg-blue-50' : 'text-amber-600 border-amber-200 bg-amber-50'}>
                             {ds.available ? 'Active Sync' : 'Degraded'}
                          </Badge>
                       </div>
                    </div>
                  )) : (
                     <div className="flex justify-center py-4"><RefreshCcw className="w-5 h-5 animate-spin text-slate-400" /></div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-slate-50 border rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <h5 className="text-sm font-semibold text-slate-800">API Throttling Notice</h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">OpenTrivia DB enforces a 1 request/second rule. Gateway automatically buffers bursts via Redis/Local Cache layer.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
