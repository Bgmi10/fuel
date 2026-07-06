import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import tw from "twrnc";
import {
  Dumbbell,
  ChevronDown,
} from "lucide-react-native";

import { useAuth } from "../../../src/contexts/AuthContext";
import { request } from "../../../src/api/client";

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

type WorkoutPlan = {
  id: string;
  title: string;
  description?: string;
  endDate?: string;
  days: WorkoutDay[];
};

export default function WorkoutPlansScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);

  const [openDay, setOpenDay] =
    useState<string | null>(null);

  const fetchPlans = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const data = await request({
        method: "GET",
        url: `/workout-plans?memberId=${user.id}&active=true`,
      });

      const workoutPlans =
        data.data || [];

      setPlans(workoutPlans);

      if (
        workoutPlans.length &&
        workoutPlans[0].days.length
      ) {
        setOpenDay(
          workoutPlans[0].days[0].id
        );
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [user?.id]);

  if (loading) {
    return (
      <SafeAreaView
        style={tw`flex-1 bg-slate-950 justify-center items-center`}
      >
        <ActivityIndicator
          size="large"
          color="#A3E635"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-950`}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-5 pt-6 pb-10`}
      >

        {/* Header */}

<View style={tw`mb-8`}>
  <View style={tw`flex-row items-center`}>
    <View
      style={tw`w-14 h-14 rounded-3xl bg-lime-400/10 border border-lime-400/20 items-center justify-center mr-4`}
    >
      <Dumbbell
        size={26}
        color="#A3E635"
      />
    </View>

    <View style={tw`flex-1`}>
      <Text
        style={tw`text-white text-3xl font-bold`}
      >
        Workout Plans
      </Text>

      <Text
        style={tw`text-neutral-500 mt-1 leading-5`}
      >
        Your trainer's personalized workout
        schedule.
      </Text>
    </View>
  </View>
</View>

{/* Empty State */}

{plans.length === 0 && (
  <View
    style={tw`mt-20 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 items-center`}
  >
    <View
      style={tw`w-24 h-24 rounded-full bg-neutral-800 items-center justify-center`}
    >
      <Dumbbell
        size={42}
        color="#525252"
      />
    </View>

    <Text
      style={tw`text-white text-2xl font-bold mt-6`}
    >
      No Workout Plans
    </Text>

    <Text
      style={tw`text-neutral-500 text-center mt-3 leading-6`}
    >
      Your trainer hasn't assigned a workout
      plan yet.
    </Text>
  </View>
)}

{/* Workout Plans */}

{plans.map((plan) => {
  const exerciseCount = plan.days.reduce(
    (total, day) => total + day.exercises.length,
    0
  );

  return (
    <View
      key={plan.id}
      style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6`}
    >
      {/* Plan Header */}

      <Text
        style={tw`text-white text-2xl font-bold`}
      >
        {plan.title}
      </Text>

      {!!plan.description && (
        <Text
          style={tw`text-neutral-400 mt-2 leading-6`}
        >
          {plan.description}
        </Text>
      )}

      {/* Stats */}

      <View style={tw`flex-row mt-6`}>
        <View
          style={tw`flex-1 bg-black/30 rounded-2xl p-4 mr-2`}
        >
          <Text
            style={tw`text-neutral-500 text-xs`}
          >
            Days
          </Text>

          <Text
            style={tw`text-white text-2xl font-bold mt-2`}
          >
            {plan.days.length}
          </Text>
        </View>

        <View
          style={tw`flex-1 bg-black/30 rounded-2xl p-4 mr-2`}
        >
          <Text
            style={tw`text-neutral-500 text-xs`}
          >
            Exercises
          </Text>

          <Text
            style={tw`text-white text-2xl font-bold mt-2`}
          >
            {exerciseCount}
          </Text>
        </View>

        <View
          style={tw`flex-1 bg-black/30 rounded-2xl p-4`}
        >
          <Text
            style={tw`text-neutral-500 text-xs`}
          >
            Ends
          </Text>

          <Text
            style={tw`text-white text-sm font-semibold mt-2`}
          >
            {plan.endDate
              ? new Date(
                  plan.endDate
                ).toLocaleDateString()
              : "--"}
          </Text>
        </View>
      </View>

      {/* Workout Schedule */}

      <View style={tw`mt-7`}>
        <Text
          style={tw`text-white text-lg font-bold mb-4`}
        >
          Workout Schedule
        </Text>

        {/* Workout Days Here */}
        {plan.days
  .sort((a, b) => a.dayNumber - b.dayNumber)
  .map((day) => {
    const isOpen = openDay === day.id;

    return (
      <View
        key={day.id}
        style={tw`mb-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950`}
      >
        {/* Accordion Header */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            setOpenDay(
              isOpen ? null : day.id
            )
          }
          style={tw`px-5 py-5 flex-row items-center justify-between`}
        >
          <View style={tw`flex-1`}>
            <Text
              style={tw`text-white text-lg font-bold`}
            >
              Day {day.dayNumber}
            </Text>

            <Text
              style={tw`text-neutral-500 mt-1`}
            >
              {day.name}
            </Text>
          </View>

          <View
            style={tw`items-end mr-3`}
          >
            <Text
              style={tw`text-neutral-500 text-xs`}
            >
              {day.exercises.length} Exercises
            </Text>
          </View>

          <ChevronDown
            size={20}
            color="#9CA3AF"
            style={{
              transform: [
                {
                  rotate: isOpen
                    ? "180deg"
                    : "0deg",
                },
              ],
            }}
          />
        </TouchableOpacity>

        {/* Accordion Body */}

        {isOpen && (
          <View
            style={tw`border-t border-neutral-800 px-4 py-4`}
          >
            {/* Exercise Cards Here */}
            {day.exercises.map((exercise) => (
  <View
    key={exercise.id}
    style={tw`bg-neutral-900 rounded-2xl p-4 mb-4 border border-neutral-800`}
  >
    {/* Exercise Header */}

    <View style={tw`flex-row`}>
      <View
        style={tw`w-12 h-12 rounded-2xl bg-lime-400/10 items-center justify-center mr-4`}
      >
        <Dumbbell
          size={18}
          color="#A3E635"
        />
      </View>

      <View style={tw`flex-1`}>
        <Text
          style={tw`text-white text-lg font-semibold`}
        >
          {exercise.exerciseName}
        </Text>

        {/* Exercise Chips */}

        <View
          style={tw`flex-row flex-wrap mt-3`}
        >
          {exercise.sets != null && (
            <View
              style={tw`bg-neutral-800 rounded-full px-3 py-2 mr-2 mb-2`}
            >
              <Text
                style={tw`text-neutral-300 text-xs`}
              >
                {exercise.sets} Sets
              </Text>
            </View>
          )}

          {exercise.reps != null && (
            <View
              style={tw`bg-neutral-800 rounded-full px-3 py-2 mr-2 mb-2`}
            >
              <Text
                style={tw`text-neutral-300 text-xs`}
              >
                {exercise.reps} Reps
              </Text>
            </View>
          )}

          {!!exercise.weight && (
            <View
              style={tw`bg-neutral-800 rounded-full px-3 py-2 mr-2 mb-2`}
            >
              <Text
                style={tw`text-neutral-300 text-xs`}
              >
                {exercise.weight} kg
              </Text>
            </View>
          )}

          {!!exercise.restSeconds && (
            <View
              style={tw`bg-neutral-800 rounded-full px-3 py-2 mr-2 mb-2`}
            >
              <Text
                style={tw`text-neutral-300 text-xs`}
              >
                {exercise.restSeconds}s Rest
              </Text>
            </View>
          )}
        </View>

        {/* Trainer Note */}

        {!!exercise.notes && (
          <View
            style={tw`mt-4 rounded-2xl bg-lime-400/10 border border-lime-400/20 p-4`}
          >
            <Text
              style={tw`text-lime-400 text-xs font-bold mb-2`}
            >
              TRAINER NOTE
            </Text>

            <Text
              style={tw`text-neutral-300 leading-6`}
            >
              {exercise.notes}
            </Text>
          </View>
        )}
      </View>
    </View>
  </View>
))}
          </View>
        )}
      </View>
    );
  })}
      </View>
    </View>
  );
})}

      </ScrollView>
    </SafeAreaView>
  );
}