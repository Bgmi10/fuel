"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, 
  Weight, 
  Target, 
  Dumbbell,
  Apple,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/app/contexts/MemberAuthContext";

const DashboardPage = () => {
  const router = useRouter();
  const { user: member, loading } = useAuth();
  const [greeting, setGreeting] = useState("");

  // Calculate membership stats from actual data
  const membershipStats = useMemo(() => {
    if (!member?.subscriptions) {
      return {
        activeCount: 0,
        branches: [],
        nextExpiry: null,
        daysRemaining: 0,
        totalBalance: 0
      };
    }

    // Filter active subscriptions
    const activeSubscriptions = member.subscriptions.filter((sub: any) => 
      sub.status === 'ACTIVE' || sub.status === 'FROZEN'
    );

    // Get unique branches
    const branches = [...new Set(activeSubscriptions.map((sub: any) => sub.branchName))];

    // Find next expiry
    const now = new Date();
    let nextExpiry = null;
    let daysRemaining = 0;

    if (activeSubscriptions.length > 0) {
      const upcomingExpiries = activeSubscriptions
        .map((sub: any) => new Date(sub.endDate))
        .filter((date: Date) => date > now)
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      if (upcomingExpiries.length > 0) {
        nextExpiry = upcomingExpiries[0];
        daysRemaining = Math.ceil((nextExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Calculate total balance from invoices
    const totalBalance = member.subscriptions.reduce((total: number, sub: any) => {
      if (sub.invoice) {
        return total + (sub.invoice.balanceAmount || 0);
      }
      return total;
    }, 0);

    return {
      activeCount: activeSubscriptions.length,
      branches,
      nextExpiry,
      daysRemaining,
      totalBalance
    };
  }, [member]);

  useEffect(() => {
    // Set greeting based on India time (UTC+5:30)
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    // Convert to India time (UTC+5:30)
    let indiaHour = utcHour + 5;
    const indiaMinutes = utcMinutes + 30;
    
    if (indiaMinutes >= 60) {
      indiaHour += 1;
    }
    
    // Handle day overflow
    if (indiaHour >= 24) {
      indiaHour = indiaHour - 24;
    }
    
    // Set greeting based on India time
    if (indiaHour >= 5 && indiaHour < 12) {
      setGreeting("Good Morning");
    } else if (indiaHour >= 12 && indiaHour < 17) {
      setGreeting("Good Afternoon");
    } else if (indiaHour >= 17 && indiaHour < 21) {
      setGreeting("Good Evening");
    } else {
      setGreeting("Good Night");
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-3 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mock data for other stats - replace with actual API data
  const assessments = member?.fitnessAssessments || [];

const sorted = useMemo(() => {
  return [...assessments].sort(
    (a, b) =>
      new Date(a.assessmentDate).getTime() -
      new Date(b.assessmentDate).getTime()
  );
}, [assessments]);

const first = sorted[0];
const latest = sorted[sorted.length - 1];

const stats = useMemo(() => {
  if (!first || !latest) {
    return null;
  }

  return {
    currentWeight: latest?.weight,
    targetWeight: 85, // fallback smart target
    bodyFat: latest?.bodyFatPercentage,
    workoutsCompleted: true,
    prevWeight: sorted[sorted.length - 2]?.weight 
  };
}, [first, latest, member]);

  const todayWorkout = {
    name: "Push Day",
    exercises: 5,
    duration: 45,
    completed: false
  };

  return (
    <div className="space-y-6">
    

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Weight */}
        <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <Weight className="text-lime-400" size={24} />
          </div>
          <p className="text-sm text-gray-400 mb-1">Current Weight</p>
          <h3 className="text-2xl font-bold text-white">{stats?.currentWeight} KG</h3>
          <div className="mt-2 flex items-center gap-1">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-xs text-green-400">{(stats?.currentWeight || 0) - (stats?.prevWeight || 0)} KG this month</span>
          </div>
        </div>

        {/* Body Fat */}
        <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <Target className="text-blue-400" size={24} />
            <span className="text-xs text-gray-500">Goal: 18%</span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Body Fat</p>
          <h3 className="text-2xl font-bold text-white">{stats?.bodyFat}%</h3>
          <div className="mt-2 flex items-center gap-1">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-xs text-green-400">-1.5% this month</span>
          </div>
        </div>

        {/* Workouts Completed */}
        <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <Dumbbell className="text-orange-400" size={24} />
            <span className="text-xs text-gray-500">This month</span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Workouts</p>
          <h3 className="text-2xl font-bold text-white">{stats?.workoutsCompleted}</h3>
       
        </div>

        {/* Target Weight */}
        <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <Target className="text-purple-400" size={24} />
            <span className="text-xs text-gray-500">Target</span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Goal Weight</p>
          <h3 className="text-2xl font-bold text-white">{stats?.targetWeight} KG</h3>
          <div className="mt-2">
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
                style={{ width: '65%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Workout */}
        <div className="bg-white/[0.03] backdrop-blur rounded-3xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Dumbbell className="text-lime-400" size={24} />
              Today's Workout
            </h2>
            {!todayWorkout.completed && (
              <span className="px-3 py-1 bg-yellow-400/10 text-yellow-400 text-xs font-medium rounded-full">
                Pending
              </span>
            )}
          </div>

          {todayWorkout ? (
            <div className="space-y-4">
              <div className="p-4 bg-black/30 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-2">{todayWorkout.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{todayWorkout.exercises} Exercises</span>
                  <span className="w-1 h-1 bg-gray-600 rounded-full" />
                  <span>{todayWorkout.duration} mins</span>
                </div>
              </div>
              <button 
                onClick={() => router.push('/member/workouts')}
                className="w-full py-3 bg-lime-400 text-black font-semibold rounded-2xl hover:bg-lime-300 transition-colors"
              >
                Start Workout
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No workout scheduled for today</p>
              <button 
                onClick={() => router.push('/member/workouts')}
                className="text-lime-400 hover:text-lime-300 transition-colors"
              >
                Browse Workouts →
              </button>
            </div>
          )}
        </div>

        {/* Today's Diet */}
        <div className="bg-white/[0.03] backdrop-blur rounded-3xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Apple className="text-green-400" size={24} />
              Today's Diet Plan
            </h2>
            <button 
              onClick={() => router.push('/member/diet-plans')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map((meal, index) => (
              <div key={meal} className="flex items-center justify-between p-3 bg-black/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${index < 2 ? 'bg-green-400' : 'bg-gray-600'}`} />
                  <span className="text-gray-300">{meal}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {index < 2 ? 'Completed' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Assessment */}
      

    
    </div>
  );
};

export default DashboardPage;