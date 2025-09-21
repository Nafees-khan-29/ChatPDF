"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { DocuChatInterface } from "@/components/ui/docu-chat-interface";
import { ChatHistory } from "@/components/ChatHistory";
import { Button } from "@/components/ui/button";
import {
  FileText,
  MessageSquare,
  Upload,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  Brain,
} from "lucide-react";
import { gsap } from "gsap";

export default function HomePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);

  // Animation on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLoaded) {
      const tl = gsap.timeline();

      tl.fromTo(
        ".hero-title",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      )
        .fromTo(
          ".hero-subtitle",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
          "-=0.4"
        )
        .fromTo(
          ".hero-features",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
          "-=0.3"
        )
        .fromTo(
          ".hero-cta",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
          "-=0.2"
        );
    }
  }, [isLoaded]);

  // Show loading spinner until Clerk is ready
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not signed in → show hero/landing page
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-xl border-b border-blue-100/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DocuAI
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <SignInButton mode="modal">
                  <Button variant="ghost">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    Get Started
                  </Button>
                </SignUpButton>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="hero-title text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your Documents into
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Intelligent Conversations
              </span>
            </h1>

            <p className="hero-subtitle text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Upload any document and chat with AI to extract insights, answer
              questions, and analyze content with the power of advanced
              artificial intelligence.
            </p>

            <div className="hero-features grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Easy Upload
                </h3>
                <p className="text-gray-600">
                  Support for PDF, DOCX, and text files with drag-and-drop
                  interface
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Smart Chat
                </h3>
                <p className="text-gray-600">
                  Ask questions and get intelligent answers based on your
                  document content
                </p>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Secure & Private
                </h3>
                <p className="text-gray-600">
                  Your documents are processed securely with enterprise-grade
                  encryption
                </p>
              </div>
            </div>

            <div className="hero-cta flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <SignUpButton mode="modal">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8 py-3"
                >
                  Start Analyzing Documents
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                View Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white/40 backdrop-blur-sm py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Powered by Advanced AI
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our platform combines multiple AI models to provide the most
                accurate and comprehensive document analysis
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  OpenAI GPT-4
                </h3>
                <p className="text-gray-600">
                  Advanced reasoning and analysis capabilities
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Claude Sonnet
                </h3>
                <p className="text-gray-600">
                  Enhanced accuracy and contextual understanding
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Google Gemini
                </h3>
                <p className="text-gray-600">
                  Multimodal analysis and creative responses
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  97% Accuracy
                </h3>
                <p className="text-gray-600">
                  Proven accuracy across document types
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">DocuAI</span>
            </div>
            <p className="text-gray-400">© 2024 DocuAI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // If signed in → show chat interface
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 flex flex-col overflow-hidden">
      {/* Top Nav - Always visible when signed in */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-blue-100/50 p-3 flex items-center justify-between z-50 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg" />
          <span className="text-lg font-semibold text-gray-800">DocuAI</span>
        </div>
        <div className="flex items-center space-x-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat History Sidebar */}
        {showChatHistory && (
          <div className="w-80 flex-shrink-0">
            <ChatHistory
              onChatSelect={setSelectedChatId}
              selectedChatId={selectedChatId ?? undefined}
            />
          </div>
        )}

        {/* Chat Interface - Takes remaining space */}
        <div className="flex-1 min-w-0">
          <DocuChatInterface />
        </div>
      </div>
    </div>
  );
}
