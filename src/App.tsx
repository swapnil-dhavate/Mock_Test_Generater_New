import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { BrainCircuit, BookOpen, Stethoscope, LayoutDashboard, LogOut, Loader2, Sparkles, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

import DashboardPage from './pages/Dashboard';
import MockTestPage from './pages/MockTest';
import AiMentorPage from './pages/AiMentor';
import ExamPrepPage from './pages/ExamPrep';
import AdminPage from './pages/Admin';

import { Menu, X, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';

export interface FallbackAdmin {
  uid: "admin-local";
  role: "admin";
  username: "Admin";
  isFallbackAdmin: true;
}

const logout = async () => {
  sessionStorage.removeItem('fallback_admin');
  await supabase.auth.signOut();
};

function Navigation({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
  const location = useLocation();
  const path = location.pathname;

  const links = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5 flex-shrink-0" /> },
    { name: 'Exam Prep', path: '/prep', icon: <GraduationCap className="w-5 h-5 flex-shrink-0" /> },
    { name: 'Mock Test', path: '/test', icon: <BookOpen className="w-5 h-5 flex-shrink-0" /> },
    { name: 'AI Mentor', path: '/mentor', icon: <Sparkles className="w-5 h-5 flex-shrink-0" /> },
    { name: 'Admin', path: '/admin', icon: <ShieldCheck className="w-5 h-5 flex-shrink-0" /> },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setCollapsed(true)}
        />
      )}
      
      <nav 
        className={`bg-slate-900 text-slate-300 h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ${
          collapsed ? 'w-20 -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'
        }`}
      >
        <div className={`p-6 flex items-center justify-between text-white font-bold text-xl mb-6 transition-all`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <Stethoscope className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <span className={`transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>NursAI</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-2 px-4 overflow-y-auto overflow-x-hidden">
          {links.map(link => (
            <Link
              key={link.path}
              to={link.path}
              title={collapsed ? link.name : undefined}
              className={`flex items-center gap-3 rounded-lg transition-all ${collapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3'} ${
                path === link.path 
                  ? 'bg-blue-600/20 text-blue-400' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {link.icon}
              {!collapsed && <span>{link.name}</span>}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={async () => {
              await logout();
              window.location.reload();
            }}
            title={collapsed ? "Log out" : undefined}
            className={`flex items-center gap-3 w-full rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors ${collapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
        
        {/* Toggle Button for Desktop */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-8 bg-blue-600 text-white w-6 h-6 rounded-full items-center justify-center shadow-lg hover:bg-blue-700 transition"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </nav>
    </>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  
  // Auto collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    handleResize(); // Init Check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Navigation collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div className={`flex-1 transition-all duration-300 w-full ${collapsed ? 'md:ml-20' : 'md:ml-64'} flex flex-col`}>
         {/* Mobile Header to open menu */}
         <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
           <div className="flex items-center gap-3 font-bold text-slate-900">
             <Stethoscope className="w-6 h-6 text-blue-600" /> NursAI
           </div>
           <button onClick={() => setCollapsed(false)} className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-lg">
             <Menu className="w-6 h-6" />
           </button>
         </div>
         
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="mx-auto w-full max-w-[1600px] h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}



import LandingPage from './pages/auth/LandingPage';
import { Toaster } from 'sonner';

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [fallbackAdmin, setFallbackAdmin] = useState<FallbackAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionData = sessionStorage.getItem('fallback_admin');
    if (sessionData) {
      try {
        setFallbackAdmin(JSON.parse(sessionData));
      } catch(e) {}
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user && !fallbackAdmin) {
    return (
      <ErrorBoundary>
         <Toaster position="top-right" richColors />
         <LandingPage />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Layout><DashboardPage fallbackAdmin={fallbackAdmin} /></Layout>} />
          <Route path="/prep" element={<Layout><ExamPrepPage fallbackAdmin={fallbackAdmin} /></Layout>} />
          <Route path="/test" element={<Layout><MockTestPage fallbackAdmin={fallbackAdmin} /></Layout>} />
          <Route path="/test/review/:examId" element={<Layout><MockTestPage fallbackAdmin={fallbackAdmin} /></Layout>} />
          <Route path="/mentor" element={<Layout><AiMentorPage fallbackAdmin={fallbackAdmin} /></Layout>} />
          <Route path="/admin" element={<Layout><AdminPage fallbackAdmin={fallbackAdmin} /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
