import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function DashboardPage({ fallbackAdmin }: { fallbackAdmin?: any }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fallbackAdmin) {
      setProfile({ name: fallbackAdmin.username });
      setAnalytics({ totalTests: 10, averageAccuracy: 85, weakTopics: ['Mock Default'], readinessScore: 90 });
      setRecentExams([
         { id: 'mock-1', score: 8, totalQuestions: 10, accuracy: 80, created_at: new Date() }
      ]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (user) {
        try {
          setProfile({ name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student' });

          const { data: analyticsData, error: analyticsError } = await supabase
            .from('analytics')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (analyticsData && !analyticsError) {
            setAnalytics(analyticsData);
          } else {
            setAnalytics({ totalTests: 0, averageAccuracy: 0, weakTopics: [], readinessScore: 0 });
          }
          
          const { data: examData, error: examError } = await supabase
            .from('exam_results')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (examData && !examError) {
            setRecentExams(examData);
          } else {
            setRecentExams([]);
          }
          
        } catch (error) {
          console.warn('Could not fetch user data:', error);
          setAnalytics({ totalTests: 0, averageAccuracy: 0, weakTopics: [], readinessScore: 0 });
          setRecentExams([]);
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/');
      }
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, fallbackAdmin]);

  if (loading) {
    return <div className="animate-pulse space-y-8">Loading dashboard...</div>;
  }

  const hasData = analytics?.totalTests > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, {profile?.name || 'Student'}</h1>
        <p className="text-slate-500 mt-2">Here is your isolated AI-generated exam readiness report.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm shadow-blue-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Readiness Score</CardTitle>
            <Target className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{analytics?.readinessScore || 0}%</div>
            {hasData ? <p className="text-xs text-slate-500 mt-1">Based on your attempts</p> : <p className="text-xs text-slate-500 mt-1">Take a test to update</p>}
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm shadow-green-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Tests</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{analytics?.totalTests || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Personal test history</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm shadow-orange-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Average Accuracy</CardTitle>
            <Clock className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{analytics?.averageAccuracy || 0}%</div>
            <p className="text-xs text-slate-500 mt-1">Across all attempts</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm shadow-red-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Weak Areas</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{analytics?.weakTopics?.length || 0}</div>
            {hasData ? <p className="text-xs text-slate-500 mt-1">Require immediate revision</p> : <p className="text-xs text-slate-500 mt-1">No data yet</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm shadow-slate-200">
          <CardHeader>
            <CardTitle>AI Study Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!hasData ? (
               <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-slate-500">
                 <p>Your dashboard is empty. Take your first mock test to populate your analytics and receive AI recommendations.</p>
               </div>
            ) : (
                <>
                {analytics?.weakTopics?.map((topic: string, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-orange-50/50 border border-orange-100">
                        <div className="w-2 h-full bg-orange-400 rounded-full"></div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">Revise: {topic}</h3>
                            <p className="text-sm text-slate-500 mt-1">Your accuracy needs improvement in this area.</p>
                        </div>
                        <Button variant="outline" size="sm" className="bg-white" onClick={() => navigate('/test')}>Focus Test</Button>
                    </div>
                ))}
                </>
            )}
            
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm shadow-slate-200 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-slate-100">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/test')} className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white" size="lg">
              Take Full Mock Test
            </Button>
            <Button onClick={() => navigate('/mentor')} variant="secondary" className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-slate-200" size="lg">
              Ask AI Mentor
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm shadow-slate-200">
        <CardHeader>
          <CardTitle>Recent Exams History</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentExams || recentExams.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
               No exams taken yet. Start taking mock tests to see your history here!
            </div>
          ) : (
            <div className="space-y-4">
              {recentExams.map((exam, idx) => {
                 // exam might use firestore timestamp or standard Date depending on fallback
                 const dateObj = exam.createdAt?.toDate ? exam.createdAt.toDate() : new Date(exam.createdAt || Date.now());
                 return (
                   <div key={exam.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all bg-white gap-4">
                     <div>
                       <h4 className="font-bold text-slate-900 text-lg">Mock Exam - Score: {exam.score}/{exam.totalQuestions}</h4>
                       <p className="text-sm text-slate-500 mt-1">Completed on {dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString()}</p>
                     </div>
                     <div className="flex items-center gap-4">
                       <div className="text-right">
                         <div className="text-2xl font-black text-blue-600">{exam.accuracy}%</div>
                         <div className="text-xs font-semibold text-slate-500 uppercase">Accuracy</div>
                       </div>
                       <Button onClick={() => navigate(`/test/review/${exam.id}`)} variant="outline" className="shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200">
                         View Details
                       </Button>
                     </div>
                   </div>
                 );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
