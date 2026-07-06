"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { FitnessAssessment } from "@prisma/client";

interface AssessmentChartsProps {
  assessments: FitnessAssessment[];
}

export default function AssessmentCharts({ assessments }: AssessmentChartsProps) {
  // Prepare data for charts
  const chartData = assessments
    .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime())
    .map((assessment) => ({
      date: format(new Date(assessment.assessmentDate), "MMM dd"),
      fullDate: assessment.assessmentDate,
      weight: assessment.weight,
      bmi: assessment.bmi,
      bodyFat: assessment.bodyFatPercentage,
      chest: assessment.chest,
      waist: assessment.waist,
      hips: assessment.hips,
      biceps: assessment.biceps,
      neck: assessment.neck,
      calf: assessment.calf,
      thighs: assessment.thighs,
    }));

  if (chartData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No assessment data available for charts</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <h2 className="text-xl font-bold text-white">Progress Charts</h2>
      
      {/* Weight Trend Chart */}
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Weight Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              labelFormatter={(value, payload) => {
                if (payload && payload[0]) {
                  return format(new Date(payload[0].payload.fullDate), "MMM dd, yyyy");
                }
                return value;
              }}
              formatter={(value: any) => [`${value} kg`, "Weight"]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="#A3E635" 
              strokeWidth={3}
              dot={{ fill: "#A3E635", r: 4 }}
              activeDot={{ r: 6, fill: "#A3E635" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* BMI Trend Chart */}
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">BMI Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              labelFormatter={(value, payload) => {
                if (payload && payload[0]) {
                  return format(new Date(payload[0].payload.fullDate), "MMM dd, yyyy");
                }
                return value;
              }}
              formatter={(value: any) => [value, "BMI"]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="bmi" 
              stroke="#22C55E" 
              strokeWidth={3}
              dot={{ fill: "#22C55E", r: 4 }}
              activeDot={{ r: 6, fill: "#22C55E" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Body Fat Percentage Trend Chart */}
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Body Fat Percentage Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              labelFormatter={(value, payload) => {
                if (payload && payload[0]) {
                  return format(new Date(payload[0].payload.fullDate), "MMM dd, yyyy");
                }
                return value;
              }}
              formatter={(value: any) => [`${value}%`, "Body Fat"]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="bodyFat" 
              stroke="#F59E0B" 
              strokeWidth={3}
              dot={{ fill: "#F59E0B", r: 4 }}
              activeDot={{ r: 6, fill: "#F59E0B" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Body Measurements Chart */}
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Body Measurements Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              labelFormatter={(value, payload) => {
                if (payload && payload[0]) {
                  return format(new Date(payload[0].payload.fullDate), "MMM dd, yyyy");
                }
                return value;
              }}
              //@ts-ignore
              formatter={(value: any, name: string) => [`${value} cm`, name]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="chest" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              name="Chest"
              dot={{ fill: "#8B5CF6", r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="waist" 
              stroke="#EF4444" 
              strokeWidth={2}
              name="Waist"
              dot={{ fill: "#EF4444", r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="hips" 
              stroke="#06B6D4" 
              strokeWidth={2}
              name="Hips"
              dot={{ fill: "#06B6D4", r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="biceps" 
              stroke="#84CC16" 
              strokeWidth={2}
              name="Biceps"
              dot={{ fill: "#84CC16", r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="thighs" 
              stroke="#F97316" 
              strokeWidth={2}
              name="Thighs"
              dot={{ fill: "#F97316", r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="neck" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Neck"
              dot={{ fill: "#F97316", r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="calf" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Calf"
              dot={{ fill: "#F97316", r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}