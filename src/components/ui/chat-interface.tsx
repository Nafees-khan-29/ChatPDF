"use client";

import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Send, MessageCircle, Bot, User, Sparkles, FileText, X } from 'lucide-react';
import { Button } from './button';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onBackToHome: () => void;
  currentChatId?: number | null;
  onChatIdChange?: (chatId: number | null) => void;
  chatTitle?: string;
  onTitleChange?: (title: string) => void;
}

export function ChatInterface({ 
  onBackToHome, 
  currentChatId, 
  onChatIdChange, 
  chatTitle, 
  onTitleChange 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI document assistant. Upload a document to get started, and I'll help you analyze, understand, and extract insights from it. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate chat interface entrance
    if (chatRef.current) {
      gsap.fromTo(chatRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Actually call the chat API instead of using hardcoded responses
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          chatId: currentChatId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, response.statusText, errorText);
        throw new Error(`Failed to get response: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update chat ID if this is a new chat
      if (data.isNewChat && data.chatId && onChatIdChange) {
        onChatIdChange(data.chatId);
      }
      
      // Update chat title if provided
      if (data.chatTitle && onTitleChange) {
        onTitleChange(data.chatTitle);
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.message || 'Sorry, I could not process your request.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Sorry, there was an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div ref={chatRef} className="min-h-screen bg-gray-50 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-full mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Document Chat</h1>
              <p className="text-sm text-gray-500">Ask questions about your document</p>
            </div>
          </div>
          <Button 
            onClick={onBackToHome}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50"
          >
            Back to Home
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex w-full p-4">
        {/* Chat Messages - Full Width */}
        <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 flex flex-col max-w-4xl mx-auto">
          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto min-h-[75vh] space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-base leading-relaxed">{message.content}</p>
                  <span className={`text-xs mt-2 block opacity-70 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your question here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  rows={2}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
            {/* Upload Prompt */}
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-500">
                Need to upload a document? 
                <span 
                  onClick={() => setShowUploadModal(true)}
                  className="text-blue-600 cursor-pointer hover:underline ml-1"
                >
                  Click here to upload
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Upload Document</h3>
              <Button
                onClick={() => setShowUploadModal(false)}
                variant="outline"
                size="sm"
                className="p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer mb-4">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-base text-gray-600 mb-2">Drag & drop your file here</p>
              <p className="text-sm text-gray-400">or click to browse</p>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Supports PDF, DOCX, TXT, and MD files up to 10MB
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
