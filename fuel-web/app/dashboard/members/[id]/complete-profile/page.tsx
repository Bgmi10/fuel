"use client";

import { useEffect, useState } from "react";

import SignatureCanvas from "react-signature-canvas";
import { useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/contexts/MemberAuthContext";
import { Member } from "@prisma/client";
import { ArrowLeftIcon } from "lucide-react";


const page = () => {
    const [step, setStep] = useState(1);
    const searchParams = useSearchParams();

const isEdit =
  searchParams.get("edit") === "true";

    const { id } = useParams();
    const [member, setMember] = useState<Member | null>(null);


    useEffect(() => {
        const fetchMember = async () => {
            const response = await fetch(`/api/members/${id}`);
            const data = await response.json();
            setMember(data.member);
        };
        fetchMember();
    }, [id]);


    useEffect(() => {
        if (
          member?.onBoardCompleted &&
          !isEdit
        ) {
          router.push(
            `/dashboard/members/${id}`
          );
        }
      }, [member, isEdit]);

      useEffect(() => {
        if (
          isEdit &&
          member?.onBoardingForm
        ) {
          setAssessment(
            member.onBoardingForm as any
          );
        }
      }, [member, isEdit]);


    const sigRef = useRef<SignatureCanvas | null>(null);
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const parqQuestions = [
        {
          key: "heartCondition",
          label:
            "Has a doctor ever informed you that you have a heart condition and should only exercise under medical supervision?",
        },
        {
          key: "chestPainExercise",
          label:
            "Do you experience chest pain during physical activity?",
        },
        {
          key: "chestPainRest",
          label:
            "Have you experienced chest pain while at rest within the last month?",
        },
        {
          key: "dizzinessOrFainting",
          label:
            "Do you lose balance because of dizziness or have episodes of fainting?",
        },
        {
          key: "boneJointCondition",
          label:
            "Do you have any bone, joint, muscle, or mobility condition that may worsen with exercise?",
        },
        {
          key: "bloodPressureMedication",
          label:
            "Are you currently taking medication for blood pressure or a heart condition?",
        },
        {
          key: "otherMedicalCondition",
          label:
            "Are you aware of any other medical condition that may affect your ability to exercise safely?",
        },


      ];


      const SelectField = ({
        label,
        value,
        options,
        onChange,
      }: any) => (
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">
            {label}
          </label>
      
          <select
            value={value}
            onChange={(e) =>
              onChange(e.target.value)
            }
            className="w-full h-14 px-4 rounded-2xl bg-neutral-900 border border-white/10 outline-none focus:border-lime-400"
          >
            <option value="">
              Select
            </option>
      
            {options.map((option: string) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        </div>
      );

const [assessment, setAssessment] =
  useState({
    parq: {
      heartCondition: null,
      chestPainExercise: null,
      chestPainRest: null,
      dizzinessOrFainting: null,
      boneJointCondition: null,
      bloodPressureMedication: null,
      otherMedicalCondition: null,
      confirmed: false,
    },

    lhq: {
      medicalConditions: [],
      otherMedicalCondition: "",
      surgeryOrInjury: false,
      surgeryDetails: "",

      occupationActivityLevel: "",
      dailySittingTime: "",
      sleepDuration: "",
      stressLevel: "",

      smokingHabit: "",
      alcoholConsumption: "",
      waterIntake: "",

      primaryGoal: "",
      preferredTraining: "",
      dietaryPreference: "",
    },

    consent: {
        declarationAccepted: false,
        exerciseRiskAccepted: false,
        signature: "",
      }
  });




const handleFinalSubmit = async () => {
  try {
    setSaving(true);

    let signatureUrl =
  assessment.consent.signature || "";

    if (sigRef.current && !sigRef.current.isEmpty()) {
      const canvas =
        sigRef.current.getTrimmedCanvas();

      const blob: Blob | null =
        await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );

      if (!blob) {
        throw new Error(
          "Failed to generate signature image"
        );
      }

      const formData = new FormData();

      formData.append(
        "file",
        new File(
          [blob],
          `signature-${member?.id}.png`,
          {
            type: "image/png",
          }
        )
      );

      const uploadResponse =
        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

      const uploadData =
        await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData.message ||
            "Failed to upload signature"
        );
      }

      signatureUrl = uploadData.url;
    }

    const payload = {
        ...(isEdit
          ? {}
          : { onBoardCompleted: true }),
      
        onBoardingForm: {
          ...assessment,
          consent: {
            ...assessment.consent,
            signature: signatureUrl,
          },
        },
      };

    const response = await fetch(
      `/api/members/${member?.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to complete onboarding"
      );
    }

    router.push(`/dashboard/members/${id}`);
  } catch (error) {
    console.error(error);

    alert(
      "Something went wrong. Please try again."
    );
  } finally {
    setSaving(false);
  }
};

  const isConsentComplete =
  assessment.consent.declarationAccepted &&
  assessment.consent.exerciseRiskAccepted &&
  assessment.consent.signature;

  const isLhqComplete =
  assessment.lhq.occupationActivityLevel !== "" &&
  assessment.lhq.dailySittingTime !== "" &&
  assessment.lhq.sleepDuration !== "" &&
  assessment.lhq.stressLevel !== "" &&
  assessment.lhq.smokingHabit !== "" &&
  assessment.lhq.alcoholConsumption !== "" &&
  assessment.lhq.waterIntake !== "" &&
  assessment.lhq.primaryGoal !== "" &&
  assessment.lhq.preferredTraining !== "" &&
  assessment.lhq.dietaryPreference !== "" &&
  (
    //@ts-ignore
    !assessment.lhq.medicalConditions.includes("Other") ||
    assessment.lhq.otherMedicalCondition.trim() !== ""
  ) &&
  (
    !assessment.lhq.surgeryOrInjury ||
    assessment.lhq.surgeryDetails.trim() !== ""
  );

  const isParqComplete = Object.entries(
    assessment.parq
  )
    .filter(([key]) => key !== "confirmed")
    .every(
      ([, value]) =>
        value !== null &&
        value !== undefined
    );


    return (
        <div className="min-h-screen bg-slate-950 text-white px-4 py-6">
       <button onClick={() => router.push(`/dashboard/members/${id}`)} className="flex items-center gap-2">
        <ArrowLeftIcon className="w-4 h-4" />
        <span className="text-sm">Back</span>
       </button>
  <div className="fixed inset-0 pointer-events-none">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-lime-400/10 blur-[180px]" />
  </div>

  <div className="relative z-10">
  {step === 1 && (
  <div className="max-w-4xl mx-auto">

    <div className="text-center mb-8">
    <h1>
  {isEdit
    ? "Edit PAR-Q Form"
    : "Physical Activity Readiness Questionnaire"}
</h1>

      <p className="text-neutral-400 mt-3 text-sm md:text-base">
        Please answer all questions honestly.
      </p>
    </div>

    <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-4 md:p-8 backdrop-blur-xl">

      <div className="space-y-4">

        {parqQuestions.map((question) => (
          <div
            key={question.key}
            className="rounded-3xl border border-white/10 bg-black/20 p-5"
          >
            <p className="text-white font-medium leading-relaxed">
              {question.label}
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">

              <button
                type="button"
                onClick={() =>
                  setAssessment((prev) => ({
                    ...prev,
                    parq: {
                      ...prev.parq,
                      [question.key]: true,
                    },
                  }))
                }
                className={`h-12 rounded-2xl font-semibold transition
                ${
                  assessment.parq[
                    question.key as keyof typeof assessment.parq
                  ] === true
                    ? "bg-red-500 text-white"
                    : "bg-neutral-900 border border-white/10 text-white"
                }`}
              >
                Yes
              </button>

              <button
                type="button"
                onClick={() =>
                  setAssessment((prev) => ({
                    ...prev,
                    parq: {
                      ...prev.parq,
                      [question.key]: false,
                    },
                  }))
                }
                className={`h-12 rounded-2xl font-semibold transition
                ${
                  assessment.parq[
                    question.key as keyof typeof assessment.parq
                  ] === false
                    ? "bg-lime-400 text-black"
                    : "bg-neutral-900 border border-white/10 text-white"
                }`}
              >
                No
              </button>

            </div>
          </div>
        ))}

      </div>

      <div className="mt-8 rounded-3xl border border-lime-400/20 bg-lime-400/5 p-5">

        <label className="flex items-start gap-3 cursor-pointer">

          <input
            type="checkbox"
            checked={
              assessment.parq.confirmed
            }
            onChange={(e) =>
              setAssessment((prev) => ({
                ...prev,
                parq: {
                  ...prev.parq,
                  confirmed:
                    e.target.checked,
                },
              }))
            }
            className="mt-1 h-5 w-5 accent-lime-400"
          />

          <span className="text-sm text-neutral-300 leading-relaxed">
            I confirm that the information
            provided above is accurate and
            complete.
          </span>

        </label>
      </div>

      {!isParqComplete && (
  <p className="text-red-400 text-sm mt-4">
    Please answer all questions.
  </p>
)}  
      <div className="mt-8 flex justify-end">

        

        <button
          disabled={
            !isParqComplete ||
            !assessment.parq.confirmed
          }
          onClick={() => setStep(2)}
          className="h-14 px-8 rounded-2xl bg-lime-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>

      </div>

    </div>

  </div>
  
)}

{step === 2 && (
  <div className="max-w-5xl mx-auto">

    <div className="text-center mb-8">
      <h1 className="text-2xl md:text-4xl font-black text-white">
      {isEdit
  ? "Edit Lifestyle & Health Questionnaire"
  : "Lifestyle & Health Questionnaire"}
      </h1>

      <p className="text-neutral-400 mt-3">
        Help us understand your lifestyle,
        fitness goals and health background.
      </p>
    </div>

    <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-4 md:p-8 backdrop-blur-xl space-y-8">

      {/* MEDICAL CONDITIONS */}

      <div>
        <div className="grid grid-cols-1 gap-4">

        <div className="space-y-4">

<h3 className="font-bold text-lg">
  Diagnosed Medical Conditions
</h3>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

  {[
    "Diabetes",
    "Hypertension",
    "Thyroid Disorder",
    "PCOS/PCOD",
    "Asthma",
    "Other",
  ].map((condition) => (
    <label
      key={condition}
      className="
      flex
      items-center
      gap-3
      p-4
      rounded-2xl
      border
      border-white/10
      bg-neutral-900
      cursor-pointer
      "
    >
      <input
        type="checkbox"
        checked={assessment.lhq.medicalConditions.includes(
          condition as never
        )}
        onChange={(e) => {
          if (e.target.checked) {
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                medicalConditions: [
                  ...prev.lhq.medicalConditions,
                  condition as never,
                ],
              },
            }));
          } else {
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                medicalConditions:
                  prev.lhq.medicalConditions.filter(
                    (item) =>
                      item !== condition
                  ),
              },
            }));
          }
        }}
        className="
        h-5
        w-5
        accent-lime-400
        "
      />

      <span>{condition}</span>

    </label>
  ))}

{
//@ts-ignore
assessment.lhq.medicalConditions.includes("Other") && (
  <div className="mt-4">
    <label className="block text-sm text-neutral-400 mb-2">
      Please specify
    </label>

    <textarea
      value={assessment.lhq.otherMedicalCondition}
      onChange={(e) =>
        setAssessment((prev) => ({
          ...prev,
          lhq: {
            ...prev.lhq,
            otherMedicalCondition: e.target.value,
          },
        }))
      }
      placeholder="Enter medical condition"
      className="w-full p-4 rounded-2xl bg-neutral-900 border border-white/10"

    />
  </div>
)}
</div>

</div>
        </div>
      </div>

      {/* SURGERY */}

      <div className="space-y-4">

        <label className="font-medium block">
        Have you had any surgery or major injury?
        </label>

        <div className="grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={() =>
              setAssessment((prev) => ({
                ...prev,
                lhq: {
                  ...prev.lhq,
                  surgeryOrInjury: true,
                },
              }))
            }
            className={`h-12 rounded-2xl
            ${
              assessment.lhq.surgeryOrInjury
                ? "bg-lime-400 text-black"
                : "bg-neutral-900 border border-white/10"
            }`}
          >
            Yes
          </button>

          <button
            type="button"
            onClick={() =>
              setAssessment((prev) => ({
                ...prev,
                lhq: {
                  ...prev.lhq,
                  surgeryOrInjury: false,
                  surgeryDetails: "",
                },
              }))
            }
            className={`h-12 rounded-2xl
            ${
              !assessment.lhq.surgeryOrInjury
                ? "bg-lime-400 text-black"
                : "bg-neutral-900 border border-white/10"
            }`}
          >
            No
          </button>

        </div>

        {assessment.lhq.surgeryOrInjury && (
          <textarea
            rows={4}
            placeholder="Describe surgery or injury..."
            value={
              assessment.lhq.surgeryDetails
            }
            onChange={(e) =>
              setAssessment((prev) => ({
                ...prev,
                lhq: {
                  ...prev.lhq,
                  surgeryDetails:
                    e.target.value,
                },
              }))
            }
            className="w-full p-4 rounded-2xl bg-neutral-900 border border-white/10"
          />
        )}
      </div>

      {/* LIFESTYLE */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <SelectField
          label="Occupation Activity Level"
          value={
            assessment.lhq
              .occupationActivityLevel
          }
          options={[
            "Mostly Sitting (Desk Job)",
            "Moderately Active",
            "Physically Active",
          ]}
          onChange={(value: string) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                occupationActivityLevel:
                  value,
              },
            }))
          }
        />

        <SelectField
          label="Average Daily Sitting Time"
          value={
            assessment.lhq.dailySittingTime
          }
          options={[
            "Less than 4 Hours",
            "4–8 Hours",
            "More than 8 Hours",
          ]}
          onChange={(value: string) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                dailySittingTime: value,
              },
            }))
          }
        />

        <SelectField
          label="Average Sleep Duration"
          value={
            assessment.lhq.sleepDuration
          }
          options={[
            "Less than 6 Hours",
            "6–8 Hours",
            "More than 8 Hours",
          ]}
          onChange={(value: string ) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                sleepDuration: value,
              },
            }))
          }
        />

        <SelectField
          label="Stress Level"
          value={assessment.lhq.stressLevel}
          options={[
            "Low",
            "Moderate",
            "High",
          ]}
          onChange={(value: string) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                stressLevel: value,
              },
            }))
          }
        />

        <SelectField
          label="Smoking Habit"
          value={
            assessment.lhq.smokingHabit
          }
          options={[
            "Never Smoked",
            "Former Smoker",
            "Occasionally",
            "Daily",
          ]}
          onChange={(value: string) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                smokingHabit: value,
              },
            }))
          }
        />

        <SelectField
          label="Alcohol Consumption"
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
          onChange={(value: string) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                alcoholConsumption:
                  value,
              },
            }))
          }
        />

        <SelectField
          label="Daily Water Intake"
          value={assessment.lhq.waterIntake}
          options={[
            "Less than 2 Litres",
            "2–3 Litres",
            "More than 3 Litres",
          ]}
          onChange={(value: string) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                waterIntake: value,
              },
            }))
          }
        />

        <SelectField
          label="Primary Goal"
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
          onChange={(value: string) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                primaryGoal: value,
              },
            }))
          }
        />

        <SelectField
          label="Preferred Training"
          value={
            assessment.lhq
              .preferredTraining
          }
          options={[
            "Gym",
            "Yoga",
            "Zumba",
          ]}
          onChange={(value: string  ) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                preferredTraining:
                  value,
              },
            }))
          }
        />

        <SelectField
          label="Dietary Preference"
          value={
            assessment.lhq
              .dietaryPreference
          }
          options={[
            "Vegetarian",
            "Eggetarian",
            "Non-Vegetarian",
            "Vegan",
            "Others",
          ]}
          onChange={(value: string) =>
            setAssessment((prev) => ({
              ...prev,
              lhq: {
                ...prev.lhq,
                dietaryPreference:
                  value,
              },
            }))
          }
        />

      </div>

      <div className="flex justify-between pt-4">

        <button
          onClick={() => setStep(1)}
          className="h-14 px-8 rounded-2xl border border-white/10"
        >
          Back
        </button>

        <button
          disabled={!isLhqComplete}
          onClick={() => setStep(3)}
          className="h-14 px-8 rounded-2xl bg-lime-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>

      </div>

    </div>
  </div>
)}

{step === 3 && (
  <div className="max-w-4xl mx-auto">

    <div className="text-center mb-8">
      <h1 className="text-2xl md:text-4xl font-black text-white">
      {isEdit
  ? "Update Consent"
  : "Declaration"}
      </h1>

      <p className="text-neutral-400 mt-3">
        Please review and accept the
        declaration before continuing.
      </p>
    </div>

    <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-4 md:p-8 backdrop-blur-xl">

      {/* Declaration */}

      <div className="rounded-3xl border border-white/10 bg-black/20 p-6">

        <h3 className="font-bold text-lg mb-5">
          Declaration
        </h3>

        <div className="space-y-5">

          <label className="flex items-start gap-3 cursor-pointer">

            <input
              type="checkbox"
              checked={
                assessment.consent
                  .declarationAccepted
              }
              onChange={(e) =>
                setAssessment((prev) => ({
                  ...prev,
                  consent: {
                    ...prev.consent,
                    declarationAccepted:
                      e.target.checked,
                  },
                }))
              }
              className="mt-1 h-5 w-5 accent-lime-400"
            />

            <span className="text-neutral-300 leading-relaxed">
              I declare that the
              information provided is true
              and accurate to the best of
              my knowledge.
            </span>

          </label>

          <label className="flex items-start gap-3 cursor-pointer">

            <input
              type="checkbox"
              checked={
                assessment.consent
                  .exerciseRiskAccepted
              }
              onChange={(e) =>
                setAssessment((prev) => ({
                  ...prev,
                  consent: {
                    ...prev.consent,
                    exerciseRiskAccepted:
                      e.target.checked,
                  },
                }))
              }
              className="mt-1 h-5 w-5 accent-lime-400"
            />

            <span className="text-neutral-300 leading-relaxed">
              I understand that exercise
              involves physical exertion
              and agree to inform Fuel Gym
              & Yoga of any changes in my
              health status.
            </span>

          </label>

        </div>

      </div>

      {/* Signature */}

      <div className="mt-8">

        <div className="flex items-center justify-between mb-4">

          <div>
            <h3 className="font-bold text-lg">
              Digital Signature
            </h3>

            <p className="text-sm text-neutral-400">
              Sign below to complete your
              onboarding.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              sigRef.current?.clear();

              setAssessment((prev) => ({
                ...prev,
                consent: {
                  ...prev.consent,
                  signature: "",
                },
              }));
            }}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Clear
          </button>

        </div>

        <div className="rounded-3xl overflow-hidden border border-white/10 bg-white">

          <SignatureCanvas
            ref={sigRef}
            penColor="#000"
            canvasProps={{
              className:
                "w-full h-64 md:h-72",
            }}
            onEnd={() => {
              const signature =
                sigRef.current
                  ?.getTrimmedCanvas()
                  .toDataURL("image/png");

              setAssessment((prev) => ({
                ...prev,
                consent: {
                  ...prev.consent,
                  signature:
                    signature || "",
                },
              }));
            }}
          />

        </div>

      </div>

      {/* Preview */}

      {assessment.consent.signature && (
        <div className="mt-6 rounded-2xl border border-black/20 bg-black/5 p-4">

          <p className="text-white text-sm font-medium">
            ✓ Signature Captured
          </p>

        </div>
      )}

      {/* Actions */}

      <div className="flex justify-between mt-8">

        <button
          onClick={() => setStep(2)}
          className="h-14 px-8 rounded-2xl border border-white/10 hover:bg-white/5 transition"
        >
          Back
        </button>

        <button
  disabled={
    !isConsentComplete || saving
  }
  onClick={handleFinalSubmit}
  className="
    h-14
    px-8
    rounded-2xl
    bg-lime-400
    text-black
    font-bold
    disabled:opacity-50
    disabled:cursor-not-allowed
  "
>
{saving
  ? isEdit
    ? "Updating..."
    : "Completing..."
  : isEdit
  ? "Update Form"
  : "Complete Setup"}
</button>

      </div>

    </div>

  </div>
)}

  </div>

</div>

    )
}

export default page;