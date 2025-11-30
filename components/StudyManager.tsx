import React, { useState, useRef, useEffect } from 'react';
import { Task, ChatMessage, SubTask } from '../types';
import { generateStudyPlan, createStudyChat } from '../services/geminiService';
import { Plus, Clock, BrainCircuit, CheckSquare, Square, Trash2, X, MessageSquare, Send, ListTodo, Upload, FileText, Loader2, PlayCircle, PauseCircle, Sparkles, ChevronDown, ChevronUp, Zap, Tag, ExternalLink, Filter } from 'lucide-react';
import { Chat } from "@google/genai";
import { TaskEngine } from './TaskEngine';
import api from '../services/api';

interface StudyManagerProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id'>) => Promise<void>;
  onToggleTask: (id: string, completed: boolean) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

type Tab = 'PLAN' | 'CHAT' | 'AI_ENGINE';

export const StudyManager: React.FC<StudyManagerProps> = ({ tasks, onAddTask, onToggleTask, onDeleteTask }) => {
  const [activeTab, setActiveTab] = useState<Tab>('AI_ENGINE');

  // Plan State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [aiGoal, setAiGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Smart Feed State
  const [useSmartFeed, setUseSmartFeed] = useState(false);
  const [smartFeedTasks, setSmartFeedTasks] = useState<Task[]>([]);
  const [loadingSmartFeed, setLoadingSmartFeed] = useState(false);
  const [contextFilter, setContextFilter] = useState<'ALL' | 'PERSONAL' | 'PROFESSIONAL'>('ALL');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Timer State
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  // Chat State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'CHAT' && !chatSession) {
      initChat();
    }
  }, [activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, activeTab]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  useEffect(() => {
    if (useSmartFeed) {
      loadSmartFeed();
    }
  }, [useSmartFeed]);

  const loadSmartFeed = async () => {
    setLoadingSmartFeed(true);
    try {
      const response = await api.get('/smart-feed/');
      if (response.data.success) {
        setSmartFeedTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Failed to load smart feed:', error);
    } finally {
      setLoadingSmartFeed(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initChat = async () => {
    try {
      const chat = await createStudyChat(uploadedFile || undefined);
      setChatSession(chat);
      setChatMessages([
        {
          id: 'welcome',
          role: 'model',
          text: uploadedFile
            ? `I've read ${uploadedFile.name}. Ask me anything about it!`
            : "I'm your study assistant. Upload a PDF in the Tasks tab to study a specific document, or just ask me general questions!"
        }
      ]);
    } catch (e) {
      console.error("Failed to init chat", e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setChatSession(null);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setChatSession(null);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await onAddTask({
      title: newTaskTitle,
      completed: false,
      priority: 'MEDIUM',
      subject: 'General'
    });
    setNewTaskTitle('');
  };

  const handleGeneratePlan = async () => {
    if (!aiGoal.trim() && !uploadedFile) return;
    setIsGenerating(true);
    try {
      const prompt = aiGoal || (uploadedFile ? `Study plan for ${uploadedFile.name}` : "General study plan");
      const generatedTasks = await generateStudyPlan(prompt, "next 3 days", uploadedFile || undefined);

      for (const task of generatedTasks) {
        const { id, ...taskData } = task;
        await onAddTask(taskData);
      }
      setAiGoal('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentMessage.trim() || !chatSession || isSending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentMessage
    };

    setChatMessages(prev => [...prev, userMsg]);
    setCurrentMessage('');
    setIsSending(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg.text });
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text
      }]);
    } catch (error) {
      console.error("Chat error", error);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Sorry, I encountered an error. Please try again.",
        isError: true
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const toggleSubtask = async (taskId: string, subtaskIndex: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const updatedSubtasks = [...task.subtasks];
    updatedSubtasks[subtaskIndex] = {
      ...updatedSubtasks[subtaskIndex],
      completed: !updatedSubtasks[subtaskIndex].completed
    };

    try {
      await api.patch(`/tasks/${taskId}/`, { subtasks: updatedSubtasks });
    } catch (error) {
      console.error('Failed to update subtask:', error);
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getContextColor = (context?: string) => {
    switch (context) {
      case 'PROFESSIONAL': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PERSONAL': return 'bg-green-100 text-green-700 border-green-200';
      case 'MIXED': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEnergyColor = (energy?: string) => {
    switch (energy) {
      case 'HIGH': return 'text-red-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const displayTasks = useSmartFeed ? smartFeedTasks : tasks;
  const filteredTasks = contextFilter === 'ALL'
    ? displayTasks
    : displayTasks.filter(t => t.context === contextFilter);

  const renderTaskItem = (task: Task) => (
    <li key={task.id} className="group bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start space-x-3">
        <button
          onClick={() => onToggleTask(task.id, !task.completed)}
          className="text-slate-400 hover:text-primary-600 transition-colors flex-shrink-0 mt-1"
        >
          {task.completed ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <span className={`block font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
              {task.title}
            </span>
            <button
              onClick={() => onDeleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap gap-2 mb-2">
            {task.context && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getContextColor(task.context)}`}>
                {task.context}
              </span>
            )}
            {task.category && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                {task.category}
              </span>
            )}
            {task.energyLevel && (
              <span className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 ${getEnergyColor(task.energyLevel)}`}>
                <Zap className="h-3 w-3" />
                <span>{task.energyLevel}</span>
              </span>
            )}
            {task.estimatedDurationMinutes && (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                <Clock className="h-3 w-3" />
                <span>{task.estimatedDurationMinutes}m</span>
              </span>
            )}
            {task.relevanceScore !== undefined && useSmartFeed && (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="h-3 w-3" />
                <span>{Math.round(task.relevanceScore)}% match</span>
              </span>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center space-x-1 flex-wrap gap-1 mb-2">
              <Tag className="h-3 w-3 text-gray-400" />
              {task.tags.map((tag, idx) => (
                <span key={idx} className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* External Link */}
          {task.externalLink && (
            <a
              href={task.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 mb-2"
            >
              <ExternalLink className="h-3 w-3" />
              <span>View in Jira</span>
            </a>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => toggleTaskExpansion(task.id)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
              >
                <span className="font-medium">{task.subtasks.length} subtasks</span>
                {expandedTasks.has(task.id) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {expandedTasks.has(task.id) && (
                <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                  {task.subtasks.map((subtask, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <button
                        onClick={() => toggleSubtask(task.id, idx)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {subtask.completed ? (
                          <CheckSquare className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {subtask.title}
                        </p>
                        {subtask.estimatedMinutes && (
                          <p className="text-xs text-gray-500 flex items-center space-x-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{subtask.estimatedMinutes} min</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );

  return (
    <div className="min-h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] flex flex-col lg:flex-row gap-6 pb-20 md:pb-0">

      {/* Main Area */}
      <div className="flex-1 flex flex-col gap-4">

        {/* Tab Navigation */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100 self-start w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('AI_ENGINE')}
            className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'AI_ENGINE' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Engine
          </button>
          <button
            onClick={() => setActiveTab('PLAN')}
            className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'PLAN' ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            <ListTodo className="w-4 h-4 mr-2" />
            Tasks & Plan
          </button>
          <button
            onClick={() => setActiveTab('CHAT')}
            className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'CHAT' ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Study Chat {uploadedFile && <span className="ml-2 w-2 h-2 bg-emerald-500 rounded-full"></span>}
          </button>
        </div>

        {activeTab === 'AI_ENGINE' ? (
          <TaskEngine onTaskCreated={onAddTask} />
        ) : activeTab === 'PLAN' ? (
          <>
            {/* AI Generator Box */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-6 h-6 text-indigo-200" />
                  <h2 className="text-xl font-bold">Smart Plan</h2>
                </div>
              </div>

              <p className="text-indigo-100 mb-4 text-sm">
                Describe your goal or upload a PDF syllabus to generate a plan.
              </p>

              {uploadedFile && (
                <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 mb-3 w-fit animate-fade-in">
                  <FileText className="w-4 h-4 text-indigo-100 mr-2" />
                  <span className="text-sm font-medium truncate max-w-[200px]">{uploadedFile.name}</span>
                  <button onClick={clearFile} className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    placeholder={uploadedFile ? "e.g., Generate a 3-day review plan..." : "e.g., Prepare for History Final..."}
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-4 pr-10 py-3 md:py-2 text-white placeholder:text-indigo-200 focus:outline-none focus:bg-white/20 transition-colors"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,application/pdf"
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="cursor-pointer p-1.5 text-indigo-200 hover:text-white hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
                      title="Upload PDF"
                    >
                      <Upload className="w-4 h-4" />
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleGeneratePlan}
                  disabled={isGenerating || (!aiGoal && !uploadedFile)}
                  className="bg-white text-indigo-600 px-4 py-3 md:py-2 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-indigo-900/20"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                </button>
              </div>
            </div>

            {/* Task List with Smart Feed Toggle */}
            <div className="bg-white flex-1 rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-700">Study Tasks</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setUseSmartFeed(!useSmartFeed)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${useSmartFeed
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Smart Feed</span>
                    </button>
                    <span className="text-xs font-medium px-2 py-1 bg-slate-200 text-slate-600 rounded-full">
                      {filteredTasks.filter(t => !t.completed).length} Pending
                    </span>
                  </div>
                </div>

                {/* Context Filter */}
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <div className="flex space-x-1">
                    {(['ALL', 'PERSONAL', 'PROFESSIONAL'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setContextFilter(filter)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${contextFilter === filter
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {loadingSmartFeed ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <CheckSquare className="w-12 h-12 mb-3 opacity-20" />
                    <p>No tasks yet. Add one or ask AI!</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filteredTasks.map(task => renderTaskItem(task))}
                  </ul>
                )}
              </div>

              {/* Quick Add */}
              <form onSubmit={addTask} className="p-3 border-t border-slate-100 bg-slate-50/30">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 ring-primary-100 transition-shadow">
                  <Plus className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1 ml-2 focus:outline-none text-sm"
                    placeholder="Add a new task..."
                  />
                </div>
              </form>
            </div>
          </>
        ) : (
          /* Chat Interface */
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden animate-fade-in min-h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700">Study Assistant</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    {uploadedFile ? (
                      <>
                        <FileText className="w-3 h-3" />
                        Studying: {uploadedFile.name}
                      </>
                    ) : (
                      "General Knowledge Mode"
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-700 rounded-bl-none'
                    } ${msg.isError ? 'bg-red-50 text-red-500 border border-red-100' : ''}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-3 rounded-2xl rounded-bl-none">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-slate-50/30">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 ring-primary-100 transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={!currentMessage.trim() || isSending}
                  className="bg-primary-600 text-white p-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Right Sidebar: Focus Timer */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
          <div className="flex items-center justify-center mb-4 text-slate-500 gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Focus Timer</span>
          </div>

          <div className="relative w-48 h-48 mx-auto flex items-center justify-center mb-6">
            <svg className="absolute inset-0 w-full h-full text-slate-100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" />
            </svg>
            <svg className="absolute inset-0 w-full h-full text-primary-500 transition-all duration-1000 ease-linear" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * timeLeft / (25 * 60))}
                strokeLinecap="round"
              />
            </svg>
            <div className="relative z-10 text-5xl font-mono font-bold text-slate-700 tracking-tighter">
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setTimerActive(!timerActive)}
              className={`p-4 rounded-full transition-all duration-200 ${timerActive ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg'}`}
            >
              {timerActive ? <PauseCircle className="w-8 h-8" /> : <PlayCircle className="w-8 h-8" />}
            </button>
            <button
              onClick={() => { setTimerActive(false); setTimeLeft(25 * 60); }}
              className="p-4 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <span className="font-bold text-xs">RESET</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};