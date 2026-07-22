import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
  } from "react";
  
  import { useAuth } from "./AuthContext";
  
  interface NutritionRefreshContextValue {
    refreshing: boolean;
    refreshKey: number;
    refreshNutrition: () => Promise<void>;
  }
  
  const NutritionRefreshContext =
    createContext<NutritionRefreshContextValue | null>(
      null
    );
  
  interface NutritionRefreshProviderProps {
    children: React.ReactNode;
  }
  
  export function NutritionRefreshProvider({
    children,
  }: NutritionRefreshProviderProps) {
    const { refreshSession } = useAuth();
  
    const [refreshing, setRefreshing] =
      useState(false);
  
    const [refreshKey, setRefreshKey] =
      useState(0);
  
    const refreshNutrition =
      useCallback(async () => {
        if (refreshing) return;
  
        try {
          setRefreshing(true);
  
          // Refresh member/session information
          await refreshSession();
  
          // Notify diet plan and food tracker
          // screens to reload their own APIs.
          setRefreshKey(
            (previous) => previous + 1
          );
        } catch (error) {
          console.log(
            "Nutrition refresh error:",
            error
          );
        } finally {
          setRefreshing(false);
        }
      }, [refreshSession, refreshing]);
  
    const value = useMemo(
      () => ({
        refreshing,
        refreshKey,
        refreshNutrition,
      }),
      [
        refreshing,
        refreshKey,
        refreshNutrition,
      ]
    );
  
    return (
      <NutritionRefreshContext.Provider
        value={value}
      >
        {children}
      </NutritionRefreshContext.Provider>
    );
  }
  
  export function useNutritionRefresh() {
    const context = useContext(
      NutritionRefreshContext
    );
  
    if (!context) {
      throw new Error(
        "useNutritionRefresh must be used inside NutritionRefreshProvider"
      );
    }
  
    return context;
  }