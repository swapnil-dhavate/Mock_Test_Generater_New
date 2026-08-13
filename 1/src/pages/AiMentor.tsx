import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, User, Sparkles, Loader2, Stethoscope } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export default function AiMentorPage({ fallbackAdmin }: { fallbackAdmin?: any }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: 'Hello! I am your AI Clinical Mentor. I can help you understand nursing procedures, pharmacology, diseases, or provide memory tricks. What would you like to discuss today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/doubt-solver', {});
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
      }
      const data = await response.json();
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: data.reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.warn(e);
      const aiErrorMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: "I'm having trouble connecting to the network right now. Please try again." };
      setMessages(prev => [...prev, aiErrorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col pt-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-blue-600" /> AI Clinical Mentor
        </h1>
        <p className="text-slate-500 mt-2">Ask deeply technical nursing doubts, pathophysiology, or clinical reasoning workflows.</p>
      </div>

      <Card className="flex-1 flex flex-col border-none shadow-xl overflow-hidden rounded-2xl bg-white">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6 pb-20">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-slate-900 border-2 border-slate-700' : 'bg-blue-100 border-2 border-blue-200'}`}>
                  {m.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Stethoscope className="w-6 h-6 text-blue-600" />}
                </div>
                <div className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <span className="text-xs text-slate-400 font-medium mb-1 px-1">{m.role === 'user' ? 'You' : 'AI Mentor'}</span>
                  <div className={`px-6 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-sm'
                  }`}>
                     <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\\n/g, '<br/>').replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>') }} />
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm">
                  <Stethoscope className="w-6 h-6 text-blue-600" />
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-2xl rounded-tl-sm border border-slate-100 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-slate-500 font-medium">Analyzing concept...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 bg-white border-t">
          <form onSubmit={sendMessage} className="relative flex items-center max-w-4xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E.g., Explain the pathophysiology of Left-sided Heart Failure..."
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-full py-4 pl-6 pr-14 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg placeholder:text-slate-400 shadow-sm"
              disabled={loading}
            />
            <Button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-2 top-2 bottom-2 rounded-full w-12 h-12 p-0 bg-blue-600 hover:bg-blue-700 shadow-md flex items-center justify-center"
            >
              <Send className="w-5 h-5 text-white ml-0.5" />
            </Button>
          </form>
          <div className="text-center mt-3">
             <span className="text-xs text-slate-400">AI can make mistakes. Always verify clinical knowledge with WHO or CDC guidelines.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
