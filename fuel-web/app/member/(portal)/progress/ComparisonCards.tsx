"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ComparisonData {
  value: number;
  label: string;
  isPositive: boolean;
  isNegative: boolean;
}

interface ComparisonCardsProps {
  current: any;
  previous: any;
  comparison: {
    weight: ComparisonData | null;
    bmi: ComparisonData | null;
    bodyFat: ComparisonData | null;
    chest: ComparisonData | null;
    waist: ComparisonData | null;
    hips: ComparisonData | null;
    biceps: ComparisonData | null;
    thighs: ComparisonData | null;
    neck: ComparisonData | null;
    calf: ComparisonData | null;
  };
}

interface ComparisonCardProps {
  title: string;
  current: number | any;
  previous: number | any;
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
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="text-gray-400">
          <p>Current: {current ? `${current}${unit}` : "N/A"}</p>
          <p>No comparison data available</p>
        </div>
      </div>
    );
  }

  // Determine if the change is good or bad based on the metric type
  const isImprovement = isBetter === "lower" ? comparison.isNegative : comparison.isPositive;
  const changeColor = comparison.value === 0 ? "text-gray-400" : 
                     isImprovement ? "text-green-400" : "text-red-400";
  const bgColor = comparison.value === 0 ? "bg-white/5" : 
                 isImprovement ? "bg-green-400/5" : "bg-red-400/5";
  const borderColor = comparison.value === 0 ? "border-white/10" : 
                     isImprovement ? "border-green-400/20" : "border-red-400/20";

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
    <div className={`${bgColor} ${borderColor} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-2xl">{getEmoji()}</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-white">
            {current}{unit}
          </span>
          <span className="text-xs text-gray-400">Current</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-lg text-gray-300">
            {previous}{unit}
          </span>
          <span className="text-xs text-gray-400">Previous</span>
        </div>
        
        <div className={`flex items-center justify-between pt-3 border-t border-white/10`}>
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
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Progress Comparison</h2>
        <p className="text-gray-400">
          Latest vs Previous Assessment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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