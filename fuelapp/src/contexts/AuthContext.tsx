import React, {
    createContext,
    useContext,
    useEffect,
    useState,
  } from "react";
  import { request } from "../api/client";
  import { storage } from "../utils/storage";
import { useRouter } from "expo-router";
  
  interface AuthContextType {
    user: any | null;
    loading: boolean;
    authenticated: boolean;
  
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
  }
  
  const AuthContext = createContext<AuthContextType>(
    {} as AuthContextType
  );
  
  export const AuthProvider = ({
    children,
  }: {
    children: React.ReactNode;
  }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    
    const refreshSession = async () => {
      try {
        const token = await storage.get("token");

        if (!token) {
          setUser(null);
          router.replace('/(auth)/login')
          return;
        }
  
        const data = await request({
          method: "GET",
          url: "/member/session",
        });
  
        setUser(data.user);
      } catch (err) {
        console.log(err);
  
        await storage.remove("token");
  
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
  
    const login = async (token: string) => {
      await storage.set("token", token);
  
      await refreshSession();
    };
  
    const logout = async () => {
      try {
        await request({
          method: "GET",
          url: "/member/logout",
        });
      } catch {}
  
      await storage.remove("token");

      await refreshSession();
  
      setUser(null);
    };
  
    useEffect(() => {
      refreshSession();
    }, []);
  
    return (
      <AuthContext.Provider
        value={{
          user,
          loading,
          authenticated: !!user,
          login,
          logout,
          refreshSession,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  };
  
  export const useAuth = () => useContext(AuthContext);