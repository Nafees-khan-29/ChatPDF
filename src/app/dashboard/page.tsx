"use client";

import { useUser } from '@clerk/nextjs';
import { DocuChatInterface } from '@/components/ui/docu-chat-interface';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useUser();

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect if not signed in
  if (!isSignedIn) {
    redirect('/');
  }

  return <DocuChatInterface />;
}
