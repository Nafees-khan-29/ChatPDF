"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, 
  FileText, 
  Send, 
  Bot, 
  User, 
  Settings, 
  Loader2,
  ChevronDown,
  MoreVertical,
  Search,
  Zap,
  X,
  ChevronLeft
} from 'lucide-react';
import { Button } from './button';
import { useUser, SignInButton } from '@clerk/nextjs';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  source?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  status: 'processing' | 'ready' | 'error';
}

interface ChatListItem {
  id: number;
  title: string;
  updatedAt: string;
  messageCount: number;
  documentId?: number;
}

export function DocuChatInterface() {
  const { isSignedIn, user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(true);
  const [usageQuestionsToday, setUsageQuestionsToday] = useState<number>(0);
  const [usageDocumentsToday, setUsageDocumentsToday] = useState<number>(0);
  const [creatingChat, setCreatingChat] = useState(false);

  // Safely parse responses as JSON; if not JSON, return raw text under __raw
  const parseJsonSafe = useCallback(async (res: Response) => {
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return { __raw: txt } as any; }
  }, []);

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        text: "👋 Welcome to DocuChat! Upload a document (PDF, DOCX, or TXT) to get started. I can help you analyze, summarize, and answer questions about your documents.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Refs for animations
  const containerRef = useRef<HTMLDivElement>(null);
  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // File upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!isSignedIn) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'Please sign in to upload and analyze documents.',
        sender: 'bot',
        timestamp: new Date(),
      }]);
      return;
    }
    for (const file of acceptedFiles) {
      const newFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36),
        name: file.name,
        size: file.size,
        uploadedAt: new Date(),
        status: 'processing'
      };

      // Add to UI immediately
      setUploadedFiles(prev => [...prev, newFile]);
      
      try {
        const formData = new FormData();
        formData.append('file', file);

        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        let result;
        try {
          result = await parseJsonSafe(response);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error('Invalid response from server');
        }

        // Validate result structure
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid response format from server');
        }

        if (response.ok) {
          // Update file status to ready and swap temp ID with real document ID
          const realId = String(result.document?.id || result.documentId || '');
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === newFile.id 
                ? { ...f, id: realId || f.id, status: 'ready', size: result.document?.fileSize ?? f.size }
                : f
            )
          );
          
          // Set current document ID for chat context
          if (result.document?.id) {
            setCurrentDocumentId(result.document.id as number);
          } else if (result.documentId) {
            // Backward compatibility if API returns documentId directly
            setCurrentDocumentId(result.documentId as number);
          }
          
          // Show success message
          const successMessage: Message = {
            id: Date.now().toString(),
            text: `✅ Document "${file.name}" uploaded successfully! You can now ask questions about it.`,
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, successMessage]);
        } else {
          // Update file status to error
          setUploadedFiles(prev => 
            prev.map(f => f.id === newFile.id ? { ...f, status: 'error' } : f)
          );
          
          // Show error message
          const errorMessage: Message = {
            id: Date.now().toString(),
            text: `❌ Failed to upload "${file.name}". Please try again.`,
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } catch (error) {
        // Enhanced error logging with better debugging info
        const errorDetails = {
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'Unknown',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          originalError: error
        };
        
        console.error('Upload error details:', errorDetails);
        console.error('Raw error object:', error);
        
        // Update file status to error
        setUploadedFiles(prev => 
          prev.map(f => f.id === newFile.id ? { ...f, status: 'error' } : f)
        );
        
        // Determine error message based on error type
        let errorMsg = 'Network error. Please check your connection and try again.';
        if (error instanceof Error && error.name === 'AbortError') {
          errorMsg = 'Upload timeout. Please try with a smaller file or check your connection.';
        } else if (error instanceof Error && error.message) {
          errorMsg = error.message;
        }
        
        // Show specific error message
        const errorMessage: Message = {
          id: Date.now().toString(),
          text: `❌ Upload failed for "${file.name}": ${errorMsg}`,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true,
  });

  // Initial load animations (optimized)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Use requestAnimationFrame for better performance
    const performAnimations = () => {
      const tl = gsap.timeline();
      
      // 1. Initial Load: Entire app container fade and slide up
      if (containerRef.current) {
        tl.fromTo(containerRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
        )
      }
      
      // 2. Staggered Sidebar: File list items animate in sequence (cached selector with safety check)
      const fileItems = containerRef.current?.querySelectorAll(".file-item");
      if (fileItems && fileItems.length > 0) {
        // Verify elements exist before animating
        const validElements = Array.from(fileItems).filter(el => el instanceof HTMLElement);
        if (validElements.length > 0) {
          tl.fromTo(validElements,
            { opacity: 0, x: -50 },
            { 
              opacity: 1, 
              x: 0, 
              duration: 0.6, 
              ease: "back.out(1.2)",
              stagger: 0.1
            },
            "-=0.4"
          )
        }
      }
      
      // 3. Chat messages animate in (cached selector with safety check)
      const messageBubbles = containerRef.current?.querySelectorAll(".message-bubble");
      if (messageBubbles && messageBubbles.length > 0) {
        const validBubbles = Array.from(messageBubbles).filter(el => el instanceof HTMLElement);
        if (validBubbles.length > 0) {
          tl.fromTo(validBubbles,
            { opacity: 0, y: 20, scale: 0.8 },
            { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              duration: 0.5,
              ease: "back.out(1.1)",
              stagger: 0.2
            },
            "-=0.3"
          )
        }
      }
      
      // 4. Settings panel slides in (with ref safety check)
      if (rightSidebarRef.current && rightSidebarRef.current instanceof HTMLElement) {
        tl.fromTo(rightSidebarRef.current,
          { opacity: 0, x: 50 },
          { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" },
          "-=0.5"
        );
      }
    };

    // Debounce animations with requestAnimationFrame
    const animationFrame = requestAnimationFrame(performAnimations);
    return () => cancelAnimationFrame(animationFrame);
  }, []); // Remove unnecessary dependencies

  const removeDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/upload?documentId=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
        if (currentDocumentId && String(currentDocumentId) === id) {
          setCurrentDocumentId(null);
        }
      }
    } catch {}
  };

  const selectCurrentDocument = (id: string) => {
    const num = parseInt(id);
    if (!isNaN(num)) setCurrentDocumentId(num);
  };

  // Load chat history list
  useEffect(() => {
    // Only fetch if user is signed in
    if (!isSignedIn || !user) return;
    
    let active = true;
    const loadChats = async () => {
      try {
        const res = await fetch('/api/chats?limit=50');
        if (!res.ok || !active) return;
        const data = await parseJsonSafe(res);
        if (!active) return;
        setChatList((data?.chats || []).map((c: any) => ({
          id: c.id,
          title: c.title || 'Untitled',
          updatedAt: c.updatedAt,
          messageCount: c.messageCount || 0,
          documentId: c.documentId || undefined,
        })));
      } catch (e) {
        console.log('Chats fetch failed:', e);
      }
    };
    
    loadChats();
    const t = setInterval(loadChats, 120000); // Reduced frequency to 2 minutes
    return () => { active = false; clearInterval(t); };
  }, [isSignedIn, user]); // Add dependencies

  const loadChatMessages = async (chatId: number) => {
    try {
      const res = await fetch(`/api/messages?chatId=${chatId}`);
  const data = await parseJsonSafe(res);
      if (!res.ok) return;
      setCurrentChatId(String(chatId));
      setCurrentDocumentId(data?.chat?.documentId ?? null);
      const mapped: Message[] = data.messages.map((m: any) => ({
        id: String(m.id),
        text: m.content,
        sender: m.role === 'USER' ? 'user' : 'bot',
        timestamp: new Date(m.createdAt),
      }));
      setMessages(mapped.length ? mapped : messages);
    } catch {}
  };

  const deleteChat = async (chatId: number) => {
    if (!confirm('Delete this chat?')) return;
    try {
      const res = await fetch(`/api/chats?chatId=${chatId}`, { method: 'DELETE' });
      if (res.ok) {
        setChatList((prev) => prev.filter(c => c.id !== chatId));
        if (String(chatId) === currentChatId) {
          setCurrentChatId(null);
          setMessages((prev) => prev.filter(m => m.id === 'welcome'));
        }
      }
    } catch {}
  };

  // Animate new messages & scroll to bottom
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lastBubble = document.querySelector('.message-bubble:last-child');
    if (messages.length > 2 && lastBubble) { // Skip initial messages
      gsap.fromTo(lastBubble,
        { opacity: 0, y: 20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.1)" }
      );
    }
    // scroll bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Animate new files
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lastFileItem = document.querySelector('.file-item:last-child');
    if (lastFileItem) {
      gsap.fromTo(lastFileItem,
        { opacity: 0, x: -30, scale: 0.9 },
        { opacity: 1, x: 0, scale: 1, duration: 0.6, ease: "elastic.out(1, 0.8)" }
      );
    }
  }, [uploadedFiles]);

  // AI Thinking animation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const thinkingDots = document.querySelectorAll('.thinking-dot');
    if (isThinking && thinkingDots.length > 0) {
      gsap.to(thinkingDots, {
        y: -8,
        duration: 0.6,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.1
      });
    }
  }, [isThinking]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Safety checks to prevent runtime errors
    if (!isSignedIn || !user) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: 'Please sign in to start chatting.',
        sender: 'bot',
        timestamp: new Date(),
      }]);
      return;
    }
    
    if (!inputText?.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputText;
    setInputText('');
    setIsThinking(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          chatId: currentChatId,
          documentId: currentDocumentId,
          model: selectedModel,
        }),
      });

  const result = await parseJsonSafe(response);

      if (response.ok) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: result.message || 'I apologize, but I couldn\'t generate a response.',
          sender: 'bot',
          timestamp: new Date(),
          source: result.source || undefined
        };
        setMessages(prev => [...prev, botMessage]);
        
        // Update current chat ID if this is a new chat
        if (result.chatId && !currentChatId) {
          setCurrentChatId(result.chatId.toString());
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: result.error || 'Sorry, I encountered an error while processing your request. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I couldn\'t connect to the server. Please check your connection and try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  // Fetch usage stats (questions/documents today) periodically
  useEffect(() => {
    // Only fetch if user is signed in
    if (!isSignedIn || !user) return;
    
    let isMounted = true;
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/usage');
        if (!res.ok || !isMounted) return;
        const data = await parseJsonSafe(res);
        if (!isMounted) return;
        setUsageQuestionsToday(data?.questionsToday ?? 0);
        setUsageDocumentsToday(data?.documentsToday ?? 0);
      } catch (e) {
        console.log('Usage fetch failed:', e);
      }
    };
    
    fetchUsage();
    const id = setInterval(fetchUsage, 60000); // Reduced frequency to 60 seconds
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [isSignedIn, user]); // Add dependencies

  // Poll backend for recent documents to reflect processing status
  useEffect(() => {
    // Only fetch if user is signed in
    if (!isSignedIn || !user) return;
    
    let alive = true;
    const fetchDocs = async () => {
      try {
        const res = await fetch('/api/upload?limit=5');
        if (!res.ok || !alive) return;
        const data = await parseJsonSafe(res);
        const docs = data?.documents ?? [];
        if (!alive) return;
        const mapped: UploadedFile[] = docs.map((d: any) => ({
          id: String(d.id),
          name: d.fileName,
          size: d.fileSize ?? 0,
          uploadedAt: new Date(d.createdAt ?? Date.now()),
          status: String(d.status).toLowerCase() === 'ready' ? 'ready' : (String(d.status).toLowerCase() === 'error' ? 'error' : 'processing'),
        }));
        setUploadedFiles(mapped);
      } catch (e) {
        console.log('Documents fetch failed:', e);
      }
    };
    
    fetchDocs();
    const interval = setInterval(fetchDocs, 90000); // Reduced frequency to 90 seconds
    return () => { alive = false; clearInterval(interval); };
  }, [isSignedIn, user]); // Add dependencies

  const toggleSettings = () => {
    setSettingsExpanded(!settingsExpanded);
    
    // Animate settings panel expansion/collapse
    gsap.to(rightSidebarRef.current, {
      width: settingsExpanded ? '60px' : '320px',
      duration: 0.4,
      ease: "power2.inOut"
    });
    
    gsap.to(".settings-content", {
      opacity: settingsExpanded ? 0 : 1,
      duration: 0.3,
      delay: settingsExpanded ? 0 : 0.2
    });
  };

  const closeSettings = () => {
    setSettingsVisible(false);
    gsap.to(rightSidebarRef.current, {
      width: '0px',
      duration: 0.4,
      ease: "power2.inOut"
    });
  };

  const showSettings = () => {
    setSettingsVisible(true);
    setSettingsExpanded(true);
    gsap.to(rightSidebarRef.current, {
      width: '320px',
      duration: 0.4,
      ease: "power2.inOut"
    });
    gsap.to(".settings-content", {
      opacity: 1,
      duration: 0.3,
      delay: 0.2
    });
  };

  return (
    <div 
      ref={containerRef}
      className="h-full flex overflow-hidden"
    >
      {/* Left Sidebar - File Upload */}
      <div 
        ref={leftSidebarRef}
        className="w-80 bg-white/70 backdrop-blur-xl border-r border-blue-100/50 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-blue-100/50">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Documents</h2>
          <p className="text-sm text-gray-500">
            {uploadedFiles.length === 0 
              ? 'No documents uploaded yet' 
              : `Analyzing ${uploadedFiles.filter(f => f.status === 'ready').length} of ${uploadedFiles.length} documents...`
            }
          </p>
        </div>

        {/* Upload Zone */}
        <div className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
              ${isDragActive 
                ? 'border-blue-400 bg-blue-50/80 scale-105' 
                : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-700">
                  {isDragActive ? 'Drop files here' : 'Drag & Drop PDF or DOCX files here'}
                </p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Document & Chat History */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {uploadedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <FileText className="h-8 w-8 mb-2" />
              <p className="text-sm text-center">No documents uploaded yet</p>
              <p className="text-xs text-gray-400 mt-1">Drag & drop files above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const current = uploadedFiles.find(
                  (f) => currentDocumentId && String(currentDocumentId) === f.id
                );
                if (!current) {
                  return (
                    <div className="text-center text-sm text-gray-500">
                      No current document selected
                    </div>
                  );
                }
                return (
                  <div
                    key={current.id}
                    className="file-item bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100/50 hover:shadow-md transition-all duration-200 relative"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => selectCurrentDocument(current.id)}
                          className="font-medium text-gray-800 text-sm truncate text-left hover:underline"
                        >
                          {current.name}
                        </button>
                        <p className="text-xs text-gray-500">
                          {(current.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                        <div className="flex items-center mt-2">
                          {current.status === 'processing' ? (
                            <div className="flex items-center space-x-2">
                              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                              <span className="text-xs text-blue-600">Processing...</span>
                            </div>
                          ) : current.status === 'ready' ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600">Ready</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-xs text-red-600">Error</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId(openMenuId === current.id ? null : current.id)
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Options"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>
                        {openMenuId === current.id && (
                          <div className="absolute right-0 mt-2 w-28 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                removeDocument(current.id);
                              }}
                              className="w-full text-left text-sm px-3 py-2 hover:bg-red-50 text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Chat History */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">History</h3>
            {chatList.length === 0 ? (
              <p className="text-xs text-gray-500">No chats yet.</p>
            ) : (
              <div className="space-y-2">
                {chatList.map((c) => (
                  <div key={c.id} className="group flex items-center justify-between bg-white/80 border border-blue-100/50 rounded-lg p-3 hover:shadow-sm">
                    <button onClick={() => loadChatMessages(c.id)} className="flex-1 text-left truncate">
                      <p className="text-sm text-gray-800 truncate">{c.title}</p>
                      <p className="text-[10px] text-gray-500">{new Date(c.updatedAt).toLocaleString()} • {c.messageCount} msgs</p>
                    </button>
                    <button onClick={() => deleteChat(c.id)} className="opacity-0 group-hover:opacity-100 text-red-500 text-xs px-2 py-1 rounded hover:bg-red-50">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Central Chat Area */}
      <div 
        ref={chatAreaRef}
        className="flex-1 min-h-0 flex flex-col bg-white/40 backdrop-blur-sm"
      >
        {/* Chat Header */}
        <div className="p-6 border-b border-blue-100/50 bg-white/60 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                DocuChat
              </h1>
              <p className="text-gray-600">AI-powered document analysis</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                disabled={creatingChat}
                onClick={async () => {
                  try {
                    setCreatingChat(true);
                    const res = await fetch('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'New Chat' }) });
                    const data = await parseJsonSafe(res);
                    if (res.ok) {
                      setCurrentChatId(String(data.chat.id));
                      setMessages([{ id: 'welcome', text: "👋 New chat started. Upload a document and ask your question.", sender: 'bot', timestamp: new Date() }]);
                      setCurrentDocumentId(null);
                    }
                  } finally {
                    setCreatingChat(false);
                  }
                }}
                className="bg-white border border-blue-200/50 text-blue-700 hover:bg-blue-50"
              >
                New Chat
              </Button>
              <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-green-700">AI Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-0 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-bubble flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-white/80 backdrop-blur-sm text-gray-800 border border-blue-100/50'
                } rounded-2xl p-4 shadow-lg`}
              >
                <div className="flex items-start space-x-3">
                  {message.sender === 'bot' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {message.sender === 'user' && (
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className={`text-xs ${
                        message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                      {message.source && (
                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          {message.source}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* AI Thinking Indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex space-x-1">
                    <div className="thinking-dot w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="thinking-dot w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="thinking-dot w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="mt-auto p-6 border-t border-blue-100/50 bg-white/80 backdrop-blur-xl">
          <form onSubmit={handleSendMessage}>
            <div className="flex space-x-4">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask anything about your documents..."
                className="flex-1 px-4 py-3 bg-white border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-500"
                disabled={isThinking}
              />
              <Button 
                type="submit" 
                disabled={!inputText.trim() || isThinking}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Sidebar - Settings */}
      {settingsVisible && (
        <div 
          ref={rightSidebarRef}
          className="w-80 bg-white/70 backdrop-blur-xl border-l border-blue-100/50 flex flex-col"
        >
          {/* Settings Header */}
          <div className="p-6 border-b border-blue-100/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={toggleSettings}
                  className="p-2 hover:bg-blue-100/50 rounded-lg transition-colors"
                  title="Collapse/Expand Settings"
                >
                  {settingsExpanded ? <ChevronLeft className="h-5 w-5 text-gray-600" /> : <Settings className="h-5 w-5 text-gray-600" />}
                </button>
                <button 
                  onClick={closeSettings}
                  className="p-2 hover:bg-red-100/50 rounded-lg transition-colors"
                  title="Close Settings"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

        {/* Settings Content */}
        <div className="settings-content flex-1 p-6 space-y-6">
          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">AI Model</label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-3 bg-white/60 border border-blue-100/50 rounded-lg text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="gpt-4">GPT-4 Turbo</option>
                <option value="gpt-3.5">GPT-3.5 Turbo</option>
                <option value="deepseek-chat">DeepSeek Chat</option>
                <option value="claude-3">Claude-3 Sonnet</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Processing Status */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Processing Status</label>
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200/50">
              <div className="flex items-center space-x-3 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {uploadedFiles.length === 0
                    ? 'No documents uploaded'
                    : currentDocumentId === null
                      ? 'No current document selected'
                      : `Analyzing ${uploadedFiles.filter((f) => f.status === 'ready').length} of ${uploadedFiles.length} documents...`}
                </span>
              </div>
              <div className="space-y-2">
                {uploadedFiles.slice(0, 3).map((file) => (
                  <div key={file.id} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[60%]">{file.name}</span>
                    <span
                      className={`px-2 py-1 rounded-full ${
                        file.status === 'ready'
                          ? 'bg-green-100 text-green-700'
                          : file.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {file.status}
                    </span>
                  </div>
                ))}
                {uploadedFiles.length > 3 && (
                  <p className="text-[11px] text-gray-500">
                    +{uploadedFiles.length - 3} more
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Usage Today</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/60 rounded-lg border border-blue-100/50 text-center">
                <div className="text-lg font-semibold text-blue-600">{usageQuestionsToday}</div>
                <div className="text-xs text-gray-600">Questions</div>
              </div>
              <div className="p-3 bg-white/60 rounded-lg border border-blue-100/50 text-center">
                <div className="text-lg font-semibold text-purple-600">{usageDocumentsToday}</div>
                <div className="text-xs text-gray-600">Documents</div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}
      
      {/* Settings Toggle Button - Show when settings are hidden */}
      {!settingsVisible && (
        <button
          onClick={showSettings}
          className="fixed top-4 right-4 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 z-10"
          title="Show Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
