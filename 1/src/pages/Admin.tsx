import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, Database, FileUp, Settings, 
  BrainCircuit, Activity, BarChart, Search, Link2, CheckCircle2, AlertTriangle, RefreshCcw, Server
} from 'lucide-react';
import { MarathiAdminPanel } from '../components/admin/MarathiAdminPanel';
import { SyllabusValidationWidget } from '../components/admin/SyllabusValidationWidget';

export default function AdminPage({ fallbackAdmin }: { fallbackAdmin?: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'integrations' | 'syllabus'>('overview');
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);

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
                <p className="text-3xl font-bold text-slate-900 mt-1">12,482</p>
                <p className="text-xs text-emerald-600 font-medium mt-2">+120 this week</p>
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
                <p className="text-3xl font-bold text-slate-900 mt-1">54,320</p>
                <p className="text-xs text-emerald-600 font-medium mt-2">1,240 pending review</p>
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
                <p className="text-3xl font-bold text-slate-900 mt-1">8,104</p>
                <p className="text-xs text-slate-500 font-medium mt-2">Peak load at 10 AM</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm shadow-amber-100 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <BarChart className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-slate-500 font-medium text-sm">System Health</h3>
                <p className="text-3xl font-bold text-slate-900 mt-1">99.9%</p>
                <p className="text-xs text-emerald-600 font-medium mt-2">All services operational</p>
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
                <div className="space-y-4">
                  {[1,2,3].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-sm">Bulk question upload completed (Med-Surg)</p>
                        <p className="text-xs text-slate-500 mt-1">By Admin • 2 hours ago</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <input type="text" placeholder="Search questions..." className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                 </div>
                 <div className="flex items-center gap-3">
                   <Button variant="outline" className="text-sm font-medium border-slate-200 text-slate-700 bg-white">
                     <FileUp className="w-4 h-4 mr-2" /> Bulk Upload (CSV)
                   </Button>
                   <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-2">
                     <BrainCircuit className="w-4 h-4" /> Generate AI Batch
                   </Button>
                 </div>
            </div>
            
            <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50">
                   <TableRow>
                     <TableHead className="w-20 pl-6">ID</TableHead>
                     <TableHead>Category</TableHead>
                     <TableHead>Subject</TableHead>
                     <TableHead>Type</TableHead>
                     <TableHead>Difficulty</TableHead>
                     <TableHead>Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   <TableRow className="hover:bg-slate-50/50">
                     <TableCell className="font-mono text-xs text-slate-500 pl-6">#QN-4921</TableCell>
                     <TableCell className="font-medium text-slate-800">Nursing</TableCell>
                     <TableCell className="text-slate-600">Med-Surg (Cardio)</TableCell>
                     <TableCell><Badge variant="outline" className="bg-white">MCQ</Badge></TableCell>
                     <TableCell><Badge variant="secondary" className="bg-red-50 text-red-700 border-none">Hard</Badge></TableCell>
                     <TableCell><Badge className="bg-emerald-500 hover:bg-emerald-600">Published</Badge></TableCell>
                   </TableRow>
                   <TableRow className="hover:bg-slate-50/50">
                     <TableCell className="font-mono text-xs text-slate-500 pl-6">#QN-4922</TableCell>
                     <TableCell className="font-medium text-slate-800">Non-Technical</TableCell>
                     <TableCell className="text-slate-600">General Knowledge</TableCell>
                     <TableCell><Badge variant="outline" className="bg-white">MCQ</Badge></TableCell>
                     <TableCell><Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none">Medium</Badge></TableCell>
                     <TableCell><Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending Review</Badge></TableCell>
                   </TableRow>
                   <TableRow className="hover:bg-slate-50/50">
                     <TableCell className="font-mono text-xs text-slate-500 pl-6">#QN-4923</TableCell>
                     <TableCell className="font-medium text-slate-800">Nursing</TableCell>
                     <TableCell className="text-slate-600">Pediatrics</TableCell>
                     <TableCell><Badge variant="outline" className="bg-white">MCQ</Badge></TableCell>
                     <TableCell><Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none">Simple</Badge></TableCell>
                     <TableCell><Badge className="bg-emerald-500 hover:bg-emerald-600">Published</Badge></TableCell>
                   </TableRow>
                 </TableBody>
               </Table>
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
                          <p className="text-xs text-slate-400 mt-1.5 font-mono">{provider.latency}</p>
                       </div>
                    </div>
                  )) : (
                     <div className="flex justify-center py-4"><RefreshCcw className="w-5 h-5 animate-spin text-slate-400" /></div>
                  )}
                </div>
                <Button className="w-full mt-6 bg-slate-900 border" variant="outline">
                  Configure Fallback Rules
                </Button>
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
