"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Edit3, Activity, TrendingUp, BarChart3 } from "lucide-react";
import { AssessmentModal } from "./AssessmentModal";
import AssessmentCharts from "./AssessmentCharts";
import ComparisonCards from "./ComparisonCards";
import { FitnessAssessment, Member } from "@prisma/client";
import { calculateDifference } from "@/app/utils/helper";

type AssessmentWithMember = FitnessAssessment & {
  member: Pick<Member, "name" | "phone">;
};

type Assessment = FitnessAssessment & {
member: {
    name: string;
    phone: string;
  };
}
  

const getTrend = (current?: number, previous?: number) => {
  if (current == null || previous == null) return null;

  const diff = current - previous;

  const isPositiveBetter = false; 
  // for weight/body fat lower is better
  // for muscle metrics you can flip later if needed

  return {
    diff: diff.toFixed(1),
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
    color:
      diff === 0
        ? "text-neutral-400"
        : diff < 0
        ? "text-green-400"
        : "text-red-400",
  };
};

export default function AssessmentsPage() {
  const { id } = useParams();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "charts" | "comparison">("list");

  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState<Assessment | null>(null);

  const fetchData = async () => {
    try {   
      setLoading(true);

      const res = await fetch(`/api/assessments?memberId=${id}`);
      const data = await res.json();

      setAssessments(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleDelete = async (assessmentId: string) => {
    if (!confirm("Delete this assessment?")) return;

    await fetch(`/api/assessments/${assessmentId}`, {
      method: "DELETE",
    });

    fetchData();
  };

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
        neck: calculateDifference(current.neck || 0, previous.neck || 0),
        calf: calculateDifference(current.calf || 0, previous.calf || 0),
        waist: calculateDifference(current.waist || 0, previous.waist || 0),
        hips: calculateDifference(current.hips || 0, previous.hips || 0),
        biceps: calculateDifference(current.biceps || 0, previous.biceps || 0),
        thighs: calculateDifference(current.thighs || 0, previous.thighs || 0),
      },
    };
  };

  const comparisonData = getComparisonData();

  if (loading) {
    return <div className="p-10 text-neutral-500">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity size={20} /> Assessments
        </h1>

        <button
          onClick={() => {
            setSelected(null);
            setOpenModal(true);
          }}
          className="h-11 px-5 rounded-2xl bg-lime-400 text-black font-semibold flex items-center gap-2"
        >
          <Plus size={16} />
          Add Assessment
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "list"
              ? "text-lime-400 border-b-2 border-lime-400"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Activity size={16} className="inline mr-2" />
          List View
        </button>
        <button
          onClick={() => setActiveTab("charts")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "charts"
              ? "text-lime-400 border-b-2 border-lime-400"
              : "text-neutral-400 hover:text-white"
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
              : "text-neutral-400 hover:text-white"
          }`}
          disabled={!comparisonData}
        >
          <TrendingUp size={16} className="inline mr-2" />
          Comparison
        </button>
      </div>

      {/* CONTENT */}
      <div className="min-h-[400px]">
        {activeTab === "list" && (
          <div className="space-y-4">
            {(() => {
              const sorted = [...assessments].sort(
                (a, b) =>
                  new Date(b.assessmentDate).getTime() -
                  new Date(a.assessmentDate).getTime()
              );

              return sorted.map((a, index) => {
                const prev = sorted[index + 1];

                const weightTrend = getTrend(a.weight ?? 0, prev?.weight ?? 0);
                const fatTrend = getTrend(a.bodyFatPercentage ?? 0, prev?.bodyFatPercentage ?? 0);
                const bmiTrend = getTrend(a.bmi ?? 0, prev?.bmi ?? 0);

                return (
                  <div
                    key={a.id}
                    className="
                      bg-gradient-to-br from-neutral-900 to-neutral-950
                      border border-neutral-800
                      rounded-3xl
                      p-6
                      hover:scale-[1.01]
                      transition
                      shadow-lg
                    "
                  >
                    {/* HEADER */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-neutral-500">
                          {new Date(a.assessmentDate).toDateString()}
                        </p>

                        <h3 className="text-lg font-bold mt-1">
                          Progress Snapshot
                        </h3>
                      </div>

                      <div className="text-xs px-3 py-1 rounded-full bg-neutral-800">
                        #{sorted.length - index}
                      </div>
                    </div>

                    {/* MAIN METRICS */}
                    <div className="grid grid-cols-3 gap-4 mt-5">

                      {/* WEIGHT */}
                      <div className="bg-neutral-950 rounded-2xl p-3">
                        <p className="text-xs text-neutral-500">Weight</p>

                        <div className="flex items-center justify-between mt-1">
                          <p className="font-bold">{a.weight ?? "-"} kg</p>

                          {weightTrend && (
                            <span className={`text-xs flex items-center gap-1 ${weightTrend.color}`}>
                              {weightTrend.direction === "down" ? "↓" : "↑"}
                              {weightTrend.diff}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* BODY FAT */}
                      <div className="bg-neutral-950 rounded-2xl p-3">
                        <p className="text-xs text-neutral-500">Body Fat</p>

                        <div className="flex items-center justify-between mt-1">
                          <p className="font-bold">{a.bodyFatPercentage ?? "-"}%</p>

                          {fatTrend && (
                            <span className={`text-xs flex items-center gap-1 ${fatTrend.color}`}>
                              {fatTrend.direction === "down" ? "↓" : "↑"}
                              {fatTrend.diff}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* BMI */}
                      <div className="bg-neutral-950 rounded-2xl p-3">
                        <p className="text-xs text-neutral-500">BMI</p>

                        <div className="flex items-center justify-between mt-1">
                          <p className="font-bold">{a.bmi ?? "-"}</p>

                          {bmiTrend && (
                            <span className={`text-xs flex items-center gap-1 ${bmiTrend.color}`}>
                              {bmiTrend.direction === "down" ? "↓" : "↑"}
                              {bmiTrend.diff}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BODY MEASUREMENTS (compact) */}
                    <div className="mt-5 grid grid-cols-5 gap-2 text-xs text-neutral-400">
                      <span>Chest {a.chest ?? "-"}</span>
                      <span>Waist {a.waist ?? "-"}</span>
                      <span>Hips {a.hips ?? "-"}</span>
                      <span>Biceps {a.biceps ?? "-"}</span>
                      <span>Thighs {a.thighs ?? "-"}</span>

                      <span>Neck {a.neck ?? "-"}</span>
                      <span>Calf {a.calf ?? "-"}</span>
                    </div>

                    {/* HEALTH ASSESSMENT */}
{(a.hba1c || a.bloodPressure || a.t3 || a.t4 || a.tsh) && (
  <div className="mt-4">
    <p className="text-xs font-semibold text-neutral-500 mb-2">
      Health Assessment
    </p>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
      <div className="bg-neutral-950 rounded-xl p-2">
        <p className="text-neutral-500">HbA1c</p>
        <p className="text-white font-medium">{a.hba1c ?? "-"}</p>
      </div>

      <div className="bg-neutral-950 rounded-xl p-2">
        <p className="text-neutral-500">Blood Pressure</p>
        <p className="text-white font-medium">
          {a.bloodPressure ?? "-"}
        </p>
      </div>

      <div className="bg-neutral-950 rounded-xl p-2">
        <p className="text-neutral-500">T3</p>
        <p className="text-white font-medium">{a.t3 ?? "-"}</p>
      </div>

      <div className="bg-neutral-950 rounded-xl p-2">
        <p className="text-neutral-500">T4</p>
        <p className="text-white font-medium">{a.t4 ?? "-"}</p>
      </div>

      <div className="bg-neutral-950 rounded-xl p-2">
        <p className="text-neutral-500">TSH</p>
        <p className="text-white font-medium">{a.tsh ?? "-"}</p>
      </div>
    </div>
  </div>
)}

                    {/* NOTES */}
                    {a.notes && (
                      <div className="mt-4 text-xs text-blue-400 border-l border-blue-500 pl-3">
                        {a.notes}
                      </div>
                    )}

                    {/* ACTIONS */}
                    <div className="flex justify-end gap-2 mt-5">
                      <button
                        onClick={() => {
                          setSelected(a);
                          setOpenModal(true);
                        }}
                        className="h-9 px-3 rounded-xl border border-neutral-700"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(a.id)}
                        className="h-9 px-3 rounded-xl border border-red-500/40 text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {activeTab === "charts" && (
          <div className="bg-neutral-900 rounded-2xl p-6">
            {assessments.length > 0 ? (
              <AssessmentCharts assessments={assessments as AssessmentWithMember[]} />
            ) : (
              <div className="text-center py-8 text-neutral-500">
                No assessment data available for charts
              </div>
            )}
          </div>
        )}

        {activeTab === "comparison" && comparisonData && (
          <div className="bg-neutral-900 rounded-2xl p-6">
            <ComparisonCards {...comparisonData} />
          </div>
        )}

        {activeTab === "comparison" && !comparisonData && (
          <div className="bg-neutral-900 rounded-2xl p-6 text-center py-8 text-neutral-500">
            Need at least 2 assessments for comparison
          </div>
        )}
      </div>

      {/* MODAL */}
      {openModal && (
        <AssessmentModal
          memberId={id as string}
          assessment={selected}
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