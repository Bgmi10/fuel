"use client";

import { FitnessAssessment, Member } from "@prisma/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

type AssessmentWithMember = FitnessAssessment & {
  member: Pick<Member, "name" | "phone">;
};

interface AssessmentChartsProps {
  assessments: AssessmentWithMember[];
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
      thighs: assessment.thighs,
      neck: assessment.neck,
      calf: assessment.calf,
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
      <h2 className="text-2xl font-bold text-white">Assessment Progress Charts</h2>
      
      {/* Weight Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Weight Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
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
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* BMI Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">BMI Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
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
              stroke="#10B981" 
              strokeWidth={3}
              dot={{ r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Body Fat Percentage Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Body Fat Percentage Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
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
              dot={{ r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Body Measurements Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Body Measurements Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
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
            />
            <Line 
              type="monotone" 
              dataKey="waist" 
              stroke="#EF4444" 
              strokeWidth={2}
              name="Waist"
            />
            <Line 
              type="monotone" 
              dataKey="hips" 
              stroke="#06B6D4" 
              strokeWidth={2}
              name="Hips"
            />
            <Line 
              type="monotone" 
              dataKey="biceps" 
              stroke="#84CC16" 
              strokeWidth={2}
              name="Biceps"
            />
            <Line 
              type="monotone" 
              dataKey="thighs" 
              stroke="#F97316" 
              strokeWidth={2}
              name="Thighs"
            />
            <Line 
              type="monotone" 
              dataKey="neck" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Neck"
            />
            <Line 
              type="monotone" 
              dataKey="calf" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Calf"
              />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}