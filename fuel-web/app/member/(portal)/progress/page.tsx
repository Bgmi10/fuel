"use client";

import { useMemo } from "react";


import { useEffect, useState } from "react";
import { TrendingUp, Activity, BarChart3, Scale, Target, Calendar } from "lucide-react";
import { useAuth } from "@/app/contexts/MemberAuthContext";
import { calculateDifference, formatDate } from "@/app/utils/helper";
import AssessmentCharts from "./AssessmentCharts";
import ComparisonCards from "./ComparisonCards";
import { AssessmentModal } from "./AssessmentModal";

export default function ProgressPage() {

const getTrend = (current?: number, previous?: number) => {
  if (current == null || previous == null) return null;
  
  const diff = current - previous;
  const absDiff = Math.abs(diff);
  
  // Don't show trend for very small differences
  if (absDiff < 0.1) return null;
  
  return {
    diff: diff.toFixed(1),
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
    color: diff === 0 ? "text-gray-400" : diff < 0 ? "text-green-400" : "text-red-400",
  };
};

  const { user: member, checkSession } = useAuth();
  const assessments = member?.fitnessAssessments || [];
  const [assesmentModal, setAssessmentModal] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "charts" | "comparison">("timeline");

  const sorted = useMemo(() => {
    return [...assessments].sort(
      (a, b) =>
        new Date(a.assessmentDate).getTime() -
        new Date(b.assessmentDate).getTime()
    );
  }, [assessments]);

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

 

  const diff = (a?: number, b?: number) =>
    a != null && b != null ? (b - a).toFixed(1) : "0.0";

  const weightChange = Number(diff(first?.weight ?? 0, latest?.weight ?? 0));
  const fatChange = Number(diff(first?.bodyFatPercentage ?? 0, latest?.bodyFatPercentage ?? 0));

  const isImproving = weightChange < 0 && fatChange < 0;

  // SIMPLE SPARKLINE (industry style)
  const Sparkline = ({ data }: any) => {
    const values = data.map((d: any) => d.weight).filter(Boolean);

    if (values.length < 2) return null;

    const max = Math.max(...values);
    const min = Math.min(...values);

    const points = values
      .map((v: number, i: number) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 40 - ((v - min) / (max - min || 1)) * 40;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg viewBox="0 0 100 40" className="w-full h-10">
        <polyline
          fill="none"
          stroke="#A3E63555"
          strokeWidth="3"
          points={points}
        />
        <polyline
          fill="none"
          stroke="#A3E635"
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  };



  const fetchAssessments = async () => {
    if (!member?.id) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/assessments?memberId=${member.id}`);
      const data = await res.json();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [member?.id]);

  // Prepare data for comparison
  const getComparisonData = () => {
    if (assessments.length < 2) return null;
    
    const [current, previous] = assessments.sort((a, b) => 
      new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime()
    );

    return {
      current,
      previous,
      comparison: {
        weight: calculateDifference(current.weight || 0, previous.weight || 0),
        bmi: calculateDifference(current.bmi || 0, previous.bmi || 0),
        bodyFat: calculateDifference(current.bodyFatPercentage || 0, previous.bodyFatPercentage || 0),
        chest: calculateDifference(current.chest || 0, previous.chest || 0),
        waist: calculateDifference(current.waist || 0, previous.waist || 0),
        hips: calculateDifference(current.hips || 0, previous.hips || 0),
        biceps: calculateDifference(current.biceps || 0, previous.biceps || 0),
        neck: calculateDifference(current.neck || 0, previous.neck || 0),
        calf: calculateDifference(current.calf || 0, previous.calf || 0),
        thighs: calculateDifference(current.thighs || 0, previous.thighs || 0),
      },
    };
  };

  const comparisonData = getComparisonData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-3 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const latestAssessment = assessments[0];

  return (
    <div className="space-y-6 text-white">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-gray-400 text-sm">
          Your fitness journey at a glance
        </p>
      </div>

      {/* KPI STRIP */}

      {latestAssessment && (
          <div className="flex gap-5">
            <div className="text-center p-3 bg-white/[0.03] backdrop-blur rounded-xl border border-white/10">
              <p className="text-xs text-gray-400">Weight</p>
              <p className="text-lg font-bold text-white">{latestAssessment.weight || "-"} kg</p>
            </div>
            <div className="text-center p-3 bg-white/[0.03] backdrop-blur rounded-xl border border-white/10">
              <p className="text-xs text-gray-400">BMI</p>
              <p className="text-lg font-bold text-white">{latestAssessment.bmi || "-"}</p>
            </div>
            <div className="text-center p-3 bg-white/[0.03] backdrop-blur rounded-xl border border-white/10">
              <p className="text-xs text-gray-400">Body Fat</p>
              <p className="text-lg font-bold text-white">{latestAssessment.bodyFatPercentage || "-"}%</p>
            </div>
          </div>
        )}


      {/* MINI TRENDS (SIDE BY SIDE) */}
      <div className="grid grid-cols-2 gap-4">

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3">
          <p className="text-xs text-gray-400 mb-2">Weight Trend</p>
          <Sparkline data={sorted} />
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3">
          <p className="text-xs text-gray-400 mb-2">Fat Trend</p>
          <Sparkline data={sorted.map(a => ({ weight: a.bodyFatPercentage }))} />
        </div>

      </div>

      {/* INSIGHT */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
        <p className="text-sm text-gray-400 mb-1">Coach Insight</p>
        <p className="text-sm text-gray-300">
          {isImproving
            ? "Great consistency. Weight and fat are trending in the right direction."
            : "Progress is uneven. Focus on consistency in diet and training."}
        </p>
      </div>

    <div className="space-y-6">

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "timeline"
              ? "text-lime-400 border-b-2 border-lime-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Activity size={16} className="inline mr-2" />
          Records
        </button>
        <button
          onClick={() => setActiveTab("charts")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "charts"
              ? "text-lime-400 border-b-2 border-lime-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <BarChart3 size={16} className="inline mr-2" />
          Charts
        </button>
        <button
          onClick={() => setActiveTab("comparison")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "comparison"
              ? "text-lime-400 border-b-2 border-lime-400"
              : "text-gray-400 hover:text-white"
          }`}
          disabled={!comparisonData}
        >
          <TrendingUp size={16} className="inline mr-2" />
          Comparison
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        <div className="justify-end flex">
          <button className="bg-lime-400 p-3 text-black text-bold mb-2 rounded-xl" onClick={() => {
            setAssessmentModal(true)
          }}>Log assessment</button>
        </div>
        {activeTab === "timeline" && (
          <div className="space-y-4">
            {assessments.length === 0 ? (
              <div className="text-center py-12 bg-white/[0.03] backdrop-blur rounded-2xl border border-white/10">
                <Scale className="mx-auto text-gray-600 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-white mb-2">No assessments yet</h3>
                <p className="text-gray-400">Your trainer will record your first assessment soon</p>
              </div>
            ) : (
              (() => {
                const sorted = [...assessments].sort(
                  (a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime()
                );

                return sorted.map((assessment: any, index) => {
                  const prev = sorted[index + 1];
                  const weightTrend = getTrend(assessment?.weight, (prev?.weight ?? 0));
                  const fatTrend = getTrend(assessment.bodyFatPercentage, (prev?.bodyFatPercentage ?? 0));
                  const bmiTrend = getTrend(assessment.bmi, (prev?.bmi ?? 0));

                  return (
                    <div key={assessment.id} className="bg-white/[0.03] backdrop-blur rounded-xl p-3 border border-white/10 hover:border-white/20 transition-colors">
                      {/* Header - Compact */}
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-white">Assessment #{sorted.length - index}</h3>
                            <p className="text-xs text-gray-400">
                              {formatDate(assessment.assessmentDate)}
                            </p>
                          </div>
                          {index === 0 && (
                            <span className="px-2 py-1 bg-lime-400/10 text-lime-400 text-xs rounded-full">Latest</span>
                          )}
                        </div>
                      </div>

                      {/* Inline Metrics */}
                      <div className="flex flex-wrap gap-4 text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Weight:</span>
                          <span className="font-semibold text-white">{assessment.weight ? `${assessment.weight}kg` : "-"}</span>
                          {weightTrend && (
                            <span className={`text-xs ${weightTrend.color}`}>
                              {weightTrend.direction === "down" ? "↓" : "↑"}{Math.abs(parseFloat(weightTrend.diff))}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Body Fat:</span>
                          <span className="font-semibold text-white">{assessment.bodyFatPercentage ? `${assessment.bodyFatPercentage}%` : "-"}</span>
                          {fatTrend && (
                            <span className={`text-xs ${fatTrend.color}`}>
                              {fatTrend.direction === "down" ? "↓" : "↑"}{Math.abs(parseFloat(fatTrend.diff))}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">BMI:</span>
                          <span className="font-semibold text-white">{assessment.bmi || "-"}</span>
                          {bmiTrend && (
                            <span className={`text-xs ${bmiTrend.color}`}>
                              {bmiTrend.direction === "down" ? "↓" : "↑"}{Math.abs(parseFloat(bmiTrend.diff))}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Body Measurements - Single Line */}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        <span>Chest: {assessment.chest || "-"}cm</span>
                        <span>Waist: {assessment.waist || "-"}cm</span>
                        <span>Hips: {assessment.hips || "-"}cm</span>
                        <span>Biceps: {assessment.biceps || "-"}cm</span>
                        <span>Thighs: {assessment.thighs || "-"}cm</span>
                        <span>Neck: {assessment.neck || "-"}cm</span>
                        <span>Calf: {assessment.calf || "-"}cm</span>
                      </div>

                      {/* Health Assessment */}
{(assessment.hba1c ||
  assessment.bloodPressure ||
  assessment.t3 ||
  assessment.t4 ||
  assessment.tsh) && (
  <div className="mt-3">
    <p className="text-xs text-gray-500 mb-2">
      Health Assessment
    </p>

    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
      <span>
        HbA1c:{" "}
        <span className="text-white">
          {assessment.hba1c ?? "-"}
        </span>
      </span>

      <span>
        BP:{" "}
        <span className="text-white">
          {assessment.bloodPressure ?? "-"}
        </span>
      </span>

      <span>
        T3:{" "}
        <span className="text-white">
          {assessment.t3 ?? "-"}
        </span>
      </span>

      <span>
        T4:{" "}
        <span className="text-white">
          {assessment.t4 ?? "-"}
        </span>
      </span>

      <span>
        TSH:{" "}
        <span className="text-white">
          {assessment.tsh ?? "-"}
        </span>
      </span>
    </div>
  </div>
)}


                      {/* Notes - Compact */}
                      {assessment.notes && (
                        <div className="mt-2 p-2 bg-blue-400/5 border-l-2 border-blue-400/30 rounded">
                          <p className="text-xs text-blue-400">Trainer Notes: {assessment.notes}</p>
                        </div>
                      )}
                      {assessment.memberNotes && (
                        <div className="mt-2 p-2 bg-blue-400/5 border-l-2 border-blue-400/30 rounded">
                          <p className="text-xs text-blue-400">Personal Notes: {assessment.memberNotes}</p>
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}

        {activeTab === "charts" && (
          <div className="bg-white/[0.03] backdrop-blur rounded-2xl border border-white/10">
            {assessments.length > 0 ? (
              <AssessmentCharts assessments={assessments as any} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                No assessment data available for charts
              </div>
            )}
          </div>
        )}

        {activeTab === "comparison" && comparisonData && (
          <div className="bg-white/[0.03] backdrop-blur rounded-2xl border border-white/10">
            <ComparisonCards {...comparisonData} />
          </div>
        )}

        {activeTab === "comparison" && !comparisonData && (
          <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 text-center py-8 text-gray-500">
            Need at least 2 assessments for comparison
          </div>
        )}
      </div>
    </div>

    {
     assesmentModal && <AssessmentModal memberId={member?.id ?? ''} onClose={() => {
      setAssessmentModal(false)
     }} onSuccess={() => {
      checkSession();
      setAssessmentModal(false);
     }} />
    }
    </div>
  );
}