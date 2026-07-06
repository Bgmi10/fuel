"use client";

import { FitnessAssessment, Member } from "@prisma/client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type AssessmentWithMember = FitnessAssessment & {
  member: Pick<Member, "name" | "phone">;
};

interface ComparisonData {
  value: number;
  label: string;
  isPositive: boolean;
  isNegative: boolean;
}

interface ComparisonCardsProps {
  current: AssessmentWithMember;
  previous: AssessmentWithMember;
  comparison: {
    weight: ComparisonData | null;
    bmi: ComparisonData | null;
    bodyFat: ComparisonData | null;
    neck: ComparisonData | null;
    calf: ComparisonData | null;  
    chest: ComparisonData | null;
    waist: ComparisonData | null;
    hips: ComparisonData | null;
    biceps: ComparisonData | null;
    thighs: ComparisonData | null;
  };
}

interface ComparisonCardProps {
  title: string;
  current: number | null;
  previous: number | null;
  comparison: ComparisonData | null;
  unit: string;
  isBetter?: "higher" | "lower"; // For weight/body fat, lower is better; for muscles, higher is better
}

function ComparisonCard({ 
  title, 
  current, 
  previous, 
  comparison, 
  unit, 
  isBetter = "lower" 
}: ComparisonCardProps) {
  if (!current || !previous || !comparison) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="text-gray-500">
          <p>Current: {current ? `${current}${unit}` : "N/A"}</p>
          <p>No comparison data available</p>
        </div>
      </div>
    );
  }

  // Determine if the change is good or bad based on the metric type
  const isImprovement = isBetter === "lower" ? comparison.isNegative : comparison.isPositive;
  const changeColor = comparison.value === 0 ? "text-gray-600" : 
                     isImprovement ? "text-green-600" : "text-red-600";
  const bgColor = comparison.value === 0 ? "bg-gray-50" : 
                 isImprovement ? "bg-green-50" : "bg-red-50";

  const getIcon = () => {
    if (comparison.value === 0) return <Minus className="w-5 h-5" />;
    return comparison.isPositive ? 
      <TrendingUp className="w-5 h-5" /> : 
      <TrendingDown className="w-5 h-5" />;
  };

  const getChangeText = () => {
    if (comparison.value === 0) return "No change";
    const sign = comparison.isPositive ? "+" : "";
    return `${sign}${comparison.value}${unit}`;
  };

  const getEmoji = () => {
    if (comparison.value === 0) return "🔄";
    return isImprovement ? "🔥" : "⚠️";
  };

  return (
    <div className={`${bgColor} rounded-lg shadow-lg p-6 border-l-4 ${
      comparison.value === 0 ? "border-gray-400" : 
      isImprovement ? "border-green-500" : "border-red-500"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <span className="text-2xl">{getEmoji()}</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-800">
            {current}{unit}
          </span>
          <span className="text-sm text-gray-500">Current</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-lg text-gray-600">
            {previous}{unit}
          </span>
          <span className="text-sm text-gray-500">Previous</span>
        </div>
        
        <div className={`flex items-center justify-between pt-2 border-t ${
          comparison.value === 0 ? "border-gray-200" : 
          isImprovement ? "border-green-200" : "border-red-200"
        }`}>
          <div className={`flex items-center space-x-2 ${changeColor}`}>
            {getIcon()}
            <span className="font-semibold">{getChangeText()}</span>
          </div>
          <span className={`text-sm capitalize ${changeColor}`}>
            {comparison.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonCards({ current, previous, comparison }: ComparisonCardsProps) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Progress Comparison</h2>
        <p className="text-white">
          Comparing latest assessment with previous one for {current.member.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ComparisonCard
          title="Weight"
          current={current.weight}
          previous={previous.weight}
          comparison={comparison.weight}
          unit="kg"
          isBetter="lower"
        />

        <ComparisonCard
          title="BMI"
          current={current.bmi}
          previous={previous.bmi}
          comparison={comparison.bmi}
          unit=""
          isBetter="lower"
        />

        <ComparisonCard
          title="Body Fat"
          current={current.bodyFatPercentage}
          previous={previous.bodyFatPercentage}
          comparison={comparison.bodyFat}
          unit="%"
          isBetter="lower"
        />

        <ComparisonCard
          title="Chest"
          current={current.chest}
          previous={previous.chest}
          comparison={comparison.chest}
          unit="cm"
          isBetter="higher"
        />

        <ComparisonCard
          title="Waist"
          current={current.waist}
          previous={previous.waist}
          comparison={comparison.waist}
          unit="cm"
          isBetter="lower"
        />

        <ComparisonCard
          title="Hips"
          current={current.hips}
          previous={previous.hips}
          comparison={comparison.hips}
          unit="cm"
          isBetter="lower"
        />

        <ComparisonCard
          title="Biceps"
          current={current.biceps}
          previous={previous.biceps}
          comparison={comparison.biceps}
          unit="cm"
          isBetter="higher"
        />

        <ComparisonCard
          title="Thighs"
          current={current.thighs}
          previous={previous.thighs}
          comparison={comparison.thighs}
          unit="cm"
          isBetter="higher"
        />

        <ComparisonCard
          title="Neck"
          current={current.neck}
          previous={previous.neck}
          comparison={comparison.neck}
          unit="cm"
        />

        <ComparisonCard
          title="Calf"
          current={current.calf}
          previous={previous.calf}
          comparison={comparison.calf}
          unit="cm"
        />
      </div>
    </div>
  );
}