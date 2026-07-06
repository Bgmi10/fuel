import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import ParqStep from "./ParqStep";
import ConsentStep from "./ConsentStep";
import LifestyleStep from "./LifestyleStep";
import tw from "twrnc";
import { Alert } from "react-native";
import { request } from "../../../src/api/client";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useRouter } from "expo-router";

export default function CompleteProfileScreen1() {
  const [step, setStep] = useState(1);

  const router = useRouter();

  const { user: member, refreshSession } = useAuth();

  const [assessment, setAssessment] = useState({
    parq: {
      heartCondition: null as boolean | null,
      chestPainExercise: null as boolean | null,
      chestPainRest: null as boolean | null,
      dizzinessOrFainting: null as boolean | null,
      boneJointCondition: null as boolean | null,
      bloodPressureMedication: null as boolean | null,
      otherMedicalCondition: null as boolean | null,
      confirmed: false,
    },

    lhq: {
      medicalConditions: [] as string[],
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
    },
  });


  useEffect(() => {
    if (member.onBoardCompleted) {
        router.replace('/dashboard')
    }
  }, [member]);

  const handleSignatureUpload = async (
    signature: string
  ) => {
    try {
  
      const data = await request({
        method: "POST",
        url: "/upload",
        data: {
          image: signature,
        },
      });
  
      if (!data.success) {
        Alert.alert("Upload failed");
        return;
      }
      return data.url;
    } catch (err) {
      console.log(err);
      Alert.alert("Something went wrong");
    } 
  };

  
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

  /**
   * --------------------------
   * PARQ HELPERS
   * --------------------------
   */

  const updateParq = (
    key: keyof typeof assessment.parq,
    value: boolean
  ) => {
    setAssessment((prev) => ({
      ...prev,
      parq: {
        ...prev.parq,
        [key]: value,
      },
    }));
  };

  const toggleParqConfirmation = () => {
    setAssessment((prev) => ({
      ...prev,
      parq: {
        ...prev.parq,
        confirmed: !prev.parq.confirmed,
      },
    }));
  };

  /**
   * --------------------------
   * LHQ HELPERS
   * --------------------------
   */

  const updateLhq = (
    key: keyof typeof assessment.lhq,
    value: any
  ) => {
    setAssessment((prev) => ({
      ...prev,
      lhq: {
        ...prev.lhq,
        [key]: value,
      },
    }));
  };

  /**
   * --------------------------
   * CONSENT HELPERS
   * --------------------------
   */

  const updateConsent = (
    key: keyof typeof assessment.consent,
    value: any
  ) => {
    setAssessment((prev) => ({
      ...prev,
      consent: {
        ...prev.consent,
        [key]: value,
      },
    }));
  };

  /**
   * --------------------------
   * VALIDATION
   * --------------------------
   */

  const isParqComplete = useMemo(() => {
    return (
      Object.entries(assessment.parq)
        .filter(([key]) => key !== "confirmed")
        .every(([, value]) => value !== null) &&
      assessment.parq.confirmed
    );
  }, [assessment.parq]);

  /**
   * --------------------------
   * NAVIGATION
   * --------------------------
   */

  const nextStep = () => {
    setStep((prev) => prev + 1);
  };

  const previousStep = () => {
    setStep((prev) => prev - 1);
  };

  /**
   * --------------------------
   * FINAL SUBMIT
   * --------------------------
   */
  const handleSubmit = async (signatureUrl: string) => {
    try {
      const payload = {
        onBoardCompleted: true,
        onBoardingForm: {
          ...assessment,
          consent: {
            ...assessment.consent,
            signature: signatureUrl,
          },
        },
      };
  
      const data = await request({
        method: "PUT",
        url: `/members/${member?.id}`,
        data: payload,
      });
      
      refreshSession()
      if (!data.success) {
        Alert.alert("Failed to complete onboarding");
        return;
      }
  
      // Navigate or update UI here
      router.replace("/dashboard"); // Expo Router
  
    } catch (err) {
      console.log(err);
      Alert.alert("Something went wrong");
    }
  };
  return (
    <SafeAreaView style={tw`flex-1 bg-slate-950`}>
      {step === 1 && (
        <ParqStep
          parqQuestions={parqQuestions}
          assessment={assessment}
          isParqComplete={isParqComplete}
          onContinue={nextStep}
          setAssessment={setAssessment}
        />
      )}
  
      {step === 2 && (
        <LifestyleStep
          assessment={assessment}
          setAssessment={setAssessment}
          onBack={previousStep}
          onContinue={nextStep}
        />
      )}
  
      {step === 3 && (
        <ConsentStep
          assessment={assessment}
          setAssessment={setAssessment}
          onBack={previousStep}
          onSubmit={handleSubmit}
          onSignatureCaptured={handleSignatureUpload}

        />
      )}
    </SafeAreaView>
  );
}