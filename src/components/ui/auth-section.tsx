"use client";

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from './button';
import { User, Mail, Lock, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';

interface AuthSectionProps {
  onClose?: () => void;
}

export function AuthSection({ onClose }: AuthSectionProps) {
  const authRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Entrance animation
    const tl = gsap.timeline();
    
    tl.fromTo(authRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3 }
    )
    .fromTo(cardRef.current,
      { scale: 0.8, opacity: 0, y: 50 },
      { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" }
    )
    .fromTo(leftPanelRef.current,
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
      "-=0.3"
    )
    .fromTo(rightPanelRef.current,
      { x: 50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
      "-=0.5"
    );

    // Floating animation for sparkles
    gsap.to(".auth-sparkle", {
      y: -15,
      duration: 3,
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
      stagger: 0.5
    });

  }, []);

  return (
    <div 
      ref={authRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div 
        ref={cardRef}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative"
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            ×
          </button>
        )}

        <div className="grid md:grid-cols-2 min-h-[600px]">
          {/* Left Panel - Branding */}
          <div 
            ref={leftPanelRef}
            className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-20 h-20 border border-white rounded-full"></div>
              <div className="absolute top-32 right-16 w-16 h-16 border border-white rounded-full"></div>
              <div className="absolute bottom-20 left-20 w-12 h-12 border border-white rounded-full"></div>
            </div>

            {/* Floating Sparkles */}
            <Sparkles className="auth-sparkle absolute top-16 right-20 h-6 w-6 opacity-70" />
            <Sparkles className="auth-sparkle absolute bottom-32 left-16 h-4 w-4 opacity-50" />
            <Sparkles className="auth-sparkle absolute top-40 left-8 h-5 w-5 opacity-60" />

            <div className="relative z-10 h-full flex flex-col justify-center">
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold">📄</span>
                  </div>
                  <span className="text-2xl font-bold">ChatPDF</span>
                </div>
                
                <h2 className="text-3xl font-bold mb-4">
                  Transform Your Documents
                </h2>
                <p className="text-lg opacity-90 leading-relaxed">
                  Join thousands of users who are already chatting with their documents. 
                  Upload, analyze, and get insights instantly.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <span>Instant AI Analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </div>
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <span>Personalized Experience</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Auth Forms */}
          <div ref={rightPanelRef} className="p-8 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome to ChatPDF
                </h3>
                <p className="text-gray-600">
                  Sign in to your account or create a new one to get started
                </p>
              </div>

              <div className="space-y-4">
                {/* Sign In Button */}
                <SignInButton mode="modal">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    size="lg"
                  >
                    <Mail className="mr-2 h-5 w-5" />
                    Sign In to Your Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </SignInButton>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">New to ChatPDF?</span>
                  </div>
                </div>

                {/* Sign Up Button */}
                <SignUpButton mode="modal">
                  <Button 
                    variant="outline"
                    className="w-full border-2 border-gradient-to-r from-blue-600 to-purple-600 text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 py-3 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300"
                    size="lg"
                  >
                    <User className="mr-2 h-5 w-5" />
                    Create New Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </SignUpButton>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lock className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Secure Authentication</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Your data is protected with enterprise-grade security. We never store your documents permanently.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center mt-6">
                By signing up, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
