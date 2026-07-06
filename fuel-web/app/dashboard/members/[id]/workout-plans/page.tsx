"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Dumbbell, Edit3, Trash2, Calendar, Clock, Play, Users } from "lucide-react";
import WorkoutPlanModal from "./WorkoutPlanModal";

type WorkoutExercise = {
  id?: string;
  exerciseName: string;
  sets?: number;
  reps?: number;
  weight?: string;
  restSeconds?: string;
  notes?: string;
};

type WorkoutDay = {
  id?: string;
  name: string;
  dayNumber: number;
  exercises: WorkoutExercise[];
};

type WorkoutPlan = {
  id: string;
  memberId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;

  days: WorkoutDay[];

  member: {
    name: string;
    phone: string;
  };

  createdAt: string;
  updatedAt: string;
};

export default function MemberWorkoutPlansPage() {
  const { id: memberId } = useParams();
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState<WorkoutPlan | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workout-plans?memberId=${memberId}&admin=true`);
      const data = await res.json();
      setWorkoutPlans(data.data || []);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (memberId) {
      fetchData();
    }
  }, [memberId]);

  const handleDelete = async (planId: string) => {
    if (!confirm("Delete this workout plan?")) return;

    await fetch(`/api/workout-plans/${planId}`, {
      method: "DELETE",
    });

    fetchData();
  };

  if (loading) {
    return <div className="p-10 text-neutral-500">Loading...</div>;
  }

  const memberName = workoutPlans[0]?.member?.name || "Member";

  return (
    <div className="p-6 space-y-6 text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Dumbbell size={20} /> Workout Plans
          </h1>
          <p className="text-neutral-400 mt-1">Manage workout plans for {memberName}</p>
        </div>

        <button
          onClick={() => {
            setSelected(null);
            setOpenModal(true);
          }}
          className="h-11 px-5 rounded-2xl bg-lime-400 text-black font-semibold flex items-center gap-2"
        >
          <Plus size={16} />
          Create Plan
        </button>
      </div>

      {/* WORKOUT PLANS LIST */}
      <div className="space-y-4">
        {workoutPlans.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900 rounded-2xl border border-neutral-800">
            <Dumbbell className="mx-auto text-neutral-600 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">No workout plans yet</h3>
            <p className="text-neutral-400">Create the first workout plan for this member</p>
          </div>
        ) : (
          workoutPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{plan.title}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        plan.isActive
                          ? "bg-green-400/10 text-green-400"
                          : "bg-red-400/10 text-red-400"
                      }`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-neutral-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>
                        {new Date(plan.startDate).toLocaleDateString()} 
                        {plan.endDate && ` - ${new Date(plan.endDate).toLocaleDateString()}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Dumbbell size={14} />
                      <span>{plan.days.reduce(
  (acc, day) => acc + day.exercises.length,
  0
)} exercises</span>
                    </div>
                    {plan.days.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>
                          {plan.days.length} days
                        </span>
                      </div>
                    )}
                  </div>

                  {plan.description && (
                    <p className="text-sm text-neutral-400 mb-3">{plan.description}</p>
                  )}

                  {/* Exercise Preview */}
                  <div className="space-y-2">
                    {plan.days.slice(0,3).map((day) => (
  <div
    key={day.dayNumber}
    className="p-3 bg-neutral-800 rounded-lg"
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-lime-400 font-medium">
        Day {day.dayNumber}  {day.name}
      </span>

      
    </div>

    <div className="space-y-1">
    {day.exercises.map((exercise, index) => (
  <div
    key={index}
    className="p-3 rounded-lg bg-neutral-800 border border-neutral-700 mb-2"
  >
    <div className="font-medium text-white">
      {exercise.exerciseName}
    </div>

    <div className="mt-1 text-xs text-neutral-300 flex flex-wrap gap-3">
      <span>Sets: {exercise.sets ?? "-"}</span>
      <span>Reps: {exercise.reps ?? "-"}</span>

      {exercise.weight && (
        <span>Weight: {exercise.weight}</span>
      )}

      {exercise.restSeconds && (
        <span>Rest: {exercise.restSeconds} sec</span>
      )}
    </div>

    {exercise.notes && (
      <div className="mt-2 text-xs text-neutral-400">
        Notes: {exercise.notes}
      </div>
    )}
  </div>
))}
</div>
  </div>
))}
                    
                    {plan.days.length > 3 && (
  <div className="text-center">
    <span className="text-xs text-neutral-500">
      +{plan.days.length - 3} more days
    </span>
  </div>
)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelected(plan);
                      setOpenModal(true);
                    }}
                    className="h-10 px-3 rounded-xl border border-neutral-700 hover:border-neutral-600 transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="h-10 px-3 rounded-xl border border-red-500/40 text-red-400 hover:border-red-500/60 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {openModal && (
        <WorkoutPlanModal
          memberId={memberId as string}
          workoutPlan={selected}
          onClose={() => setOpenModal(false)}
          onSuccess={() => {
            setOpenModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}