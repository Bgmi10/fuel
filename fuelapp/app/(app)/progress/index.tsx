import { useMemo, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import tw from "twrnc";
import Svg, { Polyline } from "react-native-svg";

import {
  TrendingUp,
  Activity,
  BarChart3,
  Scale,
} from "lucide-react-native";

import { useAuth } from "../../../src/contexts/AuthContext";
import { request } from "../../../src/api/client";

import { SafeAreaView } from "react-native-safe-area-context";
import { calculateDifference, formatDate } from "../../../src/utils/helper";
import AssessmentCharts from "./AssessmentCharts";
import ComparisonCards from "./ComparisonCards";
import { AssessmentModal } from "./AssessmentModal";

export default function ProgressScreen() {


    const getTrend = (
        current?: number,
        previous?: number
      ) => {
        if (current == null || previous == null) return null;
    
        const diff = current - previous;
        const absDiff = Math.abs(diff);
    
        if (absDiff < 0.1) return null;
    
        return {
          diff: diff.toFixed(1),
          direction:
            diff > 0
              ? "up"
              : diff < 0
              ? "down"
              : "flat",
          color:
            diff === 0
              ? "#9CA3AF"
              : diff < 0
              ? "#4ADE80"
              : "#F87171",
        };
      };


      const { user, refreshSession } = useAuth();

      const assessments =
        user?.fitnessAssessments || [];
    
      const [assessmentModal, setAssessmentModal] =
        useState(false);
    
    
      const [activeTab, setActiveTab] =
        useState<
          "timeline" | "charts" | "comparison"
        >("timeline");


        const sorted = useMemo(() => {
            return [...assessments].sort(
              (a: any, b: any) =>
                new Date(
                  a.assessmentDate
                ).getTime() -
                new Date(
                  b.assessmentDate
                ).getTime()
            );
          }, [assessments]);
        
          const first = sorted[0];
        
          const latest =
            sorted[sorted.length - 1];



            const diff = (
                a?: number,
                b?: number
              ) =>
                a != null && b != null
                  ? (b - a).toFixed(1)
                  : "0.0";
            
              const weightChange = Number(
                diff(
                  first?.weight ?? 0,
                  latest?.weight ?? 0
                )
              );
            
              const fatChange = Number(
                diff(
                  first?.bodyFatPercentage ?? 0,
                  latest?.bodyFatPercentage ?? 0
                )
              );
            
              const isImproving =
                weightChange < 0 &&
                fatChange < 0;



                  // SIMPLE SPARKLINE (industry style)
  const Sparkline = ({ data }: any) => {
    const values = data
      .map((d: any) => d.weight)
      .filter(
        (v: number | undefined) =>
          v != null
      );

    if (values.length < 2) return null;

    const max = Math.max(...values);
    const min = Math.min(...values);

    const points = values
      .map(
        (
          value: number,
          index: number
        ) => {
          const x =
            (index /
              (values.length - 1)) *
            100;

          const y =
            40 -
            ((value - min) /
              (max - min || 1)) *
              40;

          return `${x},${y}`;
        }
      )
      .join(" ");

    return (
      <View style={tw`h-10`}>
        <Svg
          width="100%"
          height="40"
          viewBox="0 0 100 40"
        >
          <Polyline
            points={points}
            fill="none"
            stroke="#A3E63555"
            strokeWidth={3}
          />

          <Polyline
            points={points}
            fill="none"
            stroke="#A3E635"
            strokeWidth={2}
          />
        </Svg>
      </View>
    );
  };


    // Prepare data for comparison
    const getComparisonData = () => {
        if (assessments.length < 2) return null;
    
        const [current, previous] = [...assessments].sort(
          (a: any, b: any) =>
            new Date(b.assessmentDate).getTime() -
            new Date(a.assessmentDate).getTime()
        );
    
        return {
          current,
          previous,
          comparison: {
            weight: calculateDifference(
              current.weight || 0,
              previous.weight || 0
            ),
    
            bmi: calculateDifference(
              current.bmi || 0,
              previous.bmi || 0
            ),
    
            bodyFat: calculateDifference(
              current.bodyFatPercentage || 0,
              previous.bodyFatPercentage || 0
            ),
    
            chest: calculateDifference(
              current.chest || 0,
              previous.chest || 0
            ),
    
            waist: calculateDifference(
              current.waist || 0,
              previous.waist || 0
            ),
    
            hips: calculateDifference(
              current.hips || 0,
              previous.hips || 0
            ),
    
            biceps: calculateDifference(
              current.biceps || 0,
              previous.biceps || 0
            ),
    
            neck: calculateDifference(
              current.neck || 0,
              previous.neck || 0
            ),
    
            calf: calculateDifference(
              current.calf || 0,
              previous.calf || 0
            ),
    
            thighs: calculateDifference(
              current.thighs || 0,
              previous.thighs || 0
            ),
          },
        };
      };
    
      const comparisonData =
        getComparisonData();

        if (!user.fitnessAssessments) {
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
        
          const latestAssessment =
            assessments[0];


            return (
                <SafeAreaView style={tw`flex-1 bg-slate-950`}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={tw`px-5`}
                  >
                    {/* HEADER */}
            
                    <View style={tw`mb-8`}>
                      <Text style={tw`text-white text-3xl font-bold`}>
                        Progress
                      </Text>
            
                      <Text
                        style={tw`text-neutral-500 mt-2 leading-6`}
                      >
                        Your fitness journey at a glance
                      </Text>
                    </View>
            
                    {/* KPI STRIP */}
            
                    {latestAssessment && (
                      <View style={tw`flex-row justify-between mb-6`}>
                        <View
                          style={tw`flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mr-2 items-center`}
                        >
                          <Text
                            style={tw`text-neutral-500 text-xs`}
                          >
                            Weight
                          </Text>
            
                          <Text
                            style={tw`text-white text-xl font-bold mt-2`}
                          >
                            {latestAssessment.weight || "-"} kg
                          </Text>
                        </View>
            
                        <View
                          style={tw`flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mr-2 items-center`}
                        >
                          <Text
                            style={tw`text-neutral-500 text-xs`}
                          >
                            BMI
                          </Text>
            
                          <Text
                            style={tw`text-white text-xl font-bold mt-2`}
                          >
                            {latestAssessment.bmi || "-"}
                          </Text>
                        </View>
            
                        <View
                          style={tw`flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 items-center`}
                        >
                          <Text
                            style={tw`text-neutral-500 text-xs`}
                          >
                            Body Fat
                          </Text>
            
                          <Text
                            style={tw`text-white text-xl font-bold mt-2`}
                          >
                            {latestAssessment.bodyFatPercentage || "-"}%
                          </Text>
                        </View>
                      </View>
                    )}
            
                    {/* MINI TRENDS */}
            
                    <View style={tw`flex-row mb-6`}>
                      <View
                        style={tw`flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mr-2`}
                      >
                        <Text
                          style={tw`text-neutral-500 text-xs mb-3`}
                        >
                          Weight Trend
                        </Text>
            
                        <Sparkline data={sorted} />
                      </View>
            
                      <View
                        style={tw`flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4`}
                      >
                        <Text
                          style={tw`text-neutral-500 text-xs mb-3`}
                        >
                          Fat Trend
                        </Text>
            
                        <Sparkline
                          data={sorted.map((a: any) => ({
                            weight:
                              a.bodyFatPercentage,
                          }))}
                        />
                      </View>
                    </View>
            
                    {/* INSIGHT */}
            
                    <View
                      style={tw`bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6`}
                    >
                      <Text
                        style={tw`text-neutral-500 text-sm mb-2`}
                      >
                        Coach Insight
                      </Text>
            
                      <Text
                        style={tw`text-neutral-300 leading-6`}
                      >
                        {isImproving
                          ? "Great consistency. Weight and fat are trending in the right direction."
                          : "Progress is uneven. Focus on consistency in diet and training."}
                      </Text>
                    </View>


                    <View style={tw`mb-6`}>
          {/* Tabs */}

          <View
            style={tw`flex-row border-b border-neutral-800`}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                setActiveTab("timeline")
              }
              style={tw`px-4 py-3 border-b-2 ${
                activeTab === "timeline"
                  ? "border-lime-400"
                  : "border-transparent"
              }`}
            >
              <View style={tw`flex-row items-center`}>
                <Activity
                  size={16}
                  color={
                    activeTab === "timeline"
                      ? "#A3E635"
                      : "#9CA3AF"
                  }
                />

                <Text
                  style={tw`ml-2 font-medium ${
                    activeTab === "timeline"
                      ? "text-lime-400"
                      : "text-neutral-400"
                  }`}
                >
                  Records
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                setActiveTab("charts")
              }
              style={tw`px-4 py-3 border-b-2 ${
                activeTab === "charts"
                  ? "border-lime-400"
                  : "border-transparent"
              }`}
            >
              <View style={tw`flex-row items-center`}>
                <BarChart3
                  size={16}
                  color={
                    activeTab === "charts"
                      ? "#A3E635"
                      : "#9CA3AF"
                  }
                />

                <Text
                  style={tw`ml-2 font-medium ${
                    activeTab === "charts"
                      ? "text-lime-400"
                      : "text-neutral-400"
                  }`}
                >
                  Charts
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!comparisonData}
              onPress={() =>
                setActiveTab("comparison")
              }
              style={tw`px-4 py-3 border-b-2 ${
                activeTab === "comparison"
                  ? "border-lime-400"
                  : "border-transparent"
              }`}
            >
              <View style={tw`flex-row items-center`}>
                <TrendingUp
                  size={16}
                  color={
                    comparisonData
                      ? activeTab ===
                        "comparison"
                        ? "#A3E635"
                        : "#9CA3AF"
                      : "#525252"
                  }
                />

                <Text
                  style={tw`ml-2 font-medium ${
                    activeTab ===
                    "comparison"
                      ? "text-lime-400"
                      : comparisonData
                      ? "text-neutral-400"
                      : "text-neutral-600"
                  }`}
                >
                  Comparison
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Content */}

          <View style={tw`mt-5`}>
            <View
              style={tw`items-end mb-4`}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  setAssessmentModal(true)
                }
                style={tw`bg-lime-400 rounded-2xl px-5 py-3`}
              >
                <Text
                  style={tw`text-black font-bold`}
                >
                  Log Assessment
                </Text>
              </TouchableOpacity>
            </View>


            {activeTab === "timeline" && (
              <View>

                {assessments.length === 0 ? (

                  <View
                    style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-8 items-center`}
                  >
                    <Scale
                      size={48}
                      color="#525252"
                    />

                    <Text
                      style={tw`text-white text-xl font-bold mt-5`}
                    >
                      No assessments yet
                    </Text>

                    <Text
                      style={tw`text-neutral-500 text-center mt-3 leading-6`}
                    >
                      Your trainer will
                      record your first
                      assessment soon
                    </Text>
                  </View>

                ) : (
                  (() => {
                    const sorted = [
                      ...assessments,
                    ].sort(
                      (a: any, b: any) =>
                        new Date(
                          b.assessmentDate
                        ).getTime() -
                        new Date(
                          a.assessmentDate
                        ).getTime()
                    );

                    return sorted.map(
                      (
                        assessment: any,
                        index: number
                      ) => {
                        const prev =
                          sorted[index + 1];

                        const weightTrend =
                          getTrend(
                            assessment?.weight,
                            prev?.weight ?? 0
                          );

                        const fatTrend =
                          getTrend(
                            assessment.bodyFatPercentage,
                            prev?.bodyFatPercentage ??
                              0
                          );

                        const bmiTrend =
                          getTrend(
                            assessment.bmi,
                            prev?.bmi ?? 0
                          );


                          return (
                            <View
                              key={assessment.id}
                              style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-5`}
                            >
                              {/* Header */}
  
                              <View
                                style={tw`flex-row justify-between items-center mb-4`}
                              >
                                <View>
                                  <Text
                                    style={tw`text-white text-lg font-bold`}
                                  >
                                    Assessment #
                                    {sorted.length - index}
                                  </Text>
  
                                  <Text
                                    style={tw`text-neutral-500 mt-1`}
                                  >
                                    {formatDate(
                                      assessment.assessmentDate
                                    )}
                                  </Text>
                                </View>
  
                                {index === 0 && (
                                  <View
                                    style={tw`bg-lime-400/10 border border-lime-400/20 rounded-full px-3 py-1`}
                                  >
                                    <Text
                                      style={tw`text-lime-400 text-xs font-bold`}
                                    >
                                      Latest
                                    </Text>
                                  </View>
                                )}
                              </View>
  
                              {/* Metrics */}
  
                              <View
                                style={tw`flex-row flex-wrap mb-4`}
                              >
                                <View
                                  style={tw`mr-6 mb-3`}
                                >
                                  <Text
                                    style={tw`text-neutral-500 text-xs`}
                                  >
                                    Weight
                                  </Text>
  
                                  <View
                                    style={tw`flex-row items-center mt-1`}
                                  >
                                    <Text
                                      style={tw`text-white font-bold text-base`}
                                    >
                                      {assessment.weight
                                        ? `${assessment.weight} kg`
                                        : "-"}
                                    </Text>
  
                                    {weightTrend && (
                                      <Text
                                        style={[
                                          tw`ml-2 text-xs font-bold`,
                                          {
                                            color:
                                              weightTrend.color,
                                          },
                                        ]}
                                      >
                                        {weightTrend.direction ===
                                        "down"
                                          ? "↓"
                                          : "↑"}
                                        {Math.abs(
                                          parseFloat(
                                            weightTrend.diff
                                          )
                                        )}
                                      </Text>
                                    )}
                                  </View>
                                </View>
  
                                <View
                                  style={tw`mr-6 mb-3`}
                                >
                                  <Text
                                    style={tw`text-neutral-500 text-xs`}
                                  >
                                    Body Fat
                                  </Text>
  
                                  <View
                                    style={tw`flex-row items-center mt-1`}
                                  >
                                    <Text
                                      style={tw`text-white font-bold text-base`}
                                    >
                                      {assessment.bodyFatPercentage
                                        ? `${assessment.bodyFatPercentage}%`
                                        : "-"}
                                    </Text>
  
                                    {fatTrend && (
                                      <Text
                                        style={[
                                          tw`ml-2 text-xs font-bold`,
                                          {
                                            color:
                                              fatTrend.color,
                                          },
                                        ]}
                                      >
                                        {fatTrend.direction ===
                                        "down"
                                          ? "↓"
                                          : "↑"}
                                        {Math.abs(
                                          parseFloat(
                                            fatTrend.diff
                                          )
                                        )}
                                      </Text>
                                    )}
                                  </View>
                                </View>
  
                                <View
                                  style={tw`mb-3`}
                                >
                                  <Text
                                    style={tw`text-neutral-500 text-xs`}
                                  >
                                    BMI
                                  </Text>
  
                                  <View
                                    style={tw`flex-row items-center mt-1`}
                                  >
                                    <Text
                                      style={tw`text-white font-bold text-base`}
                                    >
                                      {assessment.bmi ??
                                        "-"}
                                    </Text>
  
                                    {bmiTrend && (
                                      <Text
                                        style={[
                                          tw`ml-2 text-xs font-bold`,
                                          {
                                            color:
                                              bmiTrend.color,
                                          },
                                        ]}
                                      >
                                        {bmiTrend.direction ===
                                        "down"
                                          ? "↓"
                                          : "↑"}
                                        {Math.abs(
                                          parseFloat(
                                            bmiTrend.diff
                                          )
                                        )}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </View>
  
                              {/* Measurements */}
  
                              <View
                                style={tw`flex-row flex-wrap mb-3`}
                              >
                                <Text
                                  style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                >
                                  Chest:{" "}
                                  {assessment.chest ??
                                    "-"}
                                  cm
                                </Text>
  
                                <Text
                                  style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                >
                                  Waist:{" "}
                                  {assessment.waist ??
                                    "-"}
                                  cm
                                </Text>
  
                                <Text
                                  style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                >
                                  Hips:{" "}
                                  {assessment.hips ??
                                    "-"}
                                  cm
                                </Text>
  
                                <Text
                                  style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                >
                                  Biceps:{" "}
                                  {assessment.biceps ??
                                    "-"}
                                  cm
                                </Text>
  
                                <Text
                                  style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                >
                                  Thighs:{" "}
                                  {assessment.thighs ??
                                    "-"}
                                  cm
                                </Text>
  
                                <Text
                                  style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                >
                                  Neck:{" "}
                                  {assessment.neck ??
                                    "-"}
                                  cm
                                </Text>
  
                                <Text
                                  style={tw`text-neutral-400 text-xs mb-2`}
                                >
                                  Calf:{" "}
                                  {assessment.calf ??
                                    "-"}
                                  cm
                                </Text>
                              </View>


                                                          {/* Health Assessment */}

                            {(assessment.hba1c ||
                              assessment.bloodPressure ||
                              assessment.t3 ||
                              assessment.t4 ||
                              assessment.tsh) && (
                              <View style={tw`mt-2 mb-3`}>
                                <Text
                                  style={tw`text-neutral-500 text-xs mb-3`}
                                >
                                  Health Assessment
                                </Text>

                                <View
                                  style={tw`flex-row flex-wrap`}
                                >
                                  <Text
                                    style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                  >
                                    HbA1c:{" "}
                                    <Text
                                      style={tw`text-white`}
                                    >
                                      {assessment.hba1c ??
                                        "-"}
                                    </Text>
                                  </Text>

                                  <Text
                                    style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                  >
                                    BP:{" "}
                                    <Text
                                      style={tw`text-white`}
                                    >
                                      {assessment.bloodPressure ??
                                        "-"}
                                    </Text>
                                  </Text>

                                  <Text
                                    style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                  >
                                    T3:{" "}
                                    <Text
                                      style={tw`text-white`}
                                    >
                                      {assessment.t3 ??
                                        "-"}
                                    </Text>
                                  </Text>

                                  <Text
                                    style={tw`text-neutral-400 text-xs mr-4 mb-2`}
                                  >
                                    T4:{" "}
                                    <Text
                                      style={tw`text-white`}
                                    >
                                      {assessment.t4 ??
                                        "-"}
                                    </Text>
                                  </Text>

                                  <Text
                                    style={tw`text-neutral-400 text-xs mb-2`}
                                  >
                                    TSH:{" "}
                                    <Text
                                      style={tw`text-white`}
                                    >
                                      {assessment.tsh ??
                                        "-"}
                                    </Text>
                                  </Text>
                                </View>
                              </View>
                            )}

                            {/* Trainer Notes */}

                            {!!assessment.notes && (
                              <View
                                style={tw`mt-2 rounded-2xl bg-blue-500/10 border-l-4 border-blue-400 p-4`}
                              >
                                <Text
                                  style={tw`text-blue-400 text-xs font-bold mb-2`}
                                >
                                  TRAINER NOTES
                                </Text>

                                <Text
                                  style={tw`text-neutral-300 leading-6`}
                                >
                                  {assessment.notes}
                                </Text>
                              </View>
                            )}

                            {/* Personal Notes */}

                            {!!assessment.memberNotes && (
                              <View
                                style={tw`mt-3 rounded-2xl bg-blue-500/10 border-l-4 border-blue-400 p-4`}
                              >
                                <Text
                                  style={tw`text-blue-400 text-xs font-bold mb-2`}
                                >
                                  PERSONAL NOTES
                                </Text>

                                <Text
                                  style={tw`text-neutral-300 leading-6`}
                                >
                                  {assessment.memberNotes}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      }
                    );
                  })()
                )}
              </View>
            )}


{activeTab === "charts" && (
              <View
                style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-8 items-center`}
              >
                <BarChart3
                  size={48}
                  color="#525252"
                />

                <Text
                  style={tw`text-white text-lg font-bold mt-5`}
                >
                  Charts
                </Text>

                <Text
                  style={tw`text-neutral-500 text-center mt-3`}
                >
                  <AssessmentCharts assessments={assessments} />
                </Text>
              </View>
            )}
{activeTab === "comparison" &&
  comparisonData && (
    <View
      style={tw`bg-neutral-900 rounded-3xl border border-neutral-800`}
    >
      <ComparisonCards
        current={comparisonData.current}
        previous={comparisonData.previous}
        comparison={comparisonData.comparison}
      />
    </View>
  )}

{activeTab === "comparison" &&
  !comparisonData && (
    <View
      style={tw`bg-neutral-900 rounded-3xl border border-neutral-800 p-8 items-center`}
    >
      <TrendingUp
        size={48}
        color="#525252"
      />

      <Text
        style={tw`text-white text-lg font-bold mt-5`}
      >
        Comparison
      </Text>

      <Text
        style={tw`text-neutral-500 text-center mt-3`}
      >
        Need at least 2 assessments for comparison
      </Text>
    </View>
  )}


</View>
        </View>

        {/* Assessment Modal */}

        {assessmentModal && (
  <AssessmentModal
    memberId={user?.id ?? ""}
    onClose={() => {
      setAssessmentModal(false);
    }}
    onSuccess={() => {
      refreshSession();
      setAssessmentModal(false);
    }}
  />
)}

      </ScrollView>
    </SafeAreaView>
  );
}