"use client";

import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { useAuth } from "@/app/contexts/MemberAuthContext";
import { Member, WorkoutPlan } from "@prisma/client";
import { ChevronDown } from "lucide-react";

type WorkoutExercise = {
  id: string;
  exerciseName: string;
  sets?: number;
  reps?: number;
  weight?: string;
  restSeconds?: string;
  notes?: string;
};

type WorkoutDay = {
  id: string;
 name: string;
  dayNumber: number;
  exercises: WorkoutExercise[];
};

type Plan = WorkoutPlan & {
  member: Member;
  days: WorkoutDay[];
};

export default function MemberWorkoutPlansPage() {
  const { user: member } = useAuth();
  const [workoutPlans, setWorkoutPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const fetchWorkoutPlans = async () => {
    if (!member?.id) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/workout-plans?memberId=${member.id}&active=true `);
      const data = await res.json();
      setWorkoutPlans(data.data || []);

      const plans = data.data || [];
      if (
        plans.length > 0 &&
        plans[0].days?.length > 0
      ) {
        setOpenDay(plans[0].days[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutPlans();
  }, [member?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-3 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Dumbbell size={24} className="text-lime-400" />
          Your Workout Plans
        </h1>
        <p className="text-gray-400 mt-1">
        Your trainer's workout plan for you
        </p>
      </div>
    </div>
      

      {/* Content */}
      <div className="space-y-4">
        {workoutPlans.length === 0 ? (
          <div className="text-center py-12 bg-white/[0.03] backdrop-blur rounded-2xl border border-white/10">
            <Dumbbell className="mx-auto text-gray-600 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">
              {"No workout plans yet"}
            </h3>
            <p className="text-gray-400">
              {
                "Your trainer will create personalized workout plans for you"
              }
            </p>
          </div>
        ) : (
          workoutPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white/[0.03] backdrop-blur rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-colors"
            >
              {/* Plan Header */}
              <div className="bg-white/[0.03] backdrop-blur rounded-3xl p-6 border border-white/10">
  <div className="flex items-start justify-between">
    <div>
      <h2 className="text-xl font-bold text-white">
        {plan.title}
      </h2>

      {plan.description && (
        <p className="text-gray-400 text-sm mt-2">
          {plan.description}
        </p>
      )}
    </div>

  </div>

  <div className="grid grid-cols-3 gap-3 mt-5">
    <div className="bg-black/20 rounded-2xl p-3">
      <p className="text-xs text-gray-500">
        Days
      </p>
      <p className="text-xl font-bold text-white">
        {plan.days.length}
      </p>
    </div>

    <div className="bg-black/20 rounded-2xl p-3">
      <p className="text-xs text-gray-500">
        Exercises
      </p>
      <p className="text-xl font-bold text-white">
        {plan.days.reduce(
          (t, d) =>
            t +
            d.exercises.length,
          0
        )}
      </p>
    </div>

    <div className="bg-black/20 rounded-2xl p-3">
      <p className="text-xs text-gray-500">
        Ends
      </p>
      <p className="text-sm font-medium text-white">
        {new Date(
          (plan.endDate ?? "")
        ).toLocaleDateString()}
      </p>
    </div>
  </div>
</div>

              {/* Exercise Schedule */}
           {/* Workout Days */}
<div className="mt-5 space-y-3">
  <h4 className="text-lg font-semibold text-white">
    Workout Schedule
  </h4>

  {plan.days
    ?.sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const isOpen = openDay === day.id;

      return (
        <div
          key={day.id}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          {/* Day Header */}
          <button
            onClick={() =>
              setOpenDay(
                isOpen ? null : day.id
              )
            }
            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
          >
            <div className="text-left">
              <h3 className="text-white font-semibold">
                Day {day.dayNumber}
              </h3>

              <p className="text-sm text-gray-400">
                {day.name}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {
                  day.exercises.length
                }{" "}
                Exercises
              </span>

              <ChevronDown
                size={18}
                className={`text-gray-400 transition-transform ${
                  isOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </div>
          </button>

          {/* Day Content */}
          {isOpen && (
            <div className="border-t border-white/10 p-4 space-y-3">
              {day.exercises.map(
                (exercise) => (
                  <div
                    key={exercise.id}
                    className="flex gap-3 rounded-xl bg-black/20 p-4"
                  >
                    <div className="h-10 w-10 rounded-xl bg-lime-400/10 flex items-center justify-center shrink-0">
                      <Dumbbell
                        size={16}
                        className="text-lime-400"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="text-white font-medium">
                        {
                          exercise.exerciseName
                        }
                      </h5>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {exercise.sets && (
                          <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-300">
                            {
                              exercise.sets
                            }{" "}
                            Sets
                          </span>
                        )}

                        {exercise.reps && (
                          <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-300">
                            {
                              exercise.reps
                            }{" "}
                            Reps
                          </span>
                        )}

                        {exercise.weight && (
                          <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-300">
                            {
                              exercise.weight
                            }{" "}
                            kg
                          </span>
                        )}

                        {exercise.restSeconds && (
                          <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-300">
                            {
                              exercise.restSeconds
                            }
                            s Rest
                          </span>
                        )}
                      </div>

                      {exercise.notes && (
                        <div className="mt-3 rounded-xl border border-lime-400/10 bg-lime-400/5 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-lime-400 mb-1">
                            Trainer Note
                          </p>

                          <p className="text-sm text-gray-300">
                            {
                              exercise.notes
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      );
    })}
</div>
            </div>
          ))
        )}
      </div>
      </div>
  );
}