"use client";

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useUser } from '@clerk/nextjs';
import { User, Crown, Zap, Calendar, FileText, MessageSquare } from 'lucide-react';
import { Button } from './button';

export function UserDashboard() {
  const { user } = useUser();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Entrance animation
    const tl = gsap.timeline();
    
    tl.fromTo(dashboardRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
    )
    .fromTo(".stat-card",
      { opacity: 0, y: 40, scale: 0.9 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        duration: 0.6, 
        ease: "back.out(1.2)",
        stagger: 0.1
      },
      "-=0.4"
    )
    .fromTo(".dashboard-card",
      { opacity: 0, y: 30 },
      { 
        opacity: 1, 
        y: 0,
        duration: 0.5, 
        ease: "power2.out",
        stagger: 0.1
      },
      "-=0.3"
    );

  }, []);

  if (!user) return null;

  return (
    <div ref={dashboardRef} className="max-w-6xl mx-auto px-6 py-8">
      {/* User Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            <img 
              src={user.imageUrl} 
              alt={user.fullName || 'User'} 
              className="w-16 h-16 rounded-full border-3 border-gradient-to-r from-blue-400 to-purple-400"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.firstName || 'User'}! 👋
            </h1>
            <p className="text-gray-600">Ready to chat with your documents?</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Documents</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <FileText className="h-8 w-8 text-blue-200" />
            </div>
          </div>

          <div className="stat-card bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Conversations</p>
                <p className="text-2xl font-bold">89</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-200" />
            </div>
          </div>

          <div className="stat-card bg-gradient-to-r from-pink-500 to-pink-600 p-4 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm">This Month</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <Calendar className="h-8 w-8 text-pink-200" />
            </div>
          </div>

          <div className="stat-card bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Plan</p>
                <p className="text-lg font-bold">Free</p>
              </div>
              <Crown className="h-8 w-8 text-green-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div ref={cardsRef} className="grid md:grid-cols-2 gap-6">
        <div className="dashboard-card bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Upload New Document</h3>
              <p className="text-sm text-gray-600">Start a new conversation</p>
            </div>
          </div>
          <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
            Choose File
          </Button>
        </div>

        <div className="dashboard-card bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Recent Conversations</h3>
              <p className="text-sm text-gray-600">Continue where you left off</p>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            View All
          </Button>
        </div>

        <div className="dashboard-card bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Upgrade Plan</h3>
              <p className="text-sm text-gray-600">Unlock premium features</p>
            </div>
          </div>
          <Button variant="outline" className="w-full border-pink-300 text-pink-600 hover:bg-pink-50">
            View Plans
          </Button>
        </div>

        <div className="dashboard-card bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Quick Tips</h3>
              <p className="text-sm text-gray-600">Learn how to get the most out of ChatPDF</p>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
}
