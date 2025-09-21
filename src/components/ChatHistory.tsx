"use client";

import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { 
  MessageSquare, 
  FileText, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar,
  Clock,
  Filter,
  MoreVertical,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';

interface Chat {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: string;
  documentId?: number;
  documentName?: string;
  documentType?: string;
  documentStatus?: string;
  messageCount: number;
}

interface ChatHistoryProps {
  onChatSelect?: (chatId: number) => void;
  selectedChatId?: number;
}

export function ChatHistory({ onChatSelect, selectedChatId }: ChatHistoryProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Fetch chats
  const fetchChats = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search })
      });

      console.log('ChatHistory: Making request to /api/chats with params:', params.toString());
      
      const response = await fetch(`/api/chats?${params}`);
      console.log('ChatHistory: Response status:', response.status);
      
      const data = await response.json();
      console.log('ChatHistory: Response data:', data);

      if (response.ok) {
        setChats(data.chats || []);
        setTotalPages(data.pagination?.pages || 1);
        setCurrentPage(data.pagination?.page || 1);
        console.log('ChatHistory: Successfully loaded', data.chats?.length || 0, 'chats');
      } else {
        console.error('Failed to fetch chats:', data.error);
        // Show user-friendly error message
        setChats([]);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      // Show user-friendly error message
      setChats([]);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  // Delete chat
  const deleteChat = async (chatId: number) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/chats?chatId=${chatId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        if (selectedChatId === chatId) {
          onChatSelect?.(0); // Clear selection
        }
      } else {
        const data = await response.json();
        alert(`Failed to delete chat: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Update chat title
  const updateChatTitle = async (chatId: number, newTitle: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        setChats(prev => prev.map(chat => 
          chat.id === chatId ? { ...chat, title: newTitle } : chat
        ));
        setEditingChatId(null);
        setEditingTitle('');
      } else {
        const data = await response.json();
        alert(`Failed to update chat: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating chat:', error);
      alert('Failed to update chat. Please try again.');
    }
  };

  // Start editing
  const startEditing = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  // Save editing
  const saveEditing = () => {
    if (editingTitle.trim()) {
      updateChatTitle(editingChatId!, editingTitle.trim());
    } else {
      cancelEditing();
    }
  };

  // Filter chats
  const filteredChats = chats.filter(chat => {
    const matchesSearch = !searchTerm || 
      chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.documentName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && chat.isActive === 'true') ||
      (filterStatus === 'archived' && chat.isActive === 'false');

    return matchesSearch && matchesFilter;
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Load chats on mount and when search/filter changes
  useEffect(() => {
    console.log('ChatHistory: Fetching chats with page:', currentPage, 'search:', searchTerm);
    fetchChats(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  // Animation on mount
  useEffect(() => {
    gsap.fromTo('.chat-item',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, delay: 0.2 }
    );
  }, [chats]);

  return (
    <div className="h-full bg-white/70 backdrop-blur-xl border-r border-blue-100/50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-blue-100/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Chat History</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600 font-medium">
              {chats.length} chats
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/80 border border-blue-200/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter */}
        <div className="flex space-x-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
            className="text-xs"
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('active')}
            className="text-xs"
          >
            Active
          </Button>
          <Button
            variant={filterStatus === 'archived' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('archived')}
            className="text-xs"
          >
            Archived
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">No chats found</p>
            {searchTerm && (
              <p className="text-xs text-gray-400 mt-1">
                Try adjusting your search terms
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item group relative bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100/50 hover:shadow-md transition-all duration-200 cursor-pointer ${
                  selectedChatId === chat.id ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
                }`}
                onClick={() => onChatSelect?.(chat.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingChatId === chat.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1 px-2 py-1 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <Button size="sm" onClick={saveEditing} className="text-xs">
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing} className="text-xs">
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <h3 className="font-medium text-gray-800 text-sm truncate">
                        {chat.title}
                      </h3>
                    )}
                    
                    {chat.documentName && (
                      <div className="flex items-center mt-1 space-x-2">
                        <FileText className="h-3 w-3 text-blue-500" />
                        <span className="text-xs text-gray-600 truncate">
                          {chat.documentName}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          chat.documentStatus === 'ready' ? 'bg-green-100 text-green-700' :
                          chat.documentStatus === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {chat.documentStatus}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{chat.messageCount}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(chat.updatedAt)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(chat);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-blue-100/50">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
