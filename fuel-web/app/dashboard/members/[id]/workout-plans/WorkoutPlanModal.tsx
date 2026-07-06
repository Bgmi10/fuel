"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Dumbbell } from "lucide-react";
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

interface WorkoutPlanModalProps {
  memberId: string;
  workoutPlan?: WorkoutPlan | null;
  onClose: () => void;
  onSuccess: () => void;

}


const ExerciseForm = ({
  exercise,
  dayIndex,
  exerciseIndex,
  updateExercise,
  removeExercise,
}: any) => {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 mb-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>
    <label className="block text-xs text-neutral-400 mb-1">
      Exercise Name *
    </label>
    <input
      placeholder="e.g. Barbell Bench Press"
      value={exercise.exerciseName}
      onChange={(e) =>
        updateExercise(
          dayIndex,
          exerciseIndex,
          "exerciseName",
          e.target.value
        )
      }
      className="w-full h-10 px-3 bg-neutral-700 rounded-lg"
    />
  </div>

  <div>
    <label className="block text-xs text-neutral-400 mb-1">
      Number of Sets *
    </label>
    <input
      type="number"
      placeholder="e.g. 4"
      value={exercise.sets || ""}
      onChange={(e) =>
        updateExercise(
          dayIndex,
          exerciseIndex,
          "sets",
          e.target.value
            ? Number(e.target.value)
            : undefined
        )
      }
      className="w-full h-10 px-3 bg-neutral-700 rounded-lg"
    />
  </div>

  <div>
    <label className="block text-xs text-neutral-400 mb-1">
      Repetitions Per Set *
    </label>
    <input
      type="number"
      placeholder="e.g. 10"
      value={exercise.reps || ""}
      onChange={(e) =>
        updateExercise(
          dayIndex,
          exerciseIndex,
          "reps",
          e.target.value
            ? Number(e.target.value)
            : undefined
        )
      }
      className="w-full h-10 px-3 bg-neutral-700 rounded-lg"
    />
  </div>

  <div>
    <label className="block text-xs text-neutral-400 mb-1">
      Weight (Optional)
    </label>
    <input
      placeholder="e.g. 60 kg"
      value={exercise.weight || ""}
      onChange={(e) =>
        updateExercise(
          dayIndex,
          exerciseIndex,
          "weight",
          e.target.value
        )
      }
      className="w-full h-10 px-3 bg-neutral-700 rounded-lg"
    />
  </div>

  <div>
    <label className="block text-xs text-neutral-400 mb-1">
      Rest Between Sets (Seconds)
    </label>
    <input
      placeholder="e.g. 90"
      value={exercise.restSeconds || ""}
      onChange={(e) =>
        updateExercise(
          dayIndex,
          exerciseIndex,
          "restSeconds",
          e.target.value
        )
      }
      className="w-full h-10 px-3 bg-neutral-700 rounded-lg"
    />
  </div>

  <div className="md:col-span-2 lg:col-span-3">
    <label className="block text-xs text-neutral-400 mb-1">
      Exercise Notes / Instructions
    </label>
    <textarea
      placeholder="Any guidance for the member..."
      value={exercise.notes || ""}
      onChange={(e) =>
        updateExercise(
          dayIndex,
          exerciseIndex,
          "notes",
          e.target.value
        )
      }
      rows={3}
      className="w-full px-3 py-2 bg-neutral-700 rounded-lg resize-none"
    />
  </div>
</div>
    </div>
  );
};

export default function WorkoutPlanModal({
  memberId,
  workoutPlan,
  onClose,
  onSuccess,
}: WorkoutPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    isActive: true,
  });
  

  const [days, setDays] = useState([
    {
      name: "Day 1",
      dayNumber: 1,
      exercises: [
        {
          exerciseName: "",
          sets: undefined,
          reps: undefined,
          weight: "",
          restTime: "",
          notes: "",
        },
      ],
    },
  ]);

  useEffect(() => {
    if (!workoutPlan) return;
  
    setFormData({
      title: workoutPlan.title,
      description:
        workoutPlan.description || "",
      startDate:
        workoutPlan.startDate.split("T")[0],
      endDate:
        workoutPlan.endDate?.split("T")[0] ||
        "",
      isActive: workoutPlan.isActive,
    });
  
    setDays(
      //@ts-ignore
      workoutPlan.days?.length
        ? workoutPlan.days
        : [
            {
              name: "Day 1",
              dayNumber: 1,
              exercises: [],
            },
          ]
    );
  }, [workoutPlan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = workoutPlan
        ? `/api/workout-plans/${workoutPlan.id}`
        : "/api/workout-plans";
      
      const method = workoutPlan ? "PUT" : "POST";
      const payload = {
        ...formData,
        memberId,
      
        days: days.map((day) => ({
          ...day,
      
          exercises: day.exercises.filter(
            (exercise) =>
              exercise.exerciseName.trim()
          ),
        })),
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving workout plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const addDay = () => {
    setDays([
      ...days,
      {
        name: `Day ${days.length + 1}`,
        dayNumber: days.length + 1,
        exercises: [],
      },
    ]);
  };



  const removeDay = (index: number) => {
    setDays(days.filter((_, i) => i !== index));
  };



  const addExercise = (dayIndex: number) => {
    const updated = [...days];
  
    updated[dayIndex].exercises.push({
      exerciseName: "",
      sets: undefined,
      reps: undefined,
      weight: "",
      restTime: "",
      notes: "",
    });
  
    setDays(updated);
  };


  const removeExercise = (
    dayIndex: number,
    exerciseIndex: number
  ) => {
    const updated = [...days];
  
    updated[dayIndex].exercises =
      updated[dayIndex].exercises.filter(
        (_, i) => i !== exerciseIndex
      );
  
    setDays(updated);
  };
  
  const updateExercise = (
    dayIndex: number,
    exerciseIndex: number,
    field: string,
    value: any
  ) => {
    const updated = [...days];
  
    updated[dayIndex].exercises[
      exerciseIndex
    ] = {
      ...updated[dayIndex].exercises[
        exerciseIndex
      ],
      [field]: value,
    };
  
    setDays(updated);
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Dumbbell className="text-lime-400" size={20} />
            <h2 className="text-xl font-bold text-white">
              {workoutPlan ? "Edit Workout Plan" : "Create Workout Plan"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Plan Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-11 px-4 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:border-lime-400 focus:outline-none"
                placeholder="e.g., Beginner Strength Training"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-neutral-600 text-lime-400 focus:ring-lime-400"
                />
                Active Plan
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:border-lime-400 focus:outline-none resize-none"
              placeholder="Plan description and goals..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full h-11 px-4 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:border-lime-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full  h-11 px-4 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:border-lime-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Exercises</h3>
              <button
  type="button"
  onClick={addDay}
  className="flex items-center gap-2 px-3 py-2 bg-lime-400/10 text-lime-400 rounded-lg"
>
  <Plus size={16} />
  Add Day
</button>
            </div>

            <div className="space-y-4">
            {days.map((day, dayIndex) => (
  <div
    key={dayIndex}
    className="border border-neutral-700 rounded-2xl p-5"
  >
    <div className="flex justify-between mb-4 ">
      <input
        value={day.name}
        className="border"
        onChange={(e) => {
          const updated = [...days];
          updated[dayIndex].name =
            e.target.value;
          setDays(updated);
        }}
      />

      <button
        type="button"
        onClick={() =>
          removeDay(dayIndex)
        }
      >
        <Trash2 />
      </button>
    </div>

    {day.exercises.map(
  (exercise, exerciseIndex) => (
    <ExerciseForm
      key={exerciseIndex}
      exercise={exercise}
      dayIndex={dayIndex}
      exerciseIndex={exerciseIndex}
      updateExercise={
        updateExercise
      }
      removeExercise={
        removeExercise
      }
    />
  )
)}

<button
  type="button"
  onClick={() =>
    addExercise(dayIndex)
  }
  className="mt-3 px-4 py-2 rounded-xl bg-lime-400 text-black font-medium"
>
  Add Exercise
</button>
  </div>
))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 rounded-xl border border-neutral-700 text-neutral-300 hover:border-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-xl bg-lime-400 text-black font-semibold hover:bg-lime-300 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : workoutPlan ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}