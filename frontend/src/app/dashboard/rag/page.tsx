'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { api } from '../../../lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ policyTitle: string; sectionTitle: string; score: number }>;
}

export default function RAGPolicyPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your Enterprise HR Policy Assistant. You can ask me any questions regarding company leave policies, Sri Lankan statutory compliance (EPF, ETF, APIT), health insurance schemes, or terminal gratuity calculations.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    'How many days of paid casual leave am I entitled to in Sri Lanka?',
    'What are the hospitalization insurance limits for private hospitals?',
    'How is statutory gratuity calculated under Sri Lankan law?',
    'What are the APIT progressive tax slabs and rates?',
  ];

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPolicies = async () => {
    try {
      const res = await api.getPolicyList();
      if (res.success) setPolicies(res.data);
    } catch (e) {
      console.error('Failed to load policy list:', e);
    }
  };

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || input).trim();
    if (!q || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await api.askPolicyAssistant(q);
      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.answer,
            sources: res.data.relevantPolicies,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error connecting to the policy engine: ' + err.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-indigo-400" />
          Internal HR Policy Assistant (RAG Engine)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Zero-leakage local vector retrieval over company guidelines and Sri Lankan labor statutes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col h-[650px] shadow-2xl overflow-hidden">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-950/80 border border-slate-800/80 text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>

                  {/* Sources citation badges */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1.5 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-indigo-400" />
                        <span>Source Grounding (TF-IDF Similarity Match)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s, si) => (
                          <span
                            key={si}
                            className="px-2 py-0.5 rounded-md bg-slate-900 text-indigo-300 text-[10px] border border-slate-800 font-mono"
                          >
                            {s.policyTitle} &bull; {s.sectionTitle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 text-xs font-bold">
                    You
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start items-center text-xs text-slate-400 italic">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <span>Synthesizing answer from company knowledge base...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-3 bg-slate-950/40 border-t border-slate-800/60 overflow-x-auto flex gap-2">
            {samplePrompts.map((sp, i) => (
              <button
                key={i}
                onClick={() => handleSend(sp)}
                className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-all cursor-pointer shrink-0"
              >
                {sp}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any policy question (e.g. 'Can I carry forward casual leave?')..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>

        {/* Policies Indexed Sidebar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Active Policy Vault
            </h2>
          </div>
          <p className="text-[11px] text-slate-400">
            Semantic chunks parsed & vectorized locally for private zero-leakage enterprise inference.
          </p>

          <div className="space-y-2 mt-3">
            {policies.map((p: any, idx: number) => (
              <div key={idx} className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <div className="font-semibold text-xs text-white">{p.title}</div>
                <div className="text-[10px] text-indigo-400 mt-1">
                  {p.sectionsCount} indexed section chunks
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Statutory Compliance</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Grounded in the Shop & Office Act 1954, EPF Act 1958, ETF Act 1980, and Payment of Gratuity Act 1983.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
