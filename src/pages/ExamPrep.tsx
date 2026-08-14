import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  FileText, 
  BarChart3, 
  Download, 
  PlayCircle, 
  ListTodo,
  TrendingUp,
  Brain,
  Bell,
  Search,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';

// --- Data Models ---
interface ExamOverview {
  name: string;
  authority: string;
  level: string;
  eligibility: string;
  mode: string;
  duration: string;
  marking: string;
  nextDate: string;
}

interface SyllabusTopic {
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  hours: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  hoursStudied?: number;
}

interface SyllabusSubject {
  subject: string;
  progress: number;
  topics: SyllabusTopic[];
}

interface WeightageItem {
  subject: string;
  weight: number;
}

interface PreviousPaper {
  year: number;
  shift: string;
  difficulty: string;
}

interface ImportantTopic {
  topic: string;
  subject: string;
  frequency: 'Very High' | 'High' | 'Medium';
}

interface StudyTimeLog {
  day: string;
  hours: number;
}

// --- Dummy Data ---
const examDetails: ExamOverview = {
  name: "DHS Nursing Officer Exam",
  authority: "Directorate of Health Services",
  level: "State Level State",
  eligibility: "B.Sc Nursing / GNM",
  mode: "CBT (Computer Based Test)",
  duration: "120 Minutes",
  marking: "+1 for correct, -0.25 for incorrect",
  nextDate: "2026-08-15"
};

const weightageData: WeightageItem[] = [
  { subject: 'Nursing Foundation', weight: 20 },
  { subject: 'Med-Surg', weight: 25 },
  { subject: 'Obstetrics', weight: 15 },
  { subject: 'Pediatrics', weight: 10 },
  { subject: 'Community Health', weight: 10 },
  { subject: 'Mental Health', weight: 10 },
  { subject: 'General Aptitude', weight: 10 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#64748b'];

const initialSyllabusData: SyllabusSubject[] = [
  {
    subject: "Medical Surgical Nursing",
    progress: 0,
    topics: [
      { name: "Cardiovascular System", status: "Not Started", hours: 0, difficulty: "Hard" },
      { name: "Respiratory System", status: "Not Started", hours: 0, difficulty: "Medium" },
      { name: "Nervous System", status: "Not Started", hours: 0, difficulty: "Hard" },
      { name: "Gastrointestinal", status: "Not Started", hours: 0, difficulty: "Medium" }
    ]
  },
  {
    subject: "Nursing Foundation",
    progress: 0,
    topics: [
      { name: "Vital Signs", status: "Not Started", hours: 0, difficulty: "Easy" },
      { name: "Infection Control", status: "Not Started", hours: 0, difficulty: "Medium" },
      { name: "First Aid", status: "Not Started", hours: 0, difficulty: "Easy" }
    ]
  }
];

const previousPapers: PreviousPaper[] = [
  { year: 2025, shift: "Morning", difficulty: "Moderate" },
  { year: 2024, shift: "Evening", difficulty: "Hard" },
  { year: 2023, shift: "Morning", difficulty: "Easy-Moderate" },
];

const importantTopics: ImportantTopic[] = [
  { topic: "ECG Interpretation", subject: "Med-Surg", frequency: "Very High" },
  { topic: "Immunization Schedule", subject: "Pediatrics", frequency: "High" },
  { topic: "Biomedical Waste Mgt", subject: "Foundation", frequency: "Very High" },
  { topic: "Labor Stages", subject: "Obstetrics", frequency: "High" }
];

const studyTimeData: StudyTimeLog[] = [
  { day: 'Mon', hours: 0 },
  { day: 'Tue', hours: 0 },
  { day: 'Wed', hours: 0 },
  { day: 'Thu', hours: 0 },
  { day: 'Fri', hours: 0 },
  { day: 'Sat', hours: 0 },
  { day: 'Sun', hours: 0 },
];

export default function ExamPrepPage({ fallbackAdmin }: { fallbackAdmin?: any }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [userId, setUserId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, { status: SyllabusTopic['status']; hours_studied: number }>>({});

  // Load the signed-in user's real syllabus progress (fallback admin keeps the static "Not Started" defaults)
  useEffect(() => {
    if (fallbackAdmin) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase.from('syllabus_progress').select('*').eq('user_id', user.id);
      if (data && !error) {
        const map: typeof progressMap = {};
        data.forEach((row: any) => {
          map[`${row.subject}|${row.topic}`] = { status: row.status, hours_studied: Number(row.hours_studied) || 0 };
        });
        setProgressMap(map);
      }
    })();
  }, [fallbackAdmin]);

  // Overlay real per-user progress onto the syllabus catalog and recompute subject-level progress from it
  const mergedSyllabusData = useMemo(() => {
    return initialSyllabusData.map((subject) => {
      const topics = subject.topics.map((topic) => {
        const override = progressMap[`${subject.subject}|${topic.name}`];
        return override
          ? { ...topic, status: override.status, hoursStudied: override.hours_studied }
          : { ...topic, hoursStudied: 0 };
      });
      const completedWeight = topics.reduce((sum, t) => sum + (t.status === 'Completed' ? 1 : t.status === 'In Progress' ? 0.5 : 0), 0);
      const progress = topics.length > 0 ? Math.round((completedWeight / topics.length) * 100) : 0;
      return { ...subject, topics, progress };
    });
  }, [progressMap]);

  const overallProgress = useMemo(() => {
    if (mergedSyllabusData.length === 0) return 0;
    const total = mergedSyllabusData.reduce((sum, subject) => sum + subject.progress, 0);
    return Math.round(total / mergedSyllabusData.length);
  }, [mergedSyllabusData]);

  const saveTopicProgress = async (subjectName: string, topicName: string, status: SyllabusTopic['status'], hoursStudied: number) => {
    setProgressMap(prev => ({ ...prev, [`${subjectName}|${topicName}`]: { status, hours_studied: hoursStudied } }));

    if (!userId) {
      toast.info('Sign in with a real account to save your progress.');
      return;
    }
    const { error } = await supabase.from('syllabus_progress').upsert({
      user_id: userId,
      subject: subjectName,
      topic: topicName,
      status,
      hours_studied: hoursStudied,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,subject,topic' });
    if (error) {
      console.warn('Failed to save syllabus progress', error);
      toast.error('Could not save progress. Please try again.');
    }
  };

  const updateTopicStatus = (subjectName: string, topicName: string, newStatus: SyllabusTopic['status']) => {
    const current = progressMap[`${subjectName}|${topicName}`];
    saveTopicProgress(subjectName, topicName, newStatus, current?.hours_studied || 0);
  };

  const logStudyHour = (subjectName: string, topicName: string) => {
    const current = progressMap[`${subjectName}|${topicName}`];
    const newHours = (current?.hours_studied || 0) + 1;
    const newStatus = !current || current.status === 'Not Started' ? 'In Progress' : current.status;
    saveTopicProgress(subjectName, topicName, newStatus, newHours);
  };

  // Filtered Syllabus Logic
  const filteredSyllabus = useMemo(() => {
    return mergedSyllabusData.map((subject) => {
      const filteredTopics = subject.topics.filter((topic) => {
        const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || topic.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
      return { ...subject, topics: filteredTopics };
    }).filter(subject => subject.topics.length > 0);
  }, [searchQuery, statusFilter, mergedSyllabusData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" /> Exam Preparation Hub
          </h1>
          <p className="text-slate-500 mt-1">Comprehensive preparation tracking for {examDetails.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1.5 flex items-center gap-2 shadow-sm text-sm">
            <Calendar className="w-4 h-4" /> Exam: {examDetails.nextDate}
          </Badge>
          <Button size="sm" variant="outline" className="gap-2 bg-white">
            <Bell className="w-4 h-4 text-blue-500" /> Alerts (2)
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <ScrollArea className="w-full max-w-full">
          <TabsList className="mb-4 inline-flex w-full justify-start md:w-auto overflow-x-auto p-1 bg-slate-100/80 rounded-xl shadow-inner border">
            <TabsTrigger value="overview" className="rounded-lg px-4 py-2">Overview</TabsTrigger>
            <TabsTrigger value="syllabus" className="rounded-lg px-4 py-2">Syllabus</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg px-4 py-2">Analytics & Trends</TabsTrigger>
            <TabsTrigger value="materials" className="rounded-lg px-4 py-2">Study Material</TabsTrigger>
            <TabsTrigger value="pyp" className="rounded-lg px-4 py-2">Previous Papers</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Exam Details Card */}
            <Card className="lg:col-span-2 border-slate-200 shadow-md bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-2xl text-slate-800">Exam Details</CardTitle>
                <CardDescription>Key information about the latest official notification</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pt-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Conducting Authority</h4>
                  <p className="text-slate-900 font-medium text-lg">{examDetails.authority}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Exam Level</h4>
                  <p className="text-slate-900 font-medium text-lg">{examDetails.level}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Eligibility</h4>
                  <p className="text-slate-900 font-medium text-lg">{examDetails.eligibility}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Mode of Exam</h4>
                  <p className="text-slate-900 font-medium text-lg flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" /> {examDetails.mode}
                  </p>
                </div>
                <div className="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-6">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Duration</h4>
                    <p className="text-slate-900 font-medium text-lg">{examDetails.duration}</p>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Marking Scheme</h4>
                    <p className="text-slate-900 font-medium text-lg">{examDetails.marking}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats & AI Recommendations */}
            <div className="space-y-6 flex flex-col">
              <Card className="border-none shadow-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex-1 flex flex-col justify-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-blue-50 font-medium text-base">Overall Preparation Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-extrabold mb-4 tracking-tight">{overallProgress}%</div>
                  <Progress value={overallProgress} className="h-3 bg-blue-900/50 [&>div]:bg-white rounded-full" />
                  <p className="text-sm text-blue-100 mt-4 font-medium flex items-center justify-between">
                    <span>{overallProgress > 0 ? 'Keep going!' : 'Start a topic to begin tracking'}</span>
                    <TrendingUp className="w-4 h-4 opacity-80" />
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-purple-100 shadow-md bg-white">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                    <Brain className="w-5 h-5 text-purple-500" /> Smart Suggestion
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                    Based on recent trends, <strong className="text-slate-900 bg-purple-50 px-1 rounded">ECG Interpretation</strong> has high weightage. You haven't started this yet.
                  </p>
                  <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm h-10">Start Topic Now</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* SYLLABUS TAB */}
        <TabsContent value="syllabus" className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <Card className="border-slate-200 shadow-md bg-white">
            <CardHeader className="border-b border-slate-100 pb-5">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                <div>
                  <CardTitle className="text-2xl text-slate-800 mb-1">Syllabus Tracker</CardTitle>
                  <CardDescription className="text-base">Track your subject-wise and topic-wise progress</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                   <div className="relative w-full sm:w-64">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                     <input 
                       type="text" 
                       placeholder="Search topic..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full bg-slate-50 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" 
                     />
                   </div>
                   <div className="relative">
                     <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full sm:w-auto appearance-none bg-slate-50 pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-slate-700 font-medium cursor-pointer"
                     >
                       <option value="All">All Statuses</option>
                       <option value="Not Started">Not Started</option>
                       <option value="In Progress">In Progress</option>
                       <option value="Completed">Completed</option>
                     </select>
                     <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                   </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredSyllabus.length === 0 ? (
                <div className="text-center py-12">
                   <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                     <Search className="w-8 h-8 text-slate-300" />
                   </div>
                   <h3 className="text-lg font-medium text-slate-900">No topics found</h3>
                   <p className="text-slate-500 mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                <Accordion type="multiple" className="w-full space-y-4" defaultValue={['item-0']}>
                  {filteredSyllabus.map((subject, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-xl bg-white overflow-hidden data-[state=open]:shadow-md transition-shadow">
                      <AccordionTrigger className="hover:no-underline px-5 py-4 bg-slate-50/50 hover:bg-slate-50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4 pr-6">
                          <span className="font-semibold text-lg text-slate-800">{subject.subject}</span>
                          <div className="flex items-center gap-3 w-full sm:w-1/3 max-w-[200px]">
                            <Progress value={subject.progress} className="h-2.5 w-full bg-slate-200 [&>div]:bg-blue-600" />
                            <span className="text-sm font-bold text-slate-600 w-12 text-right">{subject.progress}%</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-5 px-5 bg-white">
                        <div className="space-y-3 mt-4">
                          {subject.topics.map((topic, tIdx) => (
                            <div key={tIdx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-slate-200 transition-colors gap-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                  topic.status === 'Completed' ? 'bg-green-100 text-green-600' :
                                  topic.status === 'In Progress' ? 'bg-amber-100 text-amber-600' :
                                  'bg-slate-100 text-slate-400'
                                }`}>
                                  {topic.status === 'Completed' ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                  ) : topic.status === 'In Progress' ? (
                                    <Clock className="w-5 h-5" />
                                  ) : (
                                    <ListTodo className="w-5 h-5" />
                                  )}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-slate-800 text-base">{topic.name}</h5>
                                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                                    <Clock className="w-3.5 h-3.5" /> {topic.hours} hours estimated
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                <Badge variant={topic.difficulty === 'Hard' ? 'destructive' : topic.difficulty === 'Medium' ? 'default' : 'secondary'} className={topic.difficulty==='Medium' ? 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-none' : 'border-none'}>
                                  {topic.difficulty}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50"
                                  onClick={() => logStudyHour(subject.subject, topic.name)}
                                >
                                  +1 hr{topic.hoursStudied ? ` (${topic.hoursStudied} logged)` : ''}
                                </Button>
                                <select
                                  value={topic.status}
                                  onChange={(e) => updateTopicStatus(subject.subject, topic.name, e.target.value as SyllabusTopic['status'])}
                                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-md border cursor-pointer ${
                                    topic.status === 'Completed' ? 'border-green-200 text-green-700 bg-green-50' :
                                    topic.status === 'In Progress' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                    'border-slate-200 text-slate-600 bg-slate-50'
                                  }`}
                                >
                                  <option value="Not Started">Not Started</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS & WEIGHTAGE TAB */}
        <TabsContent value="analytics" className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Spent Analytics */}
            <Card className="border-slate-200 shadow-md bg-white lg:col-span-2">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-xl">Daily Study Tracker</CardTitle>
                <CardDescription>Hours spent studying over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent className="h-80 pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studyTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="hours" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={48} name="Study Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-md bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-xl text-slate-800">Subject-wise Weightage (%)</CardTitle>
                <CardDescription>Estimated distribution of marks</CardDescription>
              </CardHeader>
              <CardContent className="h-80 pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={weightageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="weight"
                      nameKey="subject"
                      label={({name, percent}) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {weightageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: '600' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs font-medium text-slate-600">
                  {weightageData.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[idx]}}></div>
                      {item.subject}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-md bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-xl flex items-center gap-2 text-slate-800">
                  <TrendingUp className="w-5 h-5 text-red-500" /> High Yield Topics
                </CardTitle>
                <CardDescription>Topics most frequently asked in exams</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="pl-6 text-slate-600 font-semibold">Topic</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Subject</TableHead>
                      <TableHead className="text-slate-600 font-semibold border-none">Frequency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importantTopics.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-800 pl-6">{item.topic}</TableCell>
                        <TableCell className="text-slate-500">{item.subject}</TableCell>
                        <TableCell>
                          <Badge variant={item.frequency === 'Very High' ? 'destructive' : 'default'} className={`border-none ${item.frequency === 'High' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''} ${item.frequency === 'Very High' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}>
                            {item.frequency}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* STUDY MATERIALS TAB */}
        <TabsContent value="materials" className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-white">
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex justify-center items-center group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-800">PDF Notes</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">Download topic-wise standard notes, summaries, and cheat sheets.</p>
                </div>
                <Button variant="outline" className="w-full mt-4 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-200 transition-colors bg-white">Browse PDFs</Button>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-white">
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex justify-center items-center group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                  <PlayCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-800">Video Lectures</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">AI Curated targeted video explanations for challenging concepts.</p>
                </div>
                <Button variant="outline" className="w-full mt-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors bg-white">Watch Now</Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group bg-white" onClick={() => navigate('/test')}>
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex justify-center items-center group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-800">Mock Tests</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">Full length and sectional highly adaptive, time-based mock tests.</p>
                </div>
                <Button variant="outline" className="w-full mt-4 group-hover:bg-green-50 group-hover:text-green-600 group-hover:border-green-200 transition-colors bg-white">Take a Test</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PREVIOUS YEAR PAPERS TAB */}
        <TabsContent value="pyp" className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <Card className="border-slate-200 shadow-md bg-white">
            <CardHeader className="border-b border-slate-100 pb-5">
              <CardTitle className="text-2xl text-slate-800">Previous Year Papers</CardTitle>
              <CardDescription className="text-base">Download and practice real exam papers to understand the pattern</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 p-0">
              <Table>
                <TableHeader className="bg-slate-50 border-b">
                  <TableRow>
                    <TableHead className="pl-6 h-12 text-slate-600 font-semibold">Year</TableHead>
                    <TableHead className="text-slate-600 font-semibold">Shift</TableHead>
                    <TableHead className="text-slate-600 font-semibold">Difficulty Level</TableHead>
                    <TableHead className="text-right pr-6 text-slate-600 font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previousPapers.map((paper, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-slate-900 pl-6 text-base">{paper.year}</TableCell>
                      <TableCell className="font-medium text-slate-600">{paper.shift}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium px-2.5 py-0.5 border border-slate-200">
                          {paper.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-3">
                           <Button size="sm" variant="outline" className="gap-2 bg-white hover:bg-slate-50 hover:text-blue-600 border-slate-200 shadow-sm" title="Download PDF">
                             <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
                           </Button>
                           <Button onClick={() => navigate('/test')} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium">Solve Now</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}

