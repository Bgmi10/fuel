  'use client';

  import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
  import { User } from '@prisma/client';
  import { useRouter } from 'next/navigation';

  interface AuthContextType {
    user: User | null;
    loading: boolean;
    checkSession: () => Promise<void>;
    logout: () => void;
  }

  const AdminAuthContext = createContext<AuthContextType | undefined>(undefined);

  export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const checkSession = useCallback(async () => {
      try {
        // Then verify with server
        const response = await fetch('/api/admin/session', {
          credentials: 'include',
          cache: 'no-store'
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false);
      }
    }, []);


    const logout = async () => {
      try {
        const response = await fetch('/api/admin/logout');
        const data = await response.json();
        if (data.success) {
          router.push('/admin/login');
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
      <AdminAuthContext.Provider value={{ user, loading, checkSession, logout }}>
        {children}
      </AdminAuthContext.Provider>
    );
  }

  export function useAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) {
      throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
  }