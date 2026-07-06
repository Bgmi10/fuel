'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Branch, FitnessAssessment, Invoice, Member, Payment, Referral, SlotBooking, Subscription } from '@prisma/client';
import { useRouter } from 'next/navigation';

type SubscriptionType =  Subscription & {
  branch: Branch
};
type MemberType = Member & {
  subscriptions:  SubscriptionType[]
  invoices: Invoice[] & {
    payments: Payment[]
  };
  referrals: Referral[]
  fitnessAssessments: FitnessAssessment[];
  slotBookings: SlotBooking[]
}

interface AuthContextType {
  user: MemberType | null;
  loading: boolean;
  checkSession: () => Promise<void>;
  logout: () => void;
}

const MemberAuthContext = createContext<AuthContextType | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState< MemberType | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    try {
      // Then verify with server
      const response = await fetch('/api/member/session', {
        credentials: 'include',
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } 

      if (response.status === 401) {
        router.replace('/member/login');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Session check failed');
      }
      
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false);
    }
  }, [router]);


  const logout = async () => {
    try {
      const response = await fetch('/api/member/logout');
      const data = await response.json();
      if (data.success) {
        router.push('/member/login');
      }
    } catch (error) {
    console.log(error);
    }
  };
  // Initialize on mount
  useEffect(() => {
    checkSession();
  }, []);

  return (
    <MemberAuthContext.Provider value={{ user, loading, checkSession, logout }}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(MemberAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}