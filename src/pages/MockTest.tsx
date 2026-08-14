import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BrainCircuit, CheckCircle2, XCircle, Search, Clock, ShieldAlert, Navigation, Settings, LayoutGrid, Flag, CheckSquare, ChevronRight, Check, ArrowLeft, ArrowRight, Filter, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  rationale?: string;
  optionAnalysis?: Record<string, string>;
  keyConcept?: string;
  quickRevision?: string;
  examTip?: string;
  wrongExplanations?: string[];
  clinicalSignificance?: string;
  difficulty: string;
  category: string;
  subtopic: string;
  memoryTrick?: string;
  language?: string;
  script?: string;
  encoding?: string;
}

// AI providers return correctAnswer in inconsistent formats: a bare letter ("C"),
// a letter with punctuation ("C." / "C)"), or the full option text ("Option A").
// This resolves all of them to the actual index into q.options so comparisons
// against the full-text answers stored in state work regardless of format.
function getCorrectOptionIndex(q: Question): number {
  const trimmed = (q.correctAnswer || '').trim();
  if (/^[A-Da-d]$/.test(trimmed)) {
    return trimmed.toUpperCase().charCodeAt(0) - 65;
  }
  const prefixMatch = trimmed.match(/^([A-Da-d])[\.\)]/);
  if (prefixMatch) {
    return prefixMatch[1].toUpperCase().charCodeAt(0) - 65;
  }
  const exactIdx = q.options.findIndex(o => o.trim() === trimmed);
  if (exactIdx !== -1) return exactIdx;
  return q.options.findIndex(o => o.replace(/^[A-Da-d][\.\)]\s*/, '').trim() === trimmed);
}

function isCorrectAnswer(q: Question, userAnswer?: string): boolean {
  if (!userAnswer) return false;
  const idx = getCorrectOptionIndex(q);
  if (idx < 0 || idx >= q.options.length) return userAnswer.trim() === (q.correctAnswer || '').trim();
  return q.options[idx] === userAnswer;
}

function isCorrectOptionIndex(q: Question, optionIndex: number): boolean {
  return getCorrectOptionIndex(q) === optionIndex;
}

import { TECHNICAL_SUBJECTS, NON_TECHNICAL_SUBJECTS } from '../lib/syllabus';

import { LoadingButton } from '@/components/ui/loading-button';
import { MockGenerationLoader } from '@/components/mock-test/MockGenerationLoader';
import { toast } from 'sonner';

export default function MockTestPage({ fallbackAdmin }: { fallbackAdmin?: any }) {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [configMode, setConfigMode] = useState(!examId);
  const [examCategory, setExamCategory] = useState<'technical' | 'non-technical' | 'combined'>('technical');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  
  // Selection State
  // Map of subjectId to array of selected topic names
  const [selectedTopics, setSelectedTopics] = useState<Record<string, string[]>>({});
  
  const getActiveSubjects = () => {
    if (examCategory === 'technical') return TECHNICAL_SUBJECTS;
    if (examCategory === 'non-technical') return NON_TECHNICAL_SUBJECTS;
    return [...TECHNICAL_SUBJECTS, ...NON_TECHNICAL_SUBJECTS];
  };

  const SUBJECTS_DATA = getActiveSubjects();
  
  // Settings
  const [testCount, setTestCount] = useState<number>(10);
  const [testDifficulty, setTestDifficulty] = useState<string>('Mixed');
  const [negativeMarking, setNegativeMarking] = useState<boolean>(true);

  // Test State
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [markedReview, setMarkedReview] = useState<Record<number, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0); // in seconds
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'skipped'>('all');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [navigatorCollapsed, setNavigatorCollapsed] = useState(false);

  const [studyPlanLoading, setStudyPlanLoading] = useState(false);
  const [studyPlan, setStudyPlan] = useState<string>('');

  useEffect(() => {
    if (examId) {
      const fetchPastExam = async () => {
        setLoading(true);
        try {
          const { supabase } = await import('@/lib/supabase');
          
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return; // Wait for auth
          
          const { data, error } = await supabase
            .from('exam_results')
            .select('*')
            .eq('id', examId)
            .eq('user_id', session.user.id)
            .single();
          
          if (data && !error) {
             // Check if it's the right data structure (has questions)
             if (!data.questions || !Array.isArray(data.questions)) {
                toast.error("This exam result doesn't contain detailed review data.");
                navigate('/dashboard');
                return;
             }
             
             setQuestions(data.questions);
             // Reconstruct answers from saved data
             const loadedAnswers: Record<number, string> = {};
             data.questions.forEach((q: any, idx: number) => {
                if (q.userAnswer) {
                   loadedAnswers[idx] = q.userAnswer;
                }
             });
             setAnswers(loadedAnswers);
             setTimeSpent(data.time_spent || 0);
             if (data.study_plan) {
                 setStudyPlan(data.study_plan);
             }
             setIsSubmitted(true);
             setConfigMode(false);
             setReviewMode(false); // start at performance dashboard
             setReviewFilter('all');
             
          } else {
             toast.error('Exam result not found.');
             navigate('/dashboard');
          }
        } catch (e) {
          console.error(e);
          toast.error('Failed to load past exam');
        } finally {
          setLoading(false);
        }
      };
      
      import('@/lib/supabase').then(({ supabase }) => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) fetchPastExam();
        });
      });
    }
  }, [examId, navigate]);

  useEffect(() => {
    let timer: any;
    if (!configMode && !isSubmitted && !loading && questions.length > 0) {
      timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [configMode, isSubmitted, loading, questions]);

  useEffect(() => {
     if (isSubmitted && !studyPlan && !studyPlanLoading) {
        setStudyPlanLoading(true);
        // Identify weak areas dynamically for prompt
        const weakCategories = new Set<string>();
        questions.forEach((q, idx) => {
           if (!isCorrectAnswer(q, answers[idx])) weakCategories.add(q.category);
        });
        const prompt = Array.from(weakCategories).slice(0, 5).join(', ');
        
        fetch('/api/ai/doubt-solver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `I just took a nursing mock test and performed poorly in these topics: ${prompt || 'General Nursing'}. Please generate a highly structured, day-by-day 1-Week Study Plan focusing explicitly on these weak areas. Use markdown formatting with bullet points. Keep it concise, practical, and NCLEX focused.` })
        }).then(res => res.json()).then(data => {
            setStudyPlan(data.reply);
        }).catch(err => console.error(err))
        .finally(() => setStudyPlanLoading(false));
     }
  }, [isSubmitted, studyPlan, studyPlanLoading, questions, answers]);

  const handleToggleTopic = (subjectId: string, topic: string) => {
    setSelectedTopics(prev => {
      const current = prev[subjectId] || [];
      if (current.includes(topic)) {
        return { ...prev, [subjectId]: current.filter(t => t !== topic) };
      } else {
        return { ...prev, [subjectId]: [...current, topic] };
      }
    });
  };

  const handleCategoryChange = (category: typeof examCategory) => {
    setExamCategory(category);
    setSelectedTopics({});
    setSearchQuery('');
  };

  const handleSelectAllSubject = (subjectId: string) => {
    const combinedSubjects = [...TECHNICAL_SUBJECTS, ...NON_TECHNICAL_SUBJECTS];
    const subject = combinedSubjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    setSelectedTopics(prev => {
      const current = prev[subjectId] || [];
      if (current.length === subject.topics.length) {
        return { ...prev, [subjectId]: [] }; // Deselect all
      } else {
        return { ...prev, [subjectId]: [...subject.topics] }; // Select all
      }
    });
  };

  const handleSelectAllOverall = () => {
    const allSelected = SUBJECTS_DATA.every(s => (selectedTopics[s.id] || []).length === s.topics.length);
    if (allSelected) {
      setSelectedTopics({});
    } else {
      const all: Record<string, string[]> = {};
      SUBJECTS_DATA.forEach(s => {
        all[s.id] = [...s.topics];
      });
      setSelectedTopics(all);
    }
  };

  const selectedTopicsFlat = Object.entries(selectedTopics).flatMap(([subjectId, topics]: [string, string[]]) => {
    const combinedSubjects = [...TECHNICAL_SUBJECTS, ...NON_TECHNICAL_SUBJECTS];
    const subjectName = combinedSubjects.find(s => s.id === subjectId)?.name || subjectId;
    return topics.map(t => `${subjectName} - ${t}`);
  });

  const startTest = async () => {
    if (selectedTopicsFlat.length === 0) {
      toast.error("Please select at least one topic.");
      return;
    }
    
    setLoading(true);
    setLoadingStep(0);
    
    // Simulate animated loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => prev < 4 ? prev + 1 : prev);
    }, 1500);

    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: selectedTopicsFlat,
          difficulty: testDifficulty,
          count: testCount,
          categoryMode: examCategory
        })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
      }
      const data = await response.json();
      
      clearInterval(stepInterval);
      setLoadingStep(4); // Ensure it reaches the final step

      if (Array.isArray(data) && data.length > 0) {
        // Small delay to let the animation show completion
        setTimeout(() => {
          setQuestions(data);
          setConfigMode(false);
          setCurrentIndex(0);
          setAnswers({});
          setMarkedReview({});
          setIsSubmitted(false);
          setTimeSpent(0);
          setLoading(false);
          toast.success("Mock Test Generated Successfully");
        }, 800);
      } else {
        setLoading(false);
        toast.error("Failed to load questions. Please try again.");
      }
    } catch (e) {
      console.warn(e);
      clearInterval(stepInterval);
      setLoading(false);
      toast.error("Network issue detected. Make sure your server is running.");
    }
  };

  const handleAnswerSelect = (option: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [currentIndex]: option }));
  };

  const toggleMarkReview = () => {
    if (isSubmitted) return;
    setMarkedReview(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
  };

  const clearResponse = () => {
    if (isSubmitted) return;
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[currentIndex];
      return newAnswers;
    });
  };

  const submitTest = () => {
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    setIsSubmitted(true);
    setReviewMode(false);
    
    // SAVE TO SUPABASE
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const correctCount = questions.reduce((acc, q, idx) => {
           if (isCorrectAnswer(q, answers[idx])) return acc + 1;
           return acc;
        }, 0);
        
        const accuracy = Math.round((correctCount / questions.length) * 100);
        
        const examData = questions.map((q, idx) => ({
             question: q.question,
             options: q.options,
             correctAnswer: q.correctAnswer,
             userAnswer: answers[idx] || null,
             category: q.category,
             subtopic: q.subtopic,
             rationale: q.rationale || q.explanation || null,
             optionAnalysis: q.optionAnalysis || null,
             examTip: q.examTip || null,
             keyConcept: q.keyConcept || null,
             clinicalSignificance: q.clinicalSignificance || null,
             memoryTrick: q.memoryTrick || null,
             quickRevision: q.quickRevision || null,
             difficulty: q.difficulty
        }));

        await supabase.from('exam_results').insert({
          user_id: session.user.id,
          type: 'mock',
          score: correctCount,
          total_questions: questions.length,
          accuracy: accuracy,
          time_spent: timeSpent,
          questions: examData
        });
        
        const { data: analyticsData } = await supabase
          .from('analytics')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (analyticsData) {
           const newTotal = (analyticsData.total_tests || 0) + 1;
           const newAvg = Math.round(((analyticsData.average_accuracy || 0) * (analyticsData.total_tests || 0) + accuracy) / newTotal);
           
           // Identify weak topics for this test
           const tempWeak: string[] = [];
           questions.forEach((q, idx) => {
              if (!isCorrectAnswer(q, answers[idx]) && !tempWeak.includes(q.category)) {
                 tempWeak.push(q.category);
              }
           });
           
           const finalWeak = Array.from(new Set([...(analyticsData.weak_topics || []), ...tempWeak])).slice(0, 5);
           
           await supabase.from('analytics').update({
             total_tests: newTotal,
             average_accuracy: newAvg,
             weak_topics: finalWeak,
             readiness_score: Math.min(100, Math.round(newAvg * 1.1)),
             updated_at: new Date().toISOString()
           }).eq('user_id', session.user.id);
           
        } else {
           const tempWeak: string[] = [];
           questions.forEach((q, idx) => {
              if (!isCorrectAnswer(q, answers[idx]) && !tempWeak.includes(q.category)) {
                 tempWeak.push(q.category);
              }
           });
           await supabase.from('analytics').insert({
             user_id: session.user.id,
             total_tests: 1,
             average_accuracy: accuracy,
             weak_topics: tempWeak.slice(0, 5),
             readiness_score: Math.min(100, Math.round(accuracy * 1.1))
           });
        }
      }
    } catch (e) {
      console.warn('Failed to save attempt', e);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // RENDER CONFIG MODE
  if (configMode) {
    const allSelected = SUBJECTS_DATA.every(s => (selectedTopics[s.id] || []).length === s.topics.length);

    return (
      <div className="max-w-6xl mx-auto animate-in fade-in space-y-6 pb-12 relative">
        <MockGenerationLoader isVisible={loading} currentStep={loadingStep} />
        
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Settings className="w-8 h-8 text-teal-600" /> Advanced Mock Test Generator
            </h1>
            <p className="text-slate-500 mt-2">Customize your assessment by selecting specific subjects and topics.</p>
          </div>
          <LoadingButton 
            onClick={startTest} 
            loading={loading}
            loadingText="Building Smart Test..."
            disabled={selectedTopicsFlat.length === 0} 
            size="lg" 
            className="shadow-md text-lg px-8 h-12 bg-teal-600 hover:bg-teal-700"
          >
            Generate Test ({selectedTopicsFlat.length} Topics) <ChevronRight className="ml-2 w-5 h-5" />
          </LoadingButton>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Topics Selection */}
          <Card className="lg:col-span-2 border-slate-200 shadow-md">
            <div className="bg-slate-100 p-1 rounded-t-xl flex items-center justify-between mx-4 mt-4 border border-slate-200 shadow-sm relative overflow-hidden">
              <div 
                className={`absolute inset-y-1 bg-white rounded-lg shadow-sm transition-all duration-300 ease-out`}
                style={{
                  width: 'calc(33.333% - 4px)',
                  left: examCategory === 'technical' ? '4px' : examCategory === 'non-technical' ? 'calc(33.333% + 2px)' : 'calc(66.666% - 4px)'
                }}
              />
              <button 
                onClick={() => handleCategoryChange('technical')}
                className={`flex-1 py-2 text-sm font-semibold z-10 transition-colors ${examCategory === 'technical' ? 'text-teal-700' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Technical (Nursing)
              </button>
              <button 
                onClick={() => handleCategoryChange('non-technical')}
                className={`flex-1 py-2 text-sm font-semibold z-10 transition-colors ${examCategory === 'non-technical' ? 'text-teal-700' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Non-Technical
              </button>
              <button 
                onClick={() => handleCategoryChange('combined')}
                className={`flex-1 py-2 text-sm font-semibold z-10 transition-colors flex items-center justify-center gap-2 ${examCategory === 'combined' ? 'text-teal-700' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Combined Builder
              </button>
            </div>
            
            <CardHeader className="border-b border-slate-100 bg-white pb-4 mt-2">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <CardTitle className="text-xl">
                  {examCategory === 'technical' && 'Nursing Subjects'}
                  {examCategory === 'non-technical' && 'General Subjects'}
                  {examCategory === 'combined' && 'All Subjects Mix'}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search topics..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-48"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSelectAllOverall} className={allSelected ? "bg-teal-50 text-teal-700 border-teal-200" : ""}>
                    {allSelected ? "Deselect All" : "Select All Topics"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh] px-6 py-4">
                <div className="space-y-6">
                  {SUBJECTS_DATA.map(subject => {
                    const filteredTopics = subject.topics.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (filteredTopics.length === 0 && searchQuery) return null;
                    
                    const isAllSubjectSelected = filteredTopics.length > 0 && filteredTopics.every(t => (selectedTopics[subject.id] || []).includes(t));
                    const isSomeSubjectSelected = filteredTopics.some(t => (selectedTopics[subject.id] || []).includes(t));

                    return (
                      <div key={subject.id} className="border rounded-xl p-5 border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                          <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isAllSubjectSelected ? 'bg-teal-600 border-teal-600' : isSomeSubjectSelected ? 'bg-teal-500/20 border-teal-500' : 'border-slate-300 group-hover:border-teal-400'}`}>
                               {isAllSubjectSelected && <Check className="w-3.5 h-3.5 text-white" />}
                               {!isAllSubjectSelected && isSomeSubjectSelected && <div className="w-2.5 h-2.5 bg-teal-600 rounded-sm"></div>}
                             </div>
                             <input type="checkbox" className="hidden" checked={isAllSubjectSelected} onChange={() => handleSelectAllSubject(subject.id)} />
                             <span className="font-bold text-slate-800 text-lg group-hover:text-teal-600 transition-colors">{subject.name}</span>
                          </label>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600">{filteredTopics.length} Topics</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                          {filteredTopics.map(topic => {
                            const isSelected = (selectedTopics[subject.id] || []).includes(topic);
                            return (
                              <label key={topic} className="flex items-start gap-3 cursor-pointer group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className={`w-5 h-5 mt-0.5 shrink-0 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-teal-600 border-teal-600' : 'border-slate-300 bg-white group-hover:border-teal-400'}`}>
                                   {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={isSelected} onChange={() => handleToggleTopic(subject.id, topic)} />
                                <span className={`text-sm ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>{topic}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* RIGHT: Test Configuration */}
          <div className="space-y-6">
             <Card className="border-slate-200 shadow-md">
               <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
                 <CardTitle className="text-xl">Test Settings</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6 pt-6">
                 
                 {/* Number of Questions */}
                 <div className="space-y-3">
                   <label className="text-sm font-semibold text-slate-900">Number of Questions</label>
                   <div className="grid grid-cols-2 gap-3">
                     {[10, 25, 50, 100].map(num => (
                       <button
                         key={num}
                         onClick={() => setTestCount(num)}
                         className={`py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                           testCount === num 
                             ? 'border-blue-600 bg-blue-50 text-blue-700' 
                             : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                         }`}
                       >
                         {num}
                       </button>
                     ))}
                   </div>
                   {testCount > 25 && (
                     <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                       <Clock className="w-3 h-3" /> Generating {testCount} questions may take 15-30 seconds.
                     </p>
                   )}
                 </div>

                 <Separator />

                 {/* Difficulty */}
                 <div className="space-y-3">
                   <label className="text-sm font-semibold text-slate-900">Difficulty Level</label>
                   <div className="grid grid-cols-2 gap-3">
                     {['Simple (Easy)', 'Medium', 'Hard', 'Toughest', 'Mixed (Adaptive)'].map(diff => (
                       <button
                         key={diff}
                         onClick={() => setTestDifficulty(diff)}
                         className={`py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                           testDifficulty === diff 
                             ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                             : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                         }`}
                       >
                         {diff}
                       </button>
                     ))}
                   </div>
                 </div>

                 <Separator />

                 {/* Exam Mode Settings */}
                 <div className="space-y-4">
                   <label className="flex items-center justify-between cursor-pointer">
                     <span className="text-sm font-semibold text-slate-900">Negative Marking (1/4th)</span>
                     <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${negativeMarking ? 'bg-blue-600' : 'bg-slate-300'}`} onClick={() => setNegativeMarking(!negativeMarking)}>
                       <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${negativeMarking ? 'translate-x-5' : 'translate-x-0'}`}></div>
                     </div>
                   </label>
                 </div>
               </CardContent>
             </Card>

             <Card className="border-none shadow-md bg-gradient-to-br from-slate-900 to-slate-800 text-white">
               <CardContent className="p-6">
                 <h4 className="font-semibold text-lg flex items-center gap-2 mb-2"><ShieldAlert className="w-5 h-5 text-amber-400" /> CBT Instructions</h4>
                 <ul className="text-sm text-slate-300 space-y-2 list-disc pl-4 mt-4">
                   <li>Test begins immediately after generation.</li>
                   <li>You can mark questions for review.</li>
                   <li>Results and detailed explanations are shown after submission.</li>
                   <li>Do not refresh the page during the test.</li>
                 </ul>
               </CardContent>
             </Card>
          </div>
        </div>
      </div>
    );
  }

  // RENDER LOADING
  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-4 animate-in fade-in duration-300 relative">
        <div className="flex-1 flex flex-col gap-4 order-2 lg:order-1 h-full min-w-0 pointer-events-none">
          <div className="flex items-center justify-between shrink-0">
            <div className="w-48 h-8 bg-slate-200 animate-pulse rounded-md"></div>
            <div className="w-24 h-8 bg-slate-200 animate-pulse rounded-md"></div>
          </div>
          
          <Card className="border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden relative">
            <CardContent className="p-5 sm:p-8 flex-1 w-full">
              <div className="w-1/3 h-5 bg-slate-200 animate-pulse rounded-md mb-8"></div>
              <div className="space-y-4 mb-8">
                <div className="w-full h-6 bg-slate-200 animate-pulse rounded-md"></div>
                <div className="w-5/6 h-6 bg-slate-200 animate-pulse rounded-md"></div>
                <div className="w-4/6 h-6 bg-slate-200 animate-pulse rounded-md"></div>
              </div>
              
              <div className="space-y-3 mt-12">
                 {[1, 2, 3, 4].map(i => (
                   <div key={i} className="w-full h-16 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
                 ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:flex w-[320px] flex-col order-1 lg:order-2 h-full pointer-events-none">
           <Card className="border-slate-200 shadow-sm flex-1 flex flex-col h-full rounded-xl bg-white">
             <CardHeader className="bg-slate-100/50 rounded-t-xl py-4 pb-4 px-4 h-14 shrink-0 border-b border-slate-100"></CardHeader>
             <CardContent className="p-4 flex-1">
               <div className="grid grid-cols-5 gap-2">
                 {Array.from({length: 20}).map((_, i) => (
                   <div key={i} className="w-9 h-9 rounded-md bg-slate-100 animate-pulse"></div>
                 ))}
               </div>
             </CardContent>
           </Card>
        </div>

        {/* Loading Overlay */}
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center border border-slate-100">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center animate-pulse mb-6">
              <BrainCircuit className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Preparing Your Test...</h2>
            <p className="text-slate-500 font-medium text-sm mb-4">Searching question bank and securely fetching {selectedTopicsFlat.length} topics.</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
               <div className="bg-blue-600 h-1.5 rounded-full animate-[progress_2s_ease-in-out_infinite] w-full origin-left" style={{ animationName: 'indeterminate-progress' }}></div>
            </div>
            <style>{`
              @keyframes indeterminate-progress {
                0% { transform: scaleX(0); transform-origin: left; }
                50% { transform: scaleX(1); transform-origin: left; }
                50.1% { transform: scaleX(1); transform-origin: right; }
                100% { transform: scaleX(0); transform-origin: right; }
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  // RENDER ANALYTICS / RESULTS
  if (isSubmitted) {
    let score = 0;
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    const categoryStats: Record<string, { total: number; correct: number }> = {};
    questions.forEach((q, idx) => {
      if (!categoryStats[q.category]) categoryStats[q.category] = { total: 0, correct: 0 };
      categoryStats[q.category].total++;

      if (!answers[idx]) unattempted++;
      else if (isCorrectAnswer(q, answers[idx])) {
        correct++;
        score += 1;
        categoryStats[q.category].correct++;
      } else {
        incorrect++;
        if (negativeMarking) score -= 0.25;
      }
    });

    const accuracy = correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;
    const weakAreas = Object.entries(categoryStats).filter(([cat, stats]) => (stats.correct / stats.total) < 0.6).map(([cat]) => cat);
    const strongAreas = Object.entries(categoryStats).filter(([cat, stats]) => (stats.correct / stats.total) >= 0.8).map(([cat]) => cat);

    if (!reviewMode) {
      return (
        <div className="max-w-6xl mx-auto animate-in zoom-in-95 duration-300 pb-12 space-y-8">
          <Button variant="ghost" className="-ml-4 text-slate-500 mb-2" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Home
          </Button>
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><Target className="w-8 h-8 text-blue-600" /> Performance Dashboard</h1>
              <p className="text-slate-500 mt-1">Detailed analysis of your test attempt</p>
            </div>
            <Button size="lg" onClick={() => { setReviewMode(true); setReviewIndex(0); setReviewFilter('all'); }} className="bg-blue-600 hover:bg-blue-700 shadow-md">
              Review Questions <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-slate-500 uppercase">Final Score</p>
                <h2 className="text-3xl font-extrabold text-blue-700 mt-1">{score.toFixed(2)} <span className="text-lg text-slate-400">/ {questions.length}</span></h2>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-slate-500 uppercase">Accuracy</p>
                <h2 className="text-3xl font-extrabold text-emerald-600 mt-1">{accuracy}%</h2>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200 col-span-2 md:col-span-1">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-slate-500 uppercase">Exam Readiness</p>
                <div className="flex items-center gap-2 mt-1">
                   <h2 className="text-3xl font-extrabold text-amber-600">{Math.min(100, Math.round(accuracy * 1.1))}%</h2>
                   <Badge variant="outline" className={`ml-1 ${accuracy >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : accuracy >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                     {accuracy >= 70 ? 'High Pass Chance' : accuracy >= 50 ? 'Moderate Chance' : 'Low Pass Chance'}
                   </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-slate-500 uppercase">Time</p>
                <h2 className="text-3xl font-extrabold text-slate-800 mt-1">{formatTime(timeSpent)}</h2>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-slate-500 uppercase">Attempted</p>
                <h2 className="text-3xl font-extrabold text-purple-600 mt-1">{correct + incorrect} <span className="text-lg text-slate-400">/ {questions.length}</span></h2>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                    <CardTitle className="text-lg">Response Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium text-slate-700"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Correct Answers</div>
                      <span className="font-bold text-lg text-emerald-600">{correct}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium text-slate-700"><XCircle className="w-5 h-5 text-red-500" /> Incorrect Answers</div>
                      <span className="font-bold text-lg text-red-600">{incorrect}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium text-slate-700"><div className="w-5 h-5 rounded-full border-2 border-slate-300" /> Skipped</div>
                      <span className="font-bold text-lg text-slate-500">{unattempted}</span>
                    </div>
                    <Separator />
                    <Button variant="outline" className="w-full" onClick={() => { setReviewMode(true); setReviewFilter('incorrect'); }}>Review Incorrect Answers</Button>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                    <CardTitle className="text-lg">Subject Wise Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                     {Object.entries(categoryStats).map(([cat, stats]) => {
                        const wScore = Math.round((stats.correct / stats.total) * 100);
                        return (
                          <div key={cat} className="space-y-2">
                             <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-700">{cat}</span>
                                <span className={`font-bold ${wScore >= 70 ? 'text-emerald-600' : wScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{stats.correct}/{stats.total} ({wScore}%)</span>
                             </div>
                             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                <div className={`h-full ${wScore >= 70 ? 'bg-emerald-500' : wScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${wScore}%` }} />
                             </div>
                          </div>
                        );
                     })}
                  </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
              {weakAreas.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-2"><ShieldAlert className="w-5 h-5" /> Weak Areas to Revise</h3>
                  <p className="text-sm text-red-600 mb-3">You scored below 60% in these topics:</p>
                  <div className="flex flex-wrap gap-2">
                    {weakAreas.map(wa => (
                      <Badge key={wa} variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200">{wa}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {strongAreas.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2 mb-2"><CheckSquare className="w-5 h-5" /> Strong Topics</h3>
                  <p className="text-sm text-emerald-600 mb-3">Excellent performance (&gt;80%) in:</p>
                  <div className="flex flex-wrap gap-2">
                    {strongAreas.map(sa => (
                      <Badge key={sa} variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">{sa}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Personalized Study Plan */}
          <Card className="shadow-sm border-slate-200 mt-6 lg:mt-8">
             <CardHeader className="bg-blue-50/50 border-b border-blue-100 flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-blue-600" /> AI Personalized Study Plan</CardTitle>
                <div className="text-sm font-medium px-3 py-1 bg-white border border-slate-200 shadow-sm text-slate-600 rounded-full">1-Week Exam Prep</div>
             </CardHeader>
             <CardContent className="p-6">
                {studyPlanLoading ? (
                   <div className="flex flex-col items-center justify-center p-8 space-y-4">
                      <div className="relative relative w-12 h-12">
                         <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                      </div>
                      <p className="text-slate-500 font-medium">Analyzing your mistakes and generating study schedule...</p>
                   </div>
                ) : studyPlan ? (
                   <div className="markdown-body prose prose-slate max-w-none text-slate-700 leading-relaxed marker:text-slate-400">
                      <ReactMarkdown>{studyPlan}</ReactMarkdown>
                   </div>
                ) : (
                   <div className="text-red-500 font-medium p-4 border border-red-200 rounded-lg bg-red-50 text-center">Failed to generate study plan.</div>
                )}
             </CardContent>
          </Card>
        </div>
      );
    }

    // --- DETAILED REVIEW MODE ---
    const filteredQuestions = questions.map((q, idx) => ({ q, idx })).filter(({ q, idx }) => {
      if (reviewFilter === 'all') return true;
      const userAnswer = answers[idx];
      if (reviewFilter === 'skipped') return !userAnswer;
      if (reviewFilter === 'correct') return isCorrectAnswer(q, userAnswer);
      if (reviewFilter === 'incorrect') return !!userAnswer && !isCorrectAnswer(q, userAnswer);
      return true;
    });

    const currentReview = filteredQuestions[reviewIndex] || filteredQuestions[0];

    return (
      <div className="w-full mx-auto flex flex-col gap-4 animate-in fade-in duration-300 h-[calc(100vh-100px)] relative">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0">
          <Button variant="ghost" onClick={() => setReviewMode(false)} className="self-start -ml-2 text-slate-500">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            {(['all','correct','incorrect','skipped'] as const).map(f => (
              <button 
                key={f}
                onClick={() => { setReviewFilter(f); setReviewIndex(0); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${reviewFilter === f ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-w-0">
          {!currentReview ? (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-xl border-slate-200 bg-slate-50">
              <p className="text-slate-500 font-medium">No questions match the '{reviewFilter}' filter.</p>
            </div>
          ) : (
            <>
              {/* Review Question Area */}
              <Card className="flex-1 flex flex-col border-slate-200 shadow-md overflow-hidden order-2 lg:order-1">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                  <div>
                    <Badge variant="outline" className="bg-white mr-2">Q {currentReview.idx + 1}</Badge>
                    <span className="text-sm font-medium text-slate-500">of {questions.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setReviewIndex(i => Math.max(0, i-1))} disabled={reviewIndex === 0}><ArrowLeft className="w-4 h-4 mr-1" /> Prev</Button>
                    <Button variant="outline" size="sm" onClick={() => setReviewIndex(i => Math.min(filteredQuestions.length-1, i+1))} disabled={reviewIndex === filteredQuestions.length - 1}>Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto">
                  {(() => {
                    const { q: reviewQ, idx: globalIdx } = currentReview;
                    const userAnswer = answers[globalIdx];
                    const isCorrect = isCorrectAnswer(reviewQ, userAnswer);
                    const isUnattempted = !userAnswer;

                    return (
                      <div className="p-6 md:p-8 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="text-xl font-semibold text-slate-900 leading-relaxed">{reviewQ.question}</h3>
                          {isCorrect ? <Badge className="bg-emerald-500 shrink-0">Correct</Badge> : isUnattempted ? <Badge variant="secondary" className="shrink-0 bg-slate-200">Skipped</Badge> : <Badge variant="destructive" className="shrink-0">Incorrect</Badge>}
                        </div>

                        <div className="grid grid-cols-1 gap-4 mt-4">
                          {reviewQ.options.map((opt, optIdx) => {
                            const isThisOptionUserAnswer = opt === userAnswer;
                            const isThisOptionCorrectAnswer = isCorrectOptionIndex(reviewQ, optIdx);
                            
                            let bg = 'bg-white border-slate-200 text-slate-700';
                            let Icon = <div className="w-5 h-5 rounded-full border-2 border-slate-300" />;

                            if (isThisOptionCorrectAnswer) {
                              bg = 'bg-emerald-50 border-emerald-500 text-emerald-800 font-medium ring-1 ring-emerald-500';
                              Icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
                            } else if (isThisOptionUserAnswer && !isCorrect) {
                              bg = 'bg-red-50 border-red-300 text-red-800 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,0,0.03)_10px,rgba(255,0,0,0.03)_20px)]';
                              Icon = <XCircle className="w-5 h-5 text-red-500" />;
                            }

                            return (
                              <div key={opt} className={`p-4 sm:p-5 rounded-2xl border-2 flex items-start gap-4 h-auto min-h-fit overflow-visible ${bg}`}>
                                <div className="mt-0.5 shrink-0 w-6 h-6 flex items-center justify-center">{Icon}</div>
                                <span className="text-base sm:text-lg leading-relaxed break-words whitespace-normal flex-1" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                  {opt} 
                                  {isThisOptionUserAnswer && <span className="ml-2 text-xs font-bold uppercase tracking-wider opacity-70 inline-block align-middle bg-black/10 px-2 py-0.5 rounded-full">(Your Answer)</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-8 space-y-6">
                          {/* Main Rationale */}
                          <div className={`p-6 rounded-2xl border ${isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'}`}>
                            <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-3 text-lg"><BrainCircuit className={`w-5 h-5 ${isCorrect ? 'text-emerald-500' : 'text-blue-500'}`} /> Detailed Rationale</h4>
                            <p className="text-slate-700 leading-relaxed text-base whitespace-pre-wrap">{reviewQ.rationale || reviewQ.explanation}</p>
                          </div>

                          {/* Option Analysis */}
                          {reviewQ.optionAnalysis && Object.keys(reviewQ.optionAnalysis).length > 0 && (
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                              <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-slate-400" /> Option Analysis</h4>
                              <div className="space-y-4">
                                {Object.entries(reviewQ.optionAnalysis).map(([letter, analysis]) => {
                                   const isCorrectOption = isCorrectOptionIndex(reviewQ, letter.trim().toUpperCase().charCodeAt(0) - 65);
                                   return (
                                     <div key={letter} className="flex gap-4">
                                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold ${isCorrectOption ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {letter}
                                       </div>
                                       <div>
                                          <p className="text-slate-700 leading-relaxed"><span className="font-semibold text-slate-900">Why it's {isCorrectOption ? 'correct' : 'incorrect'}:</span> {analysis}</p>
                                       </div>
                                     </div>
                                   );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Key Concept & Quick Revision */}
                          <div className="grid sm:grid-cols-2 gap-4">
                            {reviewQ.keyConcept && (
                                <div className="bg-amber-50/60 border border-amber-200 p-5 rounded-2xl">
                                  <h5 className="font-bold text-amber-800 mb-2 flex items-center gap-2">📌 Key Concept</h5>
                                  <p className="text-amber-900/80 text-sm leading-relaxed">{reviewQ.keyConcept}</p>
                                </div>
                            )}
                            {reviewQ.quickRevision && (
                                <div className="bg-purple-50/60 border border-purple-200 p-5 rounded-2xl">
                                  <h5 className="font-bold text-purple-800 mb-2 flex items-center gap-2">📝 Quick Revision</h5>
                                  <p className="text-purple-900/80 text-sm leading-relaxed">{reviewQ.quickRevision}</p>
                                </div>
                            )}
                          </div>

                          {/* Mnemonics & Clinical Significance & Exam Tip */}
                          <div className="grid sm:grid-cols-3 gap-4">
                              {reviewQ.memoryTrick && (
                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                                  <h5 className="font-bold text-indigo-700 text-sm mb-2 flex items-center gap-2">🧠 Memory Trick</h5>
                                  <p className="text-indigo-900/80 text-sm">{reviewQ.memoryTrick}</p>
                                </div>
                              )}
                              {reviewQ.clinicalSignificance && (
                                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                                  <h5 className="font-bold text-rose-700 text-sm mb-2 flex items-center gap-2">🏥 Clinical Significance</h5>
                                  <p className="text-rose-900/80 text-sm">{reviewQ.clinicalSignificance}</p>
                                </div>
                              )}
                              {reviewQ.examTip && (
                                <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl">
                                  <h5 className="font-bold text-sky-700 text-sm mb-2 flex items-center gap-2">🎯 Exam Tip</h5>
                                  <p className="text-sky-900/80 text-sm">{reviewQ.examTip}</p>
                                </div>
                              )}
                          </div>

                          {/* Tags below */}
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 mt-6 !mt-8">
                             <Badge variant="outline" className="text-slate-500 font-normal py-1 px-3">Difficulty: <strong className="ml-1 text-slate-700">{reviewQ.difficulty}</strong></Badge>
                             <Badge variant="outline" className="text-slate-500 font-normal py-1 px-3">Subject: <strong className="ml-1 text-slate-700">{reviewQ.category}</strong></Badge>
                             <Badge variant="outline" className="text-slate-500 font-normal py-1 px-3">Topic: <strong className="ml-1 text-slate-700">{reviewQ.subtopic}</strong></Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Review Sidebar */}
              <div className="w-full lg:w-72 flex flex-col order-1 lg:order-2 h-full">
                <Card className="flex-1 flex flex-col shadow-md border-slate-200">
                  <CardHeader className="bg-slate-900 text-white rounded-t-xl py-4 pb-4">
                    <CardTitle className="text-md flex items-center gap-2"><Filter className="w-4 h-4" /> Jump to Question</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <ScrollArea className="flex-1 pr-4 -mr-4">
                      <div className="grid grid-cols-5 gap-2">
                        {filteredQuestions.map(({ q, idx: globalIdx }, localIdx) => {
                          const isCurrent = localIdx === reviewIndex;
                          const userAnswer = answers[globalIdx];
                          const isCorrect = isCorrectAnswer(q, userAnswer);
                          
                          let bgClass = "bg-slate-100 border-slate-200 text-slate-600";
                          if (!userAnswer) bgClass = "bg-slate-100 border-slate-300 text-slate-500";
                          else if (isCorrect) bgClass = "bg-emerald-100 border-emerald-300 text-emerald-700";
                          else bgClass = "bg-red-100 border-red-300 text-red-700";

                          return (
                            <button
                              key={globalIdx}
                              onClick={() => setReviewIndex(localIdx)}
                              className={`w-9 h-9 rounded-md border flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                                isCurrent ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:opacity-80'
                              } ${bgClass}`}
                            >
                              {globalIdx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // RENDER TEST INTERFACE
  const q = questions[currentIndex];
  
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = Math.round((answeredCount / questions.length) * 100);
  
  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col font-sans">
        {/* Sticky Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-blue-600" />
              <span className="hidden sm:inline">Nursing Exam Prep Simulator</span>
              <span className="sm:hidden">Exam Simulator</span>
            </h1>
            <Badge variant="secondary" className="hidden md:inline-flex bg-blue-50 text-blue-700 border border-blue-100">
              {examCategory === 'technical' ? 'Nursing Technical' : examCategory === 'non-technical' ? 'General' : 'Combined Test'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Progress</span>
              <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 shadow-sm ${timeSpent > 3600 ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
              <Clock className={`w-4 h-4 ${timeSpent > 3600 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} />
              <span className="font-mono font-bold text-base tracking-tight">{formatTime(timeSpent)}</span>
            </div>
            
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setNavigatorCollapsed(false)}>
              <LayoutGrid className="w-5 h-5 text-slate-700" />
            </Button>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left: Frozen Navigation Sidebar (Desktop) / Drawer (Mobile) */}
          {!navigatorCollapsed && (
             <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={() => setNavigatorCollapsed(true)} />
          )}

          <div className={`
             absolute inset-y-0 right-0 lg:relative lg:inset-auto lg:left-0 lg:right-auto z-40 bg-white shadow-2xl lg:shadow-none lg:border-r border-slate-200
             w-[280px] sm:w-[320px] transition-transform duration-300 ease-in-out shrink-0 flex flex-col
             ${navigatorCollapsed ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'}
          `}>
             <div className="p-4 border-b border-slate-800 flex items-center justify-between lg:justify-center bg-slate-900 text-white shrink-0">
               <h2 className="font-semibold flex items-center gap-2"><Navigation className="w-4 h-4 text-blue-400" /> Question Palette</h2>
               <Button variant="ghost" size="icon" className="lg:hidden text-white/70 hover:text-white mt-[-8px] mr-[-8px]" onClick={() => setNavigatorCollapsed(true)}>
                 <XCircle className="w-5 h-5" />
               </Button>
             </div>
             
             <div className="p-4 shrink-0 bg-slate-50 border-b border-slate-200">
               <div className="grid grid-cols-2 gap-3 text-xs font-medium text-slate-600">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div> Answered <span className="ml-auto text-slate-800 font-bold">{answeredCount}</span></div>
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white border-2 border-slate-300 shadow-sm"></div> Unanswered <span className="ml-auto text-slate-800 font-bold">{questions.length - answeredCount}</span></div>
                 <div className="flex items-center gap-2 col-span-2 mt-1"><div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-200"></div> Marked Review <span className="ml-auto text-slate-800 font-bold">{Object.values(markedReview).filter(Boolean).length}</span></div>
               </div>
             </div>
             
             <ScrollArea className="flex-1 p-4 bg-slate-50/50">
               <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
                 {questions.map((_, i) => {
                   const isCurrent = i === currentIndex;
                   const isAnswered = !!answers[i];
                   const isMarked = markedReview[i];
                   
                   let bgClass = "bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"; // Unanswered
                   if (isMarked) bgClass = "bg-purple-100 border-purple-400 text-purple-900";
                   else if (isAnswered) bgClass = "bg-emerald-100 border-emerald-400 text-emerald-900";
                   
                   return (
                     <button
                       key={i}
                       onClick={() => {
                         setCurrentIndex(i);
                         if (window.innerWidth < 1024) setNavigatorCollapsed(true);
                       }}
                       className={`w-full aspect-square rounded-lg border shadow-sm flex items-center justify-center font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                         isCurrent ? 'ring-2 ring-blue-600 ring-offset-2 !border-blue-600 scale-110 z-10 shadow-md' : ''
                       } ${bgClass}`}
                     >
                       {i + 1}
                       {isMarked && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-purple-600 rounded-full -translate-y-1/2 translate-x-1/2 border-2 border-white shadow-sm"></div>}
                     </button>
                   );
                 })}
               </div>
             </ScrollArea>
          </div>
          
          {/* Main Question Area - Independent Scrolling */}
          <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative min-h-0">
            <div className="flex-1 overflow-y-auto w-full relative">
              <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-10">
                
                {/* Question Card */}
                <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-visible transition-all duration-300 h-auto min-h-fit">
                  <CardContent className="p-5 sm:p-8 md:p-10">
                    <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                         <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center font-bold text-lg sm:text-xl border border-blue-100 shadow-inner shrink-0">
                           {currentIndex + 1}
                         </div>
                         <div>
                           <div className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-widest mb-0.5">Question</div>
                           <p className="text-xs sm:text-sm font-medium text-slate-700 leading-tight">{q.category} &gt; {q.subtopic}</p>
                         </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {q.language === 'mr' && (
                          <Badge variant="secondary" className="bg-[#FDA403]/10 text-[#FDA403] border-[#FDA403]/20 shadow-sm px-3 py-1 font-medium whitespace-nowrap">मराठी (Marathi)</Badge>
                        )}
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border border-slate-200 shadow-sm px-3 py-1 font-medium whitespace-nowrap">{q.difficulty}</Badge>
                      </div>
                    </div>
                    
                    <div className="w-full h-px bg-slate-100 mb-8" />
                    
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-medium text-slate-900 leading-[1.6] mb-10 whitespace-pre-wrap select-none font-sans" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {q.question}
                    </h3>
        
                    <div className="space-y-4">
                      {q.options.map((opt, i) => {
                        const isSelected = answers[currentIndex] === opt;
                        const optionLetter = String.fromCharCode(65 + i); // A, B, C, D
                        return (
                          <button
                            key={i}
                            onClick={() => handleAnswerSelect(opt)}
                            className={`w-full text-left p-4 sm:p-5 outline-none rounded-2xl border-2 transition-all flex items-start sm:items-center gap-4 group focus-visible:ring-4 focus-visible:ring-blue-100 h-auto min-h-fit overflow-visible ${
                              isSelected 
                                ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-sm ring-1 ring-blue-600' 
                                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm text-slate-700'
                            }`}
                            style={{ minHeight: '80px' }}
                          >
                            <div className={`mt-0.5 sm:mt-0 shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-colors ${
                              isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-300 bg-slate-50 text-slate-500 group-hover:border-blue-400 group-hover:text-blue-600'
                            }`}>
                              {isSelected ? <CheckCircle2 className="w-5 h-5 absolute" /> : optionLetter}
                              {isSelected && <span className="opacity-0">{optionLetter}</span>}
                            </div>
                            <span className="text-lg sm:text-xl leading-relaxed break-words whitespace-normal pt-1 sm:pt-0 flex-1" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                               {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Sticky Bottom Action Bar */}
            <div className="shrink-0 w-full bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] p-4 sm:px-6 md:px-8 z-20 pb-[max(1rem,env(safe-area-inset-bottom))]">
               <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                 
                 <div className="flex items-center gap-3 w-full sm:w-auto order-2 sm:order-1">
                   {/* Mark for Review Button */}
                   <Button 
                     variant="outline" 
                     size="lg"
                     onClick={toggleMarkReview} 
                     className={`flex-1 sm:flex-none rounded-xl border-2 h-14 ${markedReview[currentIndex] ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-inner' : 'text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                   >
                     <Flag className={`w-5 h-5 sm:mr-2 ${markedReview[currentIndex] ? 'fill-purple-600 text-purple-600' : ''}`} /> 
                     <span className="hidden sm:inline font-semibold">{markedReview[currentIndex] ? 'Marked for Review' : 'Mark for Review'}</span>
                     <span className="sm:hidden font-semibold">Review</span>
                   </Button>
                   
                   {/* Clear Response Button */}
                   <Button 
                     variant="ghost" 
                     size="lg"
                     onClick={clearResponse} 
                     disabled={!answers[currentIndex]} 
                     className="text-slate-500 font-semibold hover:text-slate-800 disabled:opacity-30 rounded-xl h-14"
                   >
                     Clear
                   </Button>
                 </div>
                 
                 <div className="flex items-center gap-3 w-full sm:w-auto ml-auto order-1 sm:order-2">
                   {/* Previous Button */}
                   <Button 
                     variant="secondary" 
                     size="lg"
                     onClick={() => setCurrentIndex(c => Math.max(0, c - 1))} 
                     disabled={currentIndex === 0}
                     className="rounded-xl font-semibold bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-sm flex-1 sm:flex-none h-14"
                   >
                      <ArrowLeft className="w-5 h-5 sm:mr-2 text-slate-500" /> <span className="hidden sm:inline">Previous</span>
                   </Button>
                   
                   {/* Next / Submit Button */}
                   {currentIndex < questions.length - 1 ? (
                     <Button 
                       size="lg"
                       onClick={() => setCurrentIndex(c => Math.min(questions.length - 1, c + 1))} 
                       className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex-2 sm:flex-none h-14 px-8 text-lg"
                     >
                       <span className="hidden sm:inline">Next Question</span> <span className="sm:hidden">Next</span> <ArrowRight className="w-6 h-6 ml-2" />
                     </Button>
                   ) : (
                     <Button 
                       size="lg"
                       onClick={submitTest} 
                       className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex-2 sm:flex-none h-14 px-8 text-lg animate-in fade-in"
                     >
                       Submit Exam <CheckCircle2 className="w-6 h-6 ml-2" />
                     </Button>
                   )}
                 </div>
                 
               </div>
            </div>
            
          </div>
        </div>
      </div>
      
      {/* Submit Confirmation Modal Overlay */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 border border-blue-100 shadow-sm mx-auto">
                <CheckSquare className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Submit Exam?</h2>
              <p className="text-slate-500 mb-8 font-medium text-center leading-relaxed">You are about to submit your exam. Once submitted, you cannot change your answers.</p>
              
              <div className="bg-slate-50 rounded-2xl p-5 space-y-3 mb-8 border border-slate-200 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Answered Questions</span>
                  <span className="font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg">{Object.keys(answers).length}</span>
                </div>
                <div className="w-full h-px bg-slate-200"></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Unanswered</span>
                  <span className="font-bold text-slate-600 bg-slate-200 px-3 py-1 rounded-lg">{questions.length - Object.keys(answers).length}</span>
                </div>
                <div className="w-full h-px bg-slate-200"></div>
                <div className="flex justify-between items-center">
                   <span className="text-slate-600 font-medium">Marked for Review</span>
                   <span className="font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-lg">{Object.values(markedReview).filter(Boolean).length}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full">
                <Button variant="outline" size="lg" className="flex-1 rounded-xl h-12 border-2 text-slate-600 font-semibold" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                <Button size="lg" className="flex-1 rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20" onClick={confirmSubmit}>Confirm Submit</Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
