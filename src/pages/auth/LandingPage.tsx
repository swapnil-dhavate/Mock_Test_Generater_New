/// <reference types="vite/client" />
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, Mail, CheckCircle2, ShieldCheck, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'forgot-password'>('landing');

  // Register State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;

      toast.success("Account created! You can now log in.");
      setView('login');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
       setLoading(false);
    }
  };

  // Real accounts can log in with either their actual email, or a short "username" that maps to a
  // dedicated internal email behind the scenes (e.g. admin-provisioned accounts without a real inbox).
  const resolveSyntheticEmail = (input: string) => `${input.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@nursai-app.com`;

  const handleLogin = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    if (!loginEmail || !loginPassword) return;

    setLoading(true);

    try {
      let { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        const synthetic = resolveSyntheticEmail(loginEmail);
        if (synthetic !== loginEmail.trim().toLowerCase()) {
          const retry = await supabase.auth.signInWithPassword({ email: synthetic, password: loginPassword });
          error = retry.error;
        }
      }

      if (error) throw error;
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Invalid Email or Password");
    } finally {
      setLoading(false);
    }
  };

  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    if (!resetEmail) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error: any) {
      toast.error(error.message || "Could not send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const renderLandingView = () => (
    <motion.div key="landing" 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 text-center max-w-5xl mx-auto"
    >
      <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/30">
        <Stethoscope className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
        NursAI Prep
      </h1>
      <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mb-12">
        Your complete, AI-powered educational ecosystem for nursing board exams. Master your knowledge with adaptive intelligence.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Button onClick={() => setView('login')} size="lg" className="text-lg px-8 py-6 rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
          Login
        </Button>
        <Button onClick={() => setView('register')} size="lg" variant="outline" className="text-lg px-8 py-6 rounded-2xl border-slate-200">
          Create Account
        </Button>
        <div className="flex items-center justify-center gap-2 px-4 py-2 opacity-50 sm:hidden">or</div>
        <Button 
          onClick={loginWithGoogle} 
          size="lg" 
          disabled={loading}
          className="text-lg px-8 py-6 rounded-2xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center gap-3 sm:ml-4"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-6 h-6" />}
          Continue with Google
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
        {[
          { icon: ShieldCheck, title: "Enterprise Grade", desc: "Built with secure, isolated data environments." },
          { icon: Stethoscope, title: "Clinical Readiness", desc: "Adaptive prep modeled on real nursing boards." },
          { icon: CheckCircle2, title: "AI Analytics", desc: "Real-time analysis of your weak areas." },
        ].map((feature, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
              <feature.icon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
            <p className="text-slate-500">{feature.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderLoginView = () => (
    <motion.div key="login" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full mx-auto p-6 md:p-10 bg-white rounded-[2rem] shadow-2xl border border-slate-100">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
        <p className="text-slate-500">Sign in to your NursAI account</p>
      </div>
      
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Email or Username</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input required type="text" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="pl-10 h-12 rounded-xl text-lg" placeholder="john.doe@example.com" />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <button type="button" onClick={() => setView('forgot-password')} className="text-sm text-blue-600 hover:underline">Forgot password?</button>
          </div>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input required type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="pl-10 h-12 rounded-xl text-lg" placeholder="••••••••" />
          </div>
        </div>
        
        <Button disabled={loading} type="submit" className="w-full h-12 rounded-xl text-lg bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
        </Button>
      </form>

      <div className="mt-8 flex items-center gap-4">
        <hr className="flex-1 border-slate-200" />
        <span className="text-sm text-slate-400">or continue with</span>
        <hr className="flex-1 border-slate-200" />
      </div>

      <Button variant="outline" className="w-full mt-8 h-12 rounded-xl" onClick={loginWithGoogle}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5 mr-3" />
        Google Account
      </Button>

      <p className="text-center mt-8 text-slate-500">
        Don't have an account? <button onClick={() => setView('register')} className="text-blue-600 font-medium hover:underline">Sign up</button>
      </p>

    </motion.div>
  );

  const renderRegisterDetailsView = () => (
    <motion.div key="register" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full mx-auto p-6 md:p-10 bg-white rounded-[2rem] shadow-2xl border border-slate-100">
      <div className="mb-8 text-center flex flex-col items-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h2>
        <p className="text-slate-500">Join NursAI and start preparing.</p>
      </div>

      <form onSubmit={handleCreateAccount} className="space-y-4">
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
           <Input required value={fullName} onChange={e => setFullName(e.target.value)} className="h-12 rounded-xl" placeholder="John Doe" />
        </div>
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
           <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" placeholder="john@example.com" />
        </div>
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
           <Input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl" placeholder="••••••••" />
           <p className="text-xs text-slate-400 mt-2">At least 6 characters.</p>
        </div>
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
           <Input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-12 rounded-xl" placeholder="••••••••" />
        </div>
        
        <Button disabled={loading} type="submit" className="w-full h-12 rounded-xl text-lg bg-slate-900 hover:bg-slate-800 mt-6">
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Account'}
        </Button>
      </form>
      <button onClick={() => setView('landing')} className="mt-8 text-sm text-slate-500 hover:text-slate-800 flex items-center justify-center w-full">
        back to home
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-blue-100/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-50/50 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full p-4">
        <AnimatePresence mode="wait">
          {view === 'landing' && renderLandingView()}
          {view === 'login' && renderLoginView()}
          {view === 'register' && renderRegisterDetailsView()}
          {view === 'forgot-password' && (
             <motion.div key="forgot-password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full mx-auto p-10 bg-white rounded-[2rem] shadow-2xl text-center">
                 <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
                 {resetSent ? (
                   <p className="text-slate-600 mb-6">If an account exists for that email, a reset link is on its way. Check your inbox.</p>
                 ) : (
                   <>
                     <p className="text-slate-500 mb-6">Enter your email address to reset.</p>
                     <Input className="mb-4" placeholder="Email Address" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
                     <Button disabled={loading} onClick={handleForgotPassword} className="w-full h-12 rounded-xl bg-blue-600">
                       {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send Reset Link'}
                     </Button>
                   </>
                 )}
                 <button onClick={() => { setView('login'); setResetSent(false); }} className="mt-4 text-sm text-slate-500">Back to Login</button>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
