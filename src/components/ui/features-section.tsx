"use client";

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { MessageSquare, Zap, Shield, FileText, Users, Globe } from 'lucide-react';

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate features when they come into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(".feature-card",
              { opacity: 0, y: 40, rotation: -2 },
              { 
                opacity: 1, 
                y: 0, 
                rotation: 0,
                duration: 0.8, 
                ease: "back.out(1.2)",
                stagger: 0.1
              }
            );
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Zap,
      title: "Instant Analysis",
      description: "Upload your document and get instant AI-powered insights. No waiting, no complex setup required.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: MessageSquare,
      title: "Natural Conversations",
      description: "Ask questions in plain English. Our AI understands context and provides relevant, detailed answers.",
      color: "from-blue-600 to-blue-700"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your documents are processed securely. We don't store your files or conversation history permanently.",
      color: "from-gray-600 to-gray-700"
    },
    {
      icon: FileText,
      title: "Multiple Formats",
      description: "Support for PDF, DOCX, TXT, and more. Upload any document type and start chatting immediately.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share insights with your team. Collaborate on document analysis and share key findings easily.",
      color: "from-gray-600 to-gray-700"
    },
    {
      icon: Globe,
      title: "Multi-language Support",
      description: "Works with documents in multiple languages. Get accurate responses regardless of your document's language.",
      color: "from-blue-600 to-blue-700"
    }
  ];

  return (
    <section id="features" ref={sectionRef} className="py-20 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Powerful Features for
            <span className="text-blue-600"> Document Intelligence</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to transform your documents into interactive, intelligent conversations
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="feature-card bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:-translate-y-1"
            >
              <div className={`w-14 h-14 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-blue-600 rounded-3xl p-8 md:p-12 text-white">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-2">Trusted by thousands of users worldwide</h3>
            <p className="text-blue-100">Join our growing community of document intelligence users</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">10K+</div>
              <div className="text-blue-100">Documents Analyzed</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">5K+</div>
              <div className="text-blue-100">Active Users</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">50K+</div>
              <div className="text-blue-100">Questions Answered</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">99%</div>
              <div className="text-blue-100">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
