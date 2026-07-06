import React, { useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import tw from "twrnc";

type Props = {
  assessment: any;
  setAssessment: any;
  onBack: () => void;
  onContinue: () => void;
};

const medicalConditions = [
  "Diabetes",
  "Hypertension",
  "Thyroid Disorder",
  "PCOS/PCOD",
  "Asthma",
  "Other",
];

function QuestionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-5`}
    >
      <Text
        style={tw`text-white text-base font-semibold leading-6 mb-5`}
      >
        {title}
      </Text>

      {children}
    </View>
  );
}

function ChoiceButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        tw`h-13 rounded-2xl justify-center items-center border mb-3`,
        selected
          ? tw`bg-lime-400 border-lime-400`
          : tw`bg-neutral-950 border-neutral-700`,
      ]}
    >
      <Text
        style={[
          tw`font-bold`,
          {
            color: selected ? "#000" : "#fff",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ChoiceQuestion({
  title,
  value,
  options,
  onSelect,
}: {
  title: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <QuestionCard title={title}>
      {options.map((option) => (
        <ChoiceButton
          key={option}
          label={option}
          selected={value === option}
          onPress={() => onSelect(option)}
        />
      ))}
    </QuestionCard>
  );
}

export default function LifestyleStep({
  assessment,
  setAssessment,
  onBack,
  onContinue,
}: Props) {
  const updateField = (
    key: string,
    value: any
  ) => {
    setAssessment((prev: any) => ({
      ...prev,
      lhq: {
        ...prev.lhq,
        [key]: value,
      },
    }));
  };

  const toggleCondition = (
    condition: string
  ) => {
    const exists =
      assessment.lhq.medicalConditions.includes(
        condition
      );

    setAssessment((prev: any) => ({
      ...prev,
      lhq: {
        ...prev.lhq,
        medicalConditions: exists
          ? prev.lhq.medicalConditions.filter(
              (c: string) =>
                c !== condition
            )
          : [
              ...prev.lhq.medicalConditions,
              condition,
            ],
      },
    }));
  };

  const isLhqComplete = useMemo(() => {
    return (
      assessment.lhq
        .occupationActivityLevel &&
      assessment.lhq.dailySittingTime &&
      assessment.lhq.sleepDuration &&
      assessment.lhq.stressLevel &&
      assessment.lhq.smokingHabit &&
      assessment.lhq.alcoholConsumption &&
      assessment.lhq.waterIntake &&
      assessment.lhq.primaryGoal &&
      assessment.lhq.preferredTraining &&
      assessment.lhq.dietaryPreference &&
      (!assessment.lhq.surgeryOrInjury ||
        assessment.lhq.surgeryDetails.trim() !==
          "")
    );
  }, [assessment]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tw`px-5 pt-8 pb-12`}
    >
      {/* HEADER */}

      <View style={tw`items-center mb-8`}>
        <View
          style={tw`bg-lime-400/10 border border-lime-400/30 rounded-full px-5 py-2 mb-5`}
        >
          <Text
            style={tw`text-lime-400 font-semibold`}
          >
            STEP 2 OF 3
          </Text>
        </View>

        <Text
          style={tw`text-white text-3xl font-bold text-center`}
        >
          Lifestyle & Health
        </Text>

        <Text
          style={tw`text-lime-400 text-3xl font-bold text-center`}
        >
          Questionnaire
        </Text>

        <Text
          style={tw`text-neutral-500 text-center mt-5 leading-6`}
        >
          Help us understand your
          lifestyle, health and fitness
          goals.
        </Text>
      </View>

      <View
        style={tw`bg-neutral-950 border border-neutral-900 rounded-3xl p-5`}
      >
        {/* MEDICAL CONDITIONS */}

        <QuestionCard title="Diagnosed Medical Conditions">
          {medicalConditions.map(
            (condition) => {
              const selected =
                assessment.lhq.medicalConditions.includes(
                  condition
                );

              return (
                <TouchableOpacity
                  key={condition}
                  activeOpacity={0.85}
                  onPress={() =>
                    toggleCondition(
                      condition
                    )
                  }
                  style={tw`flex-row items-center bg-neutral-950 border border-neutral-700 rounded-2xl p-4 mb-3`}
                >
                  <View
                    style={[
                      tw`w-6 h-6 rounded-md border mr-4 justify-center items-center`,
                      selected
                        ? tw`bg-lime-400 border-lime-400`
                        : tw`border-neutral-500`,
                    ]}
                  >
                    {selected && (
                      <Text
                        style={tw`text-black font-bold`}
                      >
                        ✓
                      </Text>
                    )}
                  </View>

                  <Text
                    style={tw`text-white`}
                  >
                    {condition}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}

          {assessment.lhq.medicalConditions.includes(
            "Other"
          ) && (
            <TextInput
              multiline
              value={
                assessment.lhq
                  .otherMedicalCondition
              }
              onChangeText={(text) =>
                updateField(
                  "otherMedicalCondition",
                  text
                )
              }
              placeholder="Please specify..."
              placeholderTextColor="#777"
              style={tw`bg-neutral-950 border border-neutral-700 rounded-2xl p-4 text-white mt-2`}
            />
          )}
        </QuestionCard>

        {/* SURGERY */}

        <QuestionCard title="Have you had any surgery or major injury?">
          <View style={tw`flex-row`}>
            <TouchableOpacity
              onPress={() =>
                updateField(
                  "surgeryOrInjury",
                  true
                )
              }
              style={[
                tw`flex-1 h-13 rounded-2xl justify-center items-center mr-2 border`,
                assessment.lhq
                  .surgeryOrInjury
                  ? tw`bg-lime-400 border-lime-400`
                  : tw`bg-neutral-950 border-neutral-700`,
              ]}
            >
              <Text
                style={[
                  tw`font-bold`,
                  {
                    color:
                      assessment.lhq
                        .surgeryOrInjury
                        ? "#000"
                        : "#fff",
                  },
                ]}
              >
                YES
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setAssessment(
                  (prev: any) => ({
                    ...prev,
                    lhq: {
                      ...prev.lhq,
                      surgeryOrInjury:
                        false,
                      surgeryDetails:
                        "",
                    },
                  })
                )
              }
              style={[
                tw`flex-1 h-13 rounded-2xl justify-center items-center ml-2 border`,
                !assessment.lhq
                  .surgeryOrInjury
                  ? tw`bg-lime-400 border-lime-400`
                  : tw`bg-neutral-950 border-neutral-700`,
              ]}
            >
              <Text
                style={[
                  tw`font-bold`,
                  {
                    color:
                      !assessment.lhq
                        .surgeryOrInjury
                        ? "#000"
                        : "#fff",
                  },
                ]}
              >
                NO
              </Text>
            </TouchableOpacity>
          </View>

          {assessment.lhq
            .surgeryOrInjury && (
            <TextInput
              multiline
              numberOfLines={4}
              value={
                assessment.lhq
                  .surgeryDetails
              }
              onChangeText={(text) =>
                updateField(
                  "surgeryDetails",
                  text
                )
              }
              placeholder="Describe your surgery or injury..."
              placeholderTextColor="#777"
              style={tw`bg-neutral-950 border border-neutral-700 rounded-2xl p-4 text-white mt-5`}
            />
          )}
        </QuestionCard>

        {/* PART 2 STARTS HERE */}

        <ChoiceQuestion
          title="Occupation Activity Level"
          value={
            assessment.lhq
              .occupationActivityLevel
          }
          options={[
            "Mostly Sitting (Desk Job)",
            "Moderately Active",
            "Physically Active",
          ]}
          onSelect={(value) =>
            updateField(
              "occupationActivityLevel",
              value
            )
          }
        />

        <ChoiceQuestion
          title="Average Daily Sitting Time"
          value={
            assessment.lhq
              .dailySittingTime
          }
          options={[
            "Less than 4 Hours",
            "4–8 Hours",
            "More than 8 Hours",
          ]}
          onSelect={(value) =>
            updateField(
              "dailySittingTime",
              value
            )
          }
        />

        <ChoiceQuestion
          title="Average Sleep Duration"
          value={
            assessment.lhq
              .sleepDuration
          }
          options={[
            "Less than 6 Hours",
            "6–8 Hours",
            "More than 8 Hours",
          ]}
          onSelect={(value) =>
            updateField(
              "sleepDuration",
              value
            )
          }
        />

        <ChoiceQuestion
          title="Stress Level"
          value={
            assessment.lhq
              .stressLevel
          }
          options={[
            "Low",
            "Moderate",
            "High",
          ]}
          onSelect={(value) =>
            updateField(
              "stressLevel",
              value
            )
          }
        />

        <ChoiceQuestion
          title="Smoking Habit"
          value={
            assessment.lhq
              .smokingHabit
          }
          options={[
            "Never Smoked",
            "Former Smoker",
            "Occasionally",
            "Daily",
          ]}
          onSelect={(value) =>
            updateField(
              "smokingHabit",
              value
            )
          }
        />

        <ChoiceQuestion
          title="Alcohol Consumption"
          value={
            assessment.lhq
              .alcoholConsumption
          }
          options={[
            "Never",
            "Occasionally",
            "Weekly",
            "Multiple Times per Week",
          ]}
          onSelect={(value) =>
            updateField(
              "alcoholConsumption",
              value
            )
          }
        />

        <ChoiceQuestion
          title="Daily Water Intake"
          value={
            assessment.lhq
              .waterIntake
          }
          options={[
            "Less than 2 Litres",
            "2–3 Litres",
            "More than 3 Litres",
          ]}
          onSelect={(value) =>
            updateField(
              "waterIntake",
              value
            )
          }
        />

        {/* PART 3 STARTS HERE */}
        <ChoiceQuestion
          title="Primary Goal"
          value={assessment.lhq.primaryGoal}
          options={[
            "Weight Loss",
            "Fat Loss",
            "Muscle Gain",
            "Strength Improvement",
            "General Fitness",
            "Improve Flexibility & Mobility",
            "Sports Performance",
          ]}
          onSelect={(value) =>
            updateField("primaryGoal", value)
          }
        />

        <ChoiceQuestion
          title="Preferred Training"
          value={assessment.lhq.preferredTraining}
          options={[
            "Gym",
            "Yoga",
            "Zumba",
          ]}
          onSelect={(value) =>
            updateField(
              "preferredTraining",
              value
            )
          }
        />

        <ChoiceQuestion
          title="Dietary Preference"
          value={assessment.lhq.dietaryPreference}
          options={[
            "Vegetarian",
            "Eggetarian",
            "Non-Vegetarian",
            "Vegan",
            "Others",
          ]}
          onSelect={(value) =>
            updateField(
              "dietaryPreference",
              value
            )
          }
        />

        {!isLhqComplete && (
          <View
            style={tw`bg-red-500/10 border border-red-500/30 rounded-2xl p-4`}
          >
            <Text
              style={tw`text-red-400 text-center`}
            >
              Please answer every question before
              continuing.
            </Text>
          </View>
        )}

        {/* BUTTONS */}

        <View
          style={tw`flex-row mt-8`}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onBack}
            style={tw`flex-1 h-14 rounded-2xl border border-neutral-700 justify-center items-center mr-2`}
          >
            <Text
              style={tw`text-white font-bold text-lg`}
            >
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!isLhqComplete}
            onPress={onContinue}
            style={[
              tw`flex-1 h-14 rounded-2xl justify-center items-center ml-2`,
              isLhqComplete
                ? tw`bg-lime-400`
                : tw`bg-lime-300`,
            ]}
          >
            <Text
              style={tw`text-black font-bold text-lg`}
            >
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}