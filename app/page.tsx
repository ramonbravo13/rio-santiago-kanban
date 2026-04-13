'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  useEffect(() => {
    if (status === 'loading' || checkingSetup) return; // Still loading

    if (session) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [session, status, router, checkingSetup]);

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup/check');
      if (response.ok) {
        const data = await response.json();
        if (data.needsSetup) {
          router.replace('/setup');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setCheckingSetup(false);
    }
  };

  // Show a loading spinner while determining auth status
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
