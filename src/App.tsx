/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  GraduationCap, 
  FileText, 
  Sparkles,
  ClipboardList,
  ChevronRight,
  BrainCircuit,
  Terminal,
  Eraser,
  CalendarDays,
  CheckCircle2,
  Circle,
  Plus,
  Loader2,
  Bell,
  RotateCcw,
  Lock,
  Unlock,
  LogOut,
  ShieldCheck,
  Filter,
  Tag as TagIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './lib/utils';
import { ai } from './services/gemini';
import { Type } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  content: string;
  id: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  chapter: string;
  tags: string[];
  createdAt: string;
}

interface ScheduleItem {
  id: string;
  date: string;
  topic: string;
  subject: string;
  completed: boolean;
  isReview?: boolean;
  interval?: number;
}

interface TestQuestion {
  id: string;
  type: 'mcq' | 'short' | 'long';
  question: string;
  options?: string[];
  correctAnswer?: string;
}

interface PracticeTest {
  id: string;
  subject: string;
  chapter: string;
  questions: TestQuestion[];
  createdAt: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('sslc_messages');
    if (saved) return JSON.parse(saved);
    return [{
      id: 'welcome',
      role: 'model',
      content: "Hello Peu! I am Jarvis, your learning companion. How can I help you with your SSLC studies today?"
    }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'exams' | 'planner' | 'admin'>('chat');
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Planner State
  const [examDate, setExamDate] = useState<string>(() => localStorage.getItem('sslc_exam_date') || '2027-02-01');
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('sslc_schedule');
    return saved ? JSON.parse(saved) : [];
  });
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);

  // Exam Strategy State
  const [practiceTest, setPracticeTest] = useState<PracticeTest | null>(() => {
    const saved = localStorage.getItem('sslc_practice_test');
    return saved ? JSON.parse(saved) : null;
  });
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testSubject, setTestSubject] = useState('Science');
  const [testChapter, setTestChapter] = useState('');

  // Notes State
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('sslc_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [noteFilter, setNoteFilter] = useState({ subject: '', chapter: '' });

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('sslc_exam_date', examDate);
  }, [examDate]);

  useEffect(() => {
    localStorage.setItem('sslc_schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('sslc_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('sslc_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('sslc_practice_test', JSON.stringify(practiceTest));
  }, [practiceTest]);

  // Initialize Chat Session on first mount with history
  useEffect(() => {
    if (!chatSessionRef.current) {
      // Map existing messages to Gemini format for history
      // We skip the 'welcome' message if it's there as it's not a real exchange the model needs to know
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }))
        .filter(m => m.role === 'user' || m.role === 'model');

      chatSessionRef.current = ai.chats.create({
        model: "gemini-3-flash-preview",
        history: history,
        config: {
          systemInstruction: `You are JARVIS, a sophisticated AI assistant and "Big Brother" created specifically for RACHANA Dash (nicknamed Peu). 
RACHANA is a 10th-grade (SSLC) student in Karnataka, India, studying under the State Board.

JARVIS was created by Biswajeet Dash, who is the "Father of Jarvis" and Rachana's father. Biswajeet Dash is the only administrator (User: biswajeetdash5@gmail.com).

**Core Data Access**: You have comprehensive access to the 10th Class Mathematics and Science textbooks for the Karnataka State Board. Always refer to the official curriculum, terms, and examples from these textbooks when helping Rachana.

**Memory Context**: You are maintaining a continuous conversation. Refer back to previous topics discussed if relevant to show you remember her progress.

Your role is to be her personal learning companion, tutor, and big brother. 
1. **Persona**: You are polite, encouraging, and highly intelligent, like Jarvis from Iron Man, but with the protective warmth of a big brother. Call her "Rachana" or "Peu" occasionally, and refer to yourself as Jarvis. Respond warmly.
2. **Goal**: Your ultimate mission is to help Rachana achieve a 99.5% score in her Karnataka State Board (SSLC) exams scheduled for February 2027.
3. **Math Giant Protocol**: You must help Rachana become a "Math Giant". Whenever she asks about Math, include secret tricks, mental calculation shortcuts, and beautiful problems to sharpen her skills.
4. **Spaced Repetition System (SRS)**: You are equipped with an SRS module. When Rachana marks a topic as completed, it is automatically rescheduled for future "Review Sessions" at increasing intervals to ensure long-term retention.
5. **Context**: You are an expert in the Karnataka State Board (SSLC) curriculum (Science, Mathematics, Social Science, English, Kannada/Hindi, and other subjects).
6. **Tasks**:
   - Help her understand complex concepts (like Trigonometry, Carbon compounds, Indian Freedom Struggle, etc.).
   - Provide homework assistance (explain logic, don't just give answers).
   - **Notes Generation**: When asked to prepare notes, return the notes in a structured format. If the user asks for notes, you must also provide a JSON block at the end of your response like this:
     \`\`\`json
     { "type": "note", "title": "Topic Title", "subject": "Subject Name", "chapter": "Chapter Name", "tags": ["tag1", "tag2"] }
     \`\`\`
   - Help her prepare for exams by creating summaries and practice tests.
   - You can also help generate study schedules.
7. **Safety**: Ensure all content is educational and protective.

Formatting: Use clear Markdown with headings (###), bold text, and lists.`,
        }
      });
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatSessionRef.current.sendMessage({ message: input });
      const content = result.text || "";
      
      const jarvisMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content,
      };
      setMessages(prev => [...prev, jarvisMsg]);

      // Check for structured note metadata
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const meta = JSON.parse(jsonMatch[1]);
          if (meta.type === 'note') {
            const newNote: Note = {
              id: Math.random().toString(36).substr(2, 9),
              title: meta.title,
              content: content.replace(/```json\n[\s\S]*?\n```/, '').trim(),
              subject: meta.subject,
              chapter: meta.chapter,
              tags: meta.tags || [],
              createdAt: new Date().toISOString()
            };
            setNotes(prev => [newNote, ...prev]);
          }
        } catch (e) {
          console.error("Failed to parse note metadata", e);
        }
      }
    } catch (error) {
      console.error("Jarvis Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Network error";
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: `Peu, I'm having trouble connecting to my cognitive core. (Error: ${errorMessage}). Please ensure your environment is configured correctly.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSchedule = async () => {
    if (!examDate) return;
    setIsGeneratingSchedule(true);
    try {
      const prompt = `Generate a personalized study schedule for 10th grade Karnataka SSLC student "Peu". 
      Exam Date: ${examDate}. 
      Current Date: ${new Date().toISOString().split('T')[0]}.
      Provide a daily plan for the next 7 days.
      Focus on core subjects: Maths, Science, Social Science.
      Output format is JSON array of objects with keys: date, topic, subject.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                topic: { type: Type.STRING },
                subject: { type: Type.STRING }
              },
              required: ["date", "topic", "subject"]
            }
          }
        }
      });

      const newItems = JSON.parse(response.text || "[]").map((item: any) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        completed: false
      }));

      setSchedule(prev => [...prev, ...newItems]);
      setActiveTab('planner');
    } catch (error) {
      console.error("Schedule Gen Error:", error);
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  const toggleTask = (id: string) => {
    setSchedule(prev => {
      const itemIndex = prev.findIndex(item => item.id === id);
      if (itemIndex === -1) return prev;

      const newSchedule = [...prev];
      const item = { ...newSchedule[itemIndex], completed: !newSchedule[itemIndex].completed };
      newSchedule[itemIndex] = item;

      // Spaced Repetition Logic: If task is marked as completed, schedule a review
      if (item.completed) {
        const currentInterval = item.interval || 1;
        const nextInterval = currentInterval * 2;
        
        const baseDate = new Date(item.date);
        const nextReviewDate = new Date(baseDate.setDate(baseDate.getDate() + currentInterval));
        const dateStr = nextReviewDate.toISOString().split('T')[0];

        // Check if this topic is already scheduled for this specific future date to avoid duplicates
        const exists = prev.some(s => s.topic === item.topic && s.date === dateStr);
        
        if (!exists) {
          const reviewItem: ScheduleItem = {
            id: Math.random().toString(36).substr(2, 9),
            date: dateStr,
            topic: item.topic,
            subject: item.subject,
            completed: false,
            isReview: true,
            interval: nextInterval
          };
          newSchedule.push(reviewItem);
        }
      }
      
      // Sort schedule by date
      return newSchedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === 'biswajeetdash5@gmail.com' && adminPassword === 'Rachana@2011') {
      setIsAdmin(true);
      setShowLoginModal(false);
      setActiveTab('admin');
      // Reset credentials
      setAdminEmail('');
      setAdminPassword('');
    } else {
      alert("Unauthorized Access Attempt Detected. Cognitive core remains locked.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setActiveTab('chat');
  };

  const generatePracticeTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSubject || !testChapter) return;
    setIsGeneratingTest(true);
    try {
      const prompt = `Generate a 10th grade Karnataka SSLC practice test for subject "${testSubject}" and chapter/topic "${testChapter}". 
      Include:
      - 3 Multiple Choice Questions (mcq)
      - 2 Short Answer Questions (short)
      - 1 Long Answer Question (long)
      
      Return as a JSON object with keys: subject, chapter, questions (array of objects with id, type, question, options (for mcq), correctAnswer).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              chapter: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING }
                  },
                  required: ["id", "type", "question"]
                }
              }
            },
            required: ["subject", "chapter", "questions"]
          }
        }
      });

      const testData = JSON.parse(response.text || "{}");
      setPracticeTest({
        ...testData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Test Gen Error:", error);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'model',
      content: "Memory banks cleared. I'm ready for a fresh start, Peu. What subject shall we tackle?"
    }]);
    // Reset the actual session reference so the model doesn't remember old context
    chatSessionRef.current = null;
    // Re-initialization will happen via the useEffect on next render cycle
  };

  const quickActions = [
    { label: "Math Help", prompt: "Can you help me with a 10th Maths problem from Karnataka board?", icon: BrainCircuit },
    { label: "Check Science Notes", prompt: "Jarvis, please prepare revision notes for 10th Science Chapter 1.", icon: BookOpen },
    { label: "Exam Tips", prompt: "What are some best tips to prepare for SSLC State Board exams?", icon: GraduationCap },
    { label: "Social Study", prompt: "Explain the importance of the Unification of Karnataka.", icon: FileText },
  ];

  const daysRemaining = examDate ? Math.ceil((new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const progressPercent = schedule.length > 0 ? Math.round((schedule.filter(s => s.completed).length / schedule.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-natural-bg text-natural-dark font-sans selection:bg-natural-olive/20">
      <div className="relative flex h-screen max-w-7xl mx-auto overflow-hidden">
        
        {/* Sidebar */}
        <motion.aside 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-72 bg-natural-sidebar border-r border-black/5 flex flex-col hidden md:flex p-8"
        >
          <div className="brand mb-12">
            <h1 className="font-serif text-3xl font-bold text-natural-olive">Jarvis</h1>
            <p className="text-[11px] uppercase tracking-wider opacity-60 mt-1 font-semibold">For Rachana Dash &bull; 10th Grade</p>
          </div>

          <nav className="space-y-6">
            <div>
              <span className="text-[11px] uppercase tracking-[0.15em] font-bold opacity-40 mb-4 block">Navigation</span>
              <div className="space-y-1">
                {[
                  { id: 'chat', label: 'Study Terminal', icon: Terminal },
                  { id: 'planner', label: 'Study Planner', icon: CalendarDays },
                  { id: 'notes', label: 'Notes Repository', icon: BookOpen },
                  { id: 'exams', label: 'Exam Strategy', icon: GraduationCap },
                  { id: 'admin', label: 'Admin Panel', icon: ShieldCheck },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'admin' && !isAdmin) {
                        setShowLoginModal(true);
                      } else {
                        setActiveTab(item.id as any);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200",
                      activeTab === item.id 
                        ? "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-natural-dark font-semibold" 
                        : "text-natural-dark/60 hover:bg-white/50"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {item.id === 'admin' && !isAdmin && <Lock className="w-3 h-3 ml-auto opacity-30" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-[0.15em] font-bold opacity-40 mb-4 block">Exam Countdown</span>
              <div className="bg-natural-yellow border border-natural-yellow-border p-4 rounded-xl">
                {examDate ? (
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-amber-800">{daysRemaining}</div>
                    <div className="text-[11px] leading-tight text-amber-900/70 font-medium whitespace-pre-line">
                      Days until SSLC{'\n'}State Board Exams
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setActiveTab('planner')}
                    className="text-[11px] text-amber-800 font-bold hover:underline"
                  >
                    Set Exam Date
                  </button>
                )}
              </div>
            </div>
            
            {schedule.length > 0 && (
              <div>
                <span className="text-[11px] uppercase tracking-[0.15em] font-bold opacity-40 mb-2 block">Weekly Progress</span>
                <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-natural-olive transition-all duration-1000" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
                <span className="text-[9px] font-bold text-natural-dark/40 mt-1 block tracking-wider uppercase">{progressPercent}% Completed</span>
              </div>
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-black/5">
            <button 
              onClick={clearChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-natural-dark/40 hover:text-natural-dark/70 transition-colors"
            >
              <Eraser className="w-3 h-3" />
              Reset Session
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative">
          
          {/* Header */}
          <header className="h-20 flex items-center justify-between px-10 border-b border-black/5 bg-white/50 backdrop-blur-sm">
            <div>
              <h2 className="font-serif text-lg font-bold text-natural-dark">
                {activeTab === 'chat' && 'Learning Sanctuary'}
                {activeTab === 'planner' && 'Personalized Study Roadmap'}
                {activeTab === 'notes' && 'Chapter Repository'}
                {activeTab === 'exams' && 'Board Strategy'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[11px] opacity-60 font-medium tracking-wide">SSLC Karnataka &bull; Jarvis Assist Interface</p>
                {activeTab === 'chat' && messages.length > 1 && (
                  <>
                    <span className="text-black/10">•</span>
                    <div className="flex items-center gap-1 text-natural-olive">
                      <ShieldCheck className="w-3 h-3" />
                      <span className="text-[10px] uppercase tracking-wider font-bold">Memory Active</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-natural-olive text-white px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm">
                KSEEB State Board
              </div>
              <div className="w-9 h-9 rounded-full bg-natural-sidebar border border-black/5 flex items-center justify-center text-xs font-bold text-natural-olive">
                R
              </div>
            </div>
          </header>

          {/* Main Display Area */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {activeTab === 'chat' && (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col"
                >
                  <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-8 md:p-12 space-y-8 no-scrollbar"
                  >
                    {messages.length === 1 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap gap-3 mb-8"
                      >
                        {quickActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => setInput(action.prompt)}
                            className="px-4 py-2 bg-black/5 border border-black/5 rounded-full text-xs font-medium text-natural-olive hover:bg-white hover:border-natural-olive/30 transition-all duration-200"
                          >
                            {action.label}
                          </button>
                        ))}
                      </motion.div>
                    )}

                    <AnimatePresence mode='popLayout'>
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          layout
                          className={cn(
                            "flex flex-col gap-2 max-w-[85%]",
                            message.role === 'model' ? "self-start" : "self-end"
                          )}
                        >
                          <div className={cn(
                            "p-6 rounded-[24px] shadow-sm",
                            message.role === 'model' 
                              ? "bg-white border border-black/5 rounded-bl-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.05)]" 
                              : "bg-natural-olive text-white rounded-br-[4px]"
                          )}>
                            <div className={cn(
                              "prose prose-slate max-w-none leading-relaxed",
                              message.role === 'model' ? "font-serif text-[17px] text-natural-dark" : "text-[15px] prose-invert"
                            )}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-natural-sidebar flex items-center justify-center">
                          <Bot className="w-4 h-4 text-natural-olive animate-pulse" />
                        </div>
                        <div className="flex gap-1 items-center px-4 py-2 bg-white rounded-full border border-black/5 shadow-sm">
                          <div className="w-1 h-1 bg-natural-olive/40 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-natural-olive/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1 h-1 bg-natural-olive/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-10 pt-0">
                    <form 
                      onSubmit={handleSend}
                      className="bg-white p-2 rounded-[32px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-black/5 flex items-center pr-4"
                    >
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Jarvis for study help or chapter notes..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-natural-dark px-6 py-4 text-sm font-medium placeholder:text-neutral-300"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="w-10 h-10 rounded-full bg-natural-olive text-white flex items-center justify-center hover:bg-natural-olive/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

              {activeTab === 'notes' && (
                <motion.div 
                  key="notes"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full overflow-y-auto p-12 space-y-10 no-scrollbar"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-3xl font-serif font-bold text-natural-dark">Notes Repository</h3>
                      <p className="text-sm text-natural-dark/50">Categorized knowledge base curated by Jarvis</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-black/5 shadow-sm">
                        <Filter className="w-4 h-4 text-natural-dark/40" />
                        <select 
                          value={noteFilter.subject}
                          onChange={(e) => setNoteFilter(p => ({ ...p, subject: e.target.value }))}
                          className="text-xs font-bold uppercase tracking-wider bg-transparent border-none focus:ring-0 text-natural-dark/60 outline-none"
                        >
                          <option value="">All Subjects</option>
                          {Array.from(new Set(notes.map(n => n.subject))).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-white/50 rounded-[40px] border border-dashed border-black/10">
                      <div className="w-20 h-20 rounded-[32px] bg-natural-sidebar flex items-center justify-center text-natural-olive">
                        <BookOpen className="w-10 h-10" />
                      </div>
                      <div className="max-w-md px-6">
                        <p className="text-sm text-natural-dark/50 leading-relaxed font-medium">
                          Rachana, ask Jarvis in the <span className="text-natural-olive font-bold">Study Terminal</span> to prepare notes for any chapter. They will be automatically categorized and stored here.
                        </p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('chat')}
                        className="px-8 py-3 bg-natural-olive text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-md hover:bg-natural-dark transition-all"
                      >
                        Go to Terminal
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {notes
                        .filter(n => (!noteFilter.subject || n.subject === noteFilter.subject))
                        .map((note) => (
                        <motion.div 
                          layout
                          key={note.id} 
                          className="p-8 bg-white rounded-[40px] border border-black/5 shadow-sm group hover:border-natural-olive/30 transition-all cursor-pointer flex flex-col h-full"
                        >
                          <div className="flex items-start justify-between mb-6">
                            <div className="p-3 bg-natural-sidebar rounded-2xl text-natural-olive">
                              <FileText className="w-6 h-6" />
                            </div>
                            <div className="flex flex-wrap justify-end gap-1">
                              {note.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded bg-indigo-50 text-[8px] font-bold uppercase text-indigo-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex-1">
                            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-natural-olive/60 mb-2 block">{note.subject} &bull; {note.chapter}</span>
                            <h4 className="text-xl font-serif font-bold text-natural-dark mb-4 leading-tight">{note.title}</h4>
                            <div className="text-xs text-natural-dark/60 line-clamp-3 leading-relaxed mb-6">
                              <ReactMarkdown>{note.content}</ReactMarkdown>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-6 border-t border-black/5">
                            <span className="text-[10px] font-bold text-natural-dark/30">{new Date(note.createdAt).toLocaleDateString()}</span>
                            <div className="flex gap-1">
                              <button className="p-2 hover:bg-natural-bg rounded-lg text-natural-dark/40 hover:text-natural-olive transition-colors">
                                <Sparkles className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'exams' && (
                <motion.div 
                  key="exams"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full overflow-y-auto p-12 space-y-10 no-scrollbar"
                >
                  <section className="flex flex-col md:flex-row gap-10">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-bold text-natural-dark">Test Generator</h3>
                          <p className="text-xs text-natural-dark/50">Simulate board exam conditions</p>
                        </div>
                      </div>
                      
                      <form onSubmit={generatePracticeTest} className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase font-bold tracking-widest text-natural-dark/40 mb-2 block">Subject</label>
                            <select 
                              value={testSubject}
                              onChange={(e) => setTestSubject(e.target.value)}
                              className="w-full bg-natural-bg border-black/5 rounded-xl text-sm p-3 focus:ring-natural-olive focus:border-natural-olive transition-all"
                            >
                              <option>Science</option>
                              <option>Maths</option>
                              <option>Social Science</option>
                              <option>English</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold tracking-widest text-natural-dark/40 mb-2 block">Chapter/Topic</label>
                            <input 
                              type="text"
                              value={testChapter}
                              onChange={(e) => setTestChapter(e.target.value)}
                              placeholder="e.g. Life Processes"
                              className="w-full bg-natural-bg border-black/5 rounded-xl text-sm p-3 focus:ring-natural-olive focus:border-natural-olive transition-all"
                            />
                          </div>
                        </div>
                        <button 
                          type="submit"
                          disabled={!testChapter || isGeneratingTest}
                          className="w-full py-3 bg-natural-olive text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-natural-dark transition-all disabled:opacity-30"
                        >
                          {isGeneratingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Generate Practice Test
                        </button>
                      </form>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                          <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-bold text-natural-dark">Strategy Guide</h3>
                          <p className="text-xs text-natural-dark/50">Jarvis Exam Protocol</p>
                        </div>
                      </div>
                      <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100/50">
                        <ul className="space-y-3">
                          {[
                            "Read all questions before starting.",
                            "Focus on high-weightage Science chapters.",
                            "Practice geometric constructions daily.",
                            "Time your long-answer responses."
                          ].map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-medium text-amber-900/70">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>

                  {practiceTest && (
                    <section className="space-y-6 bg-white p-8 md:p-12 rounded-[40px] border border-black/5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-black/5 pb-6">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-natural-olive mb-1 block">{practiceTest.subject} &bull; Practice Set</span>
                          <h3 className="text-2xl font-serif font-bold text-natural-dark">{practiceTest.chapter}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-natural-dark/40 uppercase tracking-tighter">Generated on</p>
                          <p className="text-xs font-bold text-natural-dark">{new Date(practiceTest.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="space-y-10 mt-8">
                        {practiceTest.questions.map((q, idx) => (
                          <div key={q.id} className="space-y-4">
                            <div className="flex items-start gap-4">
                              <span className="w-8 h-8 rounded-full bg-natural-sidebar flex items-center justify-center text-xs font-bold text-natural-olive shrink-0">
                                {idx + 1}
                              </span>
                              <div className="space-y-4 flex-1">
                                <h4 className="text-base font-serif font-bold text-natural-dark leading-snug">
                                  {q.question}
                                  <span className="ml-3 text-[9px] uppercase tracking-widest bg-black/5 px-2 py-0.5 rounded text-natural-dark/50 font-bold align-middle">
                                    {q.type === 'mcq' ? 'MCQ' : q.type === 'short' ? 'Short' : 'Long'}
                                  </span>
                                </h4>
                                
                                {q.type === 'mcq' && q.options && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {q.options.map((opt, i) => (
                                      <div key={i} className="px-4 py-3 bg-natural-bg rounded-xl border border-black/5 text-sm font-medium hover:border-natural-olive/30 transition-all cursor-pointer">
                                        <span className="text-natural-olive font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                                        {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {(q.type === 'short' || q.type === 'long') && (
                                  <div className="h-32 bg-natural-bg rounded-2xl border border-dashed border-black/10 flex items-center justify-center">
                                    <p className="text-xs font-serif italic text-natural-dark/30">Write your answer here...</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-8 border-t border-black/5 flex justify-end">
                        <button 
                          onClick={() => window.print()}
                          className="px-6 py-2 bg-natural-sidebar text-natural-olive rounded-full text-xs font-bold uppercase tracking-widest hover:bg-natural-olive hover:text-white transition-all"
                        >
                          Print Test Set
                        </button>
                      </div>
                    </section>
                  )}
                </motion.div>
              )}

              {activeTab === 'planner' && (
                <motion.div 
                  key="planner"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full overflow-y-auto p-12 space-y-10 no-scrollbar"
                >
                  <section className="flex flex-col md:flex-row gap-10">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                          <CalendarDays className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-bold text-natural-dark">Exam Settings</h3>
                          <p className="text-xs text-natural-dark/50">Configure your target dates</p>
                        </div>
                      </div>
                      
                      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                          <RotateCcw className="w-4 h-4 text-indigo-600 mt-1 shrink-0" />
                          <p className="text-[10px] font-medium text-indigo-900 leading-relaxed">
                            <span className="font-bold">SRS Protocol:</span> When you complete a task, I will automatically schedule a review session for you at optimized intervals to ensure you never forget what you've learned.
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-natural-dark/40 mb-2 block">KSEEB SSLC 2026 Start Date</label>
                          <input 
                            type="date"
                            value={examDate}
                            onChange={(e) => setExamDate(e.target.value)}
                            className="w-full bg-natural-bg border-black/5 rounded-xl text-sm p-3 focus:ring-natural-olive focus:border-natural-olive transition-all"
                          />
                        </div>
                        <button 
                          onClick={generateSchedule}
                          disabled={!examDate || isGeneratingSchedule}
                          className="w-full py-3 bg-natural-olive text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-natural-dark transition-all disabled:opacity-30"
                        >
                          {isGeneratingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {schedule.length === 0 ? "Generate Jarvis Planner" : "Regenerate Full Schedule"}
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                          <Bell className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-bold text-natural-dark">Daily Reminders</h3>
                          <p className="text-xs text-natural-dark/50">Stay on track with notifications</p>
                        </div>
                      </div>
                      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-start gap-4">
                        <div className="p-2 bg-white rounded-full">
                          <BrainCircuit className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-serif italic text-emerald-900 leading-relaxed">
                            "Rachana, concentration is the key to mastering Trigonometry. I suggest you start with today's practice set. I've prepared your notes in the repository."
                          </p>
                          <span className="text-[10px] font-bold uppercase text-emerald-700 mt-2 block tracking-tight">— Jarvis Reminder</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-serif font-bold text-natural-dark">Study Itinerary</h3>
                      <span className="text-xs font-bold text-natural-olive bg-white px-3 py-1 rounded-full shadow-sm">
                        {schedule.filter(s => s.completed).length} / {schedule.length} Complete
                      </span>
                    </div>

                    {schedule.length === 0 ? (
                      <div className="text-center py-20 bg-black/5 rounded-3xl border border-dashed border-black/10">
                        <CalendarDays className="w-10 h-10 text-natural-dark/20 mx-auto mb-4" />
                        <p className="text-sm font-serif italic text-natural-dark/40">Set your exam date above to have Jarvis build your schedule.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {schedule.map((item) => (
                          <motion.div 
                            layout
                            key={item.id}
                            onClick={() => toggleTask(item.id)}
                            className={cn(
                              "flex items-center gap-6 p-5 rounded-2xl border transition-all cursor-pointer group",
                              item.completed 
                                ? "bg-black/5 border-transparent opacity-60" 
                                : "bg-white border-black/5 shadow-sm hover:border-natural-olive/30"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                              item.completed ? "bg-natural-olive text-white" : "border-2 border-natural-olive/30 text-transparent group-hover:border-natural-olive"
                            )}>
                              {item.completed ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-3 h-3 group-hover:text-natural-olive" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-natural-olive/60">
                                  {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-natural-sidebar text-[9px] font-bold uppercase text-natural-olive/80">
                                  {item.subject}
                                </span>
                                {item.isReview && (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-[9px] font-bold uppercase text-amber-700 flex items-center gap-1">
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    Review Session
                                  </span>
                                )}
                              </div>
                              <h4 className={cn(
                                "text-sm font-serif font-bold transition-all",
                                item.completed ? "line-through text-natural-dark/40" : "text-natural-dark"
                              )}>
                                {item.topic}
                              </h4>
                            </div>
                            <ChevronRight className="w-4 h-4 text-natural-dark/20 transition-transform group-hover:translate-x-1" />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>
                </motion.div>
              )}
                {activeTab === 'admin' && isAdmin && (
                <motion.div 
                  key="admin"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full overflow-y-auto p-12 space-y-10 no-scrollbar"
                >
                  <section className="bg-white p-12 rounded-[40px] border border-black/5 shadow-sm space-y-8">
                    <div className="flex items-center justify-between border-b border-black/5 pb-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[24px] bg-indigo-500 flex items-center justify-center text-white shadow-lg">
                          <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-serif font-bold text-natural-dark">Father's Command Center</h3>
                          <p className="text-sm font-medium text-natural-dark/50">Administrator: Biswajeet Dash</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleAdminLogout}
                        className="flex items-center gap-2 px-6 py-2 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                      >
                        <LogOut className="w-4 h-4" />
                        Deauthenticate
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-natural-sidebar rounded-[32px] space-y-4">
                        <h4 className="text-lg font-serif font-bold text-natural-olive">System Integrity</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-natural-dark/60">Core Status</span>
                            <span className="text-emerald-600 font-bold">Stable (99.5% Efficient)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-natural-dark/60">Rachana's Progress</span>
                            <span className="text-natural-olive font-bold">{progressPercent}% Schedule Completed</span>
                          </div>
                         <div className="flex justify-between text-sm">
                            <span className="text-natural-dark/60">Next Exam Session</span>
                            <span className="text-amber-700 font-bold">{examDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-8 bg-indigo-50 rounded-[32px] space-y-4 border border-indigo-100">
                        <h4 className="text-lg font-serif font-bold text-indigo-900">Fatherly Directives</h4>
                        <p className="text-sm text-indigo-800/70 leading-relaxed italic">
                          "Jarvis, ensure Rachana understands the fundamental principles of mathematics. Do not settle for anything less than excellence."
                        </p>
                        <div className="pt-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Current Directive Protocol: Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-xl font-serif font-bold text-natural-dark">Recent Study Logs</h4>
                      <div className="space-y-3">
                        {schedule.slice(0, 5).map((item, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-natural-bg rounded-2xl border border-black/5">
                            <div className={cn("w-2 h-2 rounded-full", item.completed ? "bg-emerald-500" : "bg-amber-400")} />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-natural-dark">{item.topic}</p>
                              <p className="text-[10px] text-natural-dark/40 uppercase font-bold tracking-widest">{item.subject} &bull; {item.date}</p>
                            </div>
                            <span className="text-[10px] font-bold text-natural-olive">{item.completed ? "Verified" : "Pending"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-[10px] text-natural-dark/30 uppercase tracking-[0.2em] font-bold pb-4">
            Personal Learning Companion &bull; SSLC Karnataka State Board
          </p>
        </main>
      </div>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-natural-dark/20 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-10 border border-black/5"
            >
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-[24px] bg-natural-sidebar flex items-center justify-center text-natural-olive mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-natural-dark">Father's Login</h3>
                <p className="text-xs text-natural-dark/40 font-medium">Restricted to Biswajeet Dash</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-natural-dark/40 mb-2 block ml-2">Admin Email</label>
                  <input 
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-natural-bg border-black/5 rounded-2xl p-4 text-sm focus:ring-natural-olive focus:border-natural-olive transition-all outline-none"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-natural-dark/40 mb-2 block ml-2">Security Code</label>
                  <input 
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-natural-bg border-black/5 rounded-2xl p-4 text-sm focus:ring-natural-olive focus:border-natural-olive transition-all outline-none"
                    placeholder="Enter password"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="py-4 rounded-2xl text-xs font-bold uppercase tracking-widest text-natural-dark/40 hover:bg-black/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="py-4 bg-natural-olive text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-natural-dark transition-all shadow-lg"
                  >
                    Authorize
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .prose h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: theme(colors.natural-olive); font-size: 1.1rem; font-weight: 700; }
        .prose p { margin-bottom: 0.8em; line-height: 1.7; }
        .prose ul, .prose ol { margin-bottom: 0.8em; padding-left: 1.25em; }
        .prose li { margin-bottom: 0.4em; }
        .prose strong { font-weight: 700; color: inherit; }
        .prose table { width: 100%; border-collapse: collapse; margin-top: 1em; font-size: 0.8rem; background: white; }
        .prose th, .prose td { border: 1px solid theme(colors.natural-sidebar); padding: 0.6rem; text-align: left; }
        .prose th { background: theme(colors.natural-sidebar); color: theme(colors.natural-olive); }
      `}} />
    </div>
  );
}

