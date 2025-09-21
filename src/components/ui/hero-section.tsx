"use client";

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Button } from './button';
import { Upload, Sparkles, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  isAuthenticated: boolean;
  userName?: string;
  onGetStarted: () => void;
}

export function HeroSection({ isAuthenticated, userName, onGetStarted }: HeroSectionProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hero animations
    const tl = gsap.timeline({ delay: 0.5 });
    
    tl.fromTo(titleRef.current, 
      { opacity: 0, y: 50, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 1, ease: "back.out(1.7)" }
    )
    .fromTo(subtitleRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      "-=0.5"
    )
    .fromTo(ctaRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
      "-=0.3"
    );

    // Floating sparkles
    gsap.to(".floating-sparkle", {
      y: -10,
      duration: 2,
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
      stagger: 0.3
    });
  }, []);

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        {/* Floating Elements */}
        <div className="relative mb-8">
          <div className="floating-sparkle absolute -top-8 -left-8 h-6 w-6 text-blue-600 opacity-60" />
          <div className="floating-sparkle absolute -top-4 right-8 h-4 w-4 text-blue-500 opacity-40" />
          <div className="floating-sparkle absolute top-8 -right-4 h-5 w-5 text-blue-700 opacity-50" />
        </div>

        {/* Hero Title */}
        <div ref={titleRef} className="mb-8">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-4">
            Chat with Your
            <br />
            <span className="text-blue-600">
              Documents
            </span>
          </h1>
        </div>

        {/* Hero Subtitle */}
        <div ref={subtitleRef} className="mb-8">
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Transform any PDF, document, or text file into an intelligent conversation. 
            Ask questions, get instant answers, and unlock insights from your content.
          </p>
        </div>

        {/* Call to Action */}
        <div ref={ctaRef} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={onGetStarted}
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Upload className="mr-2 h-5 w-5" />
              {isAuthenticated ? 'Start Chatting' : 'Get Started Free'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-500">
            {isAuthenticated ? 
              `Welcome back, ${userName}! Ready to upload a document?` : 
              'No credit card required • Free to try • Secure & Private'
            }
          </p>
        </div>
      </div>
    </section>
  );
}
