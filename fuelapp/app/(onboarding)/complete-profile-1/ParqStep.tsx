import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import tw from "twrnc";


type Props = {
  assessment: any;
  setAssessment: any;
  parqQuestions: any[];
  isParqComplete: boolean;
  onContinue: () => void;
};

export default function ParqStep({
  assessment,
  setAssessment,
  parqQuestions,
  isParqComplete,
  onContinue,
}: Props) {

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
            <Text style={tw`text-lime-400 font-semibold`}>
              STEP 1 OF 3
            </Text>
          </View>

          <Text
            style={tw`text-white text-3xl font-bold text-center`}
          >
            Physical Activity
          </Text>

          <Text
            style={tw`text-lime-400 text-3xl font-bold mt-1 text-center`}
          >
            Readiness Questionnaire
          </Text>

          <Text
            style={tw`text-neutral-500 text-center mt-5 leading-6`}
          >
            Please answer every question honestly
            before continuing.
          </Text>
        </View>

        {/* CARD */}

        <View
          style={tw`bg-neutral-950 border border-neutral-900 rounded-3xl p-5`}
        >
          {parqQuestions.map((question) => {
            const value =
              assessment.parq[
                question.key as keyof typeof assessment.parq
              ];

            return (
              <View
                key={question.key}
                style={tw`bg-neutral-900 rounded-3xl border border-neutral-800 p-5 mb-5`}
              >
                <Text
                  style={tw`text-white text-base leading-6 font-medium`}
                >
                  {question.label}
                </Text>

                <View
                  style={tw`flex-row mt-5`}
                >
                  {/* YES */}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                      setAssessment((prev: any) => ({
                        ...prev,
                        parq: {
                          ...prev.parq,
                          [question.key]: true,
                        },
                      }))
                    }
                    style={[
                      tw`flex-1 h-13 rounded-2xl justify-center items-center mr-2 border`,
                      value === true
                        ? tw`bg-red-500 border-red-500`
                        : tw`bg-neutral-950 border-neutral-800`,
                    ]}
                  >
                    <Text
                      style={tw`text-white font-bold text-base`}
                    >
                      YES
                    </Text>
                  </TouchableOpacity>

                  {/* NO */}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                      setAssessment((prev: any) => ({
                        ...prev,
                        parq: {
                          ...prev.parq,
                          [question.key]: false,
                        },
                      }))
                    }
                    style={[
                      tw`flex-1 h-13 rounded-2xl justify-center items-center ml-2 border`,
                      value === false
                        ? tw`bg-lime-400 border-lime-400`
                        : tw`bg-neutral-950 border-neutral-800`,
                    ]}
                  >
                    <Text
                      style={[
                        tw`font-bold text-base`,
                        {
                          color:
                            value === false
                              ? "#000"
                              : "#fff",
                        },
                      ]}
                    >
                      NO
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Confirmation */}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              setAssessment((prev: any) => ({
                ...prev,
                parq: {
                  ...prev.parq,
                  confirmed:
                    !prev.parq.confirmed,
                },
              }))
            }
            style={tw`bg-lime-400/10 border border-lime-400/20 rounded-3xl p-5 flex-row`}
          >
            <View
              style={[
                tw`w-6 h-6 rounded-md border mr-4 justify-center items-center`,
                assessment.parq.confirmed
                  ? tw`bg-lime-400 border-lime-400`
                  : tw`border-neutral-600`,
              ]}
            >
              {assessment.parq.confirmed && (
                <Text
                  style={tw`text-black font-bold`}
                >
                  ✓
                </Text>
              )}
            </View>

            <Text
              style={tw`text-neutral-300 flex-1 leading-6`}
            >
              I confirm that the information
              provided above is accurate and
              complete.
            </Text>
          </TouchableOpacity>

          {!isParqComplete && (
            <View
              style={tw`bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mt-5`}
            >
              <Text
                style={tw`text-red-400 text-center`}
              >
                Please answer every question.
              </Text>
            </View>
          )}

          {/* CONTINUE */}

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={
              !isParqComplete ||
              !assessment.parq.confirmed
            }
            onPress={onContinue}
            style={[
              tw`h-14 rounded-2xl justify-center items-center mt-8`,
              isParqComplete &&
              assessment.parq.confirmed
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
      </ScrollView>
  );
}