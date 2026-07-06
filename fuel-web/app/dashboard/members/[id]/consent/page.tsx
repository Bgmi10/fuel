"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const Page = () => {
  const { id } = useParams();

  const [member, setMember] =
    useState<any>(null);
    const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const fetchMember = async () => {
    try {
      const res = await fetch(
        `/api/members/${id}`
      );

      const data = await res.json();

      setMember(data.member);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMember();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="p-10">
        Loading...
      </div>
    );
  }

  const form =
    member?.onBoardingForm || {};

  const parq = form.parq || {};
  const lhq = form.lhq || {};
  const consent =
    form.consent || {};

  return (
    <div className="bg-neutral-200 min-h-screen py-10">

      <div className="max-w-4xl mx-auto">
      <button
            onClick={() => router.back()}
            className="text-black mb-3"
          >
            ← Back
          </button>
        {/* DOCUMENT */}

        <div className="bg-white shadow-xl rounded-lg p-10 text-black">

          {/* HEADER */}

          <div className="border-b pb-6">

            <img
              src="/Fuel Main Logo.jpg"
              alt="logo"
              className="w-24 mb-4"
            />

            <h1 className="text-3xl font-bold">
              Member Health Declaration &
              Consent Form
            </h1>

            <p className="text-sm text-neutral-500 mt-2">
              Fuel Gym & Yoga
            </p>

          </div>

          {/* MEMBER DETAILS */}

          <div className="mt-8">

            <h2 className="font-bold text-xl mb-4">
              Member Information
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm">

              <div>
                <span className="font-semibold">
                  Name:
                </span>{" "}
                {member.name}
              </div>

              <div>
                <span className="font-semibold">
                  Email:
                </span>{" "}
                {member.email}
              </div>

              <div>
                <span className="font-semibold">
                  Phone:
                </span>{" "}
                {member.phone}
              </div>

              <div>
                <span className="font-semibold">
                  Gender:
                </span>{" "}
                {member.gender || "-"}
              </div>

              <div>
                <span className="font-semibold">
                  Height:
                </span>{" "}
                {member.height
                  ? `${member.height} cm`
                  : "-"}

              </div>

              <div>
                <span className="font-semibold">
                  Weight:
                </span>{" "}
                {member.weight
                  ? `${member.weight} kg`
                  : "-"}
              </div>

            </div>

          </div>

          {/* PARQ */}

          <div className="mt-10">

            <h2 className="text-xl font-bold mb-5">
              Physical Activity Readiness
              Questionnaire (PAR-Q)
            </h2>

            <div className="space-y-3 text-sm">

              <Question
                title="Heart condition requiring medical supervision"
                value={parq.heartCondition}
              />

              <Question
                title="Chest pain during exercise"
                value={
                  parq.chestPainExercise
                }
              />

              <Question
                title="Chest pain while resting"
                value={
                  parq.chestPainRest
                }
              />

              <Question
                title="Dizziness or fainting"
                value={
                  parq.dizzinessOrFainting
                }
              />

              <Question
                title="Bone / joint condition"
                value={
                  parq.boneJointCondition
                }
              />

              <Question
                title="Blood pressure medication"
                value={
                  parq.bloodPressureMedication
                }
              />

              <Question
                title="Other medical condition"
                value={
                  parq.otherMedicalCondition
                }
              />

            </div>

          </div>

          {/* LHQ */}

          <div className="mt-10">

            <h2 className="text-xl font-bold mb-5">
              Lifestyle & Health
              Questionnaire
            </h2>

            <div className="grid grid-cols-2 gap-5 text-sm">

            <Field
  label="Medical Conditions"
  value={
    lhq.medicalConditions?.length
      ? lhq.medicalConditions
          .map((condition: string) =>
            condition === "Other" &&
            lhq.otherMedicalCondition
              ? `Other (${lhq.otherMedicalCondition})`
              : condition
          )
          .join(", ")
      : "None"
  }
/>

              <Field
                label="Surgery / Injury"
                value={
                  lhq.surgeryOrInjury
                    ? "Yes"
                    : "No"
                }
              />

              {lhq.surgeryOrInjury && (
                <Field
                  label="Surgery Details"
                  value={
                    lhq.surgeryDetails
                  }
                />
              )}

              <Field
                label="Occupation Activity"
                value={
                  lhq.occupationActivityLevel
                }
              />

              <Field
                label="Daily Sitting Time"
                value={
                  lhq.dailySittingTime
                }
              />

              <Field
                label="Sleep Duration"
                value={
                  lhq.sleepDuration
                }
              />

              <Field
                label="Stress Level"
                value={
                  lhq.stressLevel
                }
              />

              <Field
                label="Smoking Habit"
                value={
                  lhq.smokingHabit
                }
              />

              <Field
                label="Alcohol Consumption"
                value={
                  lhq.alcoholConsumption
                }
              />

              <Field
                label="Water Intake"
                value={
                  lhq.waterIntake
                }
              />

              <Field
                label="Primary Goal"
                value={
                  lhq.primaryGoal
                }
              />

              <Field
                label="Preferred Training"
                value={
                  lhq.preferredTraining
                }
              />

              <Field
                label="Diet Preference"
                value={
                  lhq.dietaryPreference
                }
              />

            </div>

          </div>

          {/* DECLARATION */}

          <div className="mt-10">

            <h2 className="text-xl font-bold mb-4">
              Declaration & Consent
            </h2>

            <div className="space-y-3 text-sm">

              <p>
                Declaration Accepted:
                <span className="font-semibold ml-2">
                  {consent.declarationAccepted
                    ? "YES"
                    : "NO"}
                </span>
              </p>

              <p>
                Exercise Risk Accepted:
                <span className="font-semibold ml-2">
                  {consent.exerciseRiskAccepted
                    ? "YES"
                    : "NO"}
                </span>
              </p>

            </div>

          </div>

          {/* SIGNATURE */}

          {consent.signature && (
            <div className="mt-10">

              <h2 className="font-bold text-xl mb-4">
                Digital Signature
              </h2>

              <img
                src={consent.signature}
                alt="signature"
                className="h-28 border"
              />

              <p className="mt-3 text-sm">
                Signed by{" "}
                <strong>
                  {member.name}
                </strong>
              </p>

              <p className="text-sm text-neutral-500">
                {new Date(
                  member.updatedAt
                ).toLocaleString()}
              </p>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default Page;

function Question({
  title,
  value,
}: {
  title: string;
  value: boolean;
}) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span>{title}</span>
      <span className="font-semibold">
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-neutral-500 text-xs">
        {label}
      </p>

      <p className="font-medium">
        {value || "-"}
      </p>
    </div>
  );
}