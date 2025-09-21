"use client";

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { UserButton, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from './button';
import { FileText, ArrowLeft, Menu, X } from 'lucide-react';

interface NavigationProps {
  isAuthenticated: boolean;
  onGetStarted?: () => void;
  onBackToHome?: () => void;
}

export function Navigation({ isAuthenticated, onGetStarted, onBackToHome }: NavigationProps) {
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Entrance animation
    gsap.fromTo(navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
    );
  }, []);

  return (
    <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            {onBackToHome && (
              <Button
                variant="ghost"
                onClick={onBackToHome}
                className="mr-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                ChatPDF
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">
              About
            </a>
            {isAuthenticated && (
              <a href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Dashboard
              </a>
            )}
          </div>

          {/* Authentication */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10 rounded-full"
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <SignInButton mode="modal">
                  <Button 
                    variant="ghost" 
                    className="hidden md:inline-flex"
                  >
                    Sign In
                  </Button>
                </SignInButton>
                
                <SignUpButton mode="modal">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Get Started
                  </Button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
