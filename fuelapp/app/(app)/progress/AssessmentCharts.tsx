import { View, Text, ScrollView } from "react-native";
import tw from "twrnc";
import { LineChart } from "react-native-gifted-charts";
import { format } from "date-fns";

interface AssessmentChartsProps {
  assessments: any[];
}

export default function AssessmentCharts({
  assessments,
}: AssessmentChartsProps) {

  const chartData = [...assessments]
  .sort(
    (a, b) =>
      new Date(
        a.assessmentDate
      ).getTime() -
      new Date(
        b.assessmentDate
      ).getTime()
  )
  .map((assessment) => ({
    date: format(
      new Date(
        assessment.assessmentDate
      ),
      "MMM dd"
    ),

    fullDate:
      assessment.assessmentDate,

    weight: assessment.weight,

    bmi: assessment.bmi,

    bodyFat:
      assessment.bodyFatPercentage,

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
      <View
        style={tw`p-8 items-center justify-center`}
      >
        <Text
          style={tw`text-neutral-500`}
        >
          No assessment data available
          for charts
        </Text>
      </View>
    );
  }


  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tw`p-5 pb-10`}
    >
      <Text
        style={tw`text-white text-2xl font-bold mb-6`}
      >
        Progress Charts
      </Text>


            <View
        style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6`}
      >
        <Text
          style={tw`text-white text-lg font-bold mb-5`}
        >
          Weight Trend
        </Text>

        <LineChart
          areaChart
          curved
          hideRules
          thickness={3}
          color="#A3E635"
          startFillColor="#A3E635"
          endFillColor="#A3E635"
          startOpacity={0.18}
          endOpacity={0.02}
          data={chartData.map((item) => ({
            value: item.weight || 0,
            label: item.date,
            dataPointText: `${item.weight ?? "-"}`,
          }))}
          height={220}
          spacing={60}
          initialSpacing={15}
          endSpacing={15}
          yAxisColor="#404040"
          xAxisColor="#404040"
          yAxisTextStyle={{
            color: "#9CA3AF",
            fontSize: 11,
          }}
          xAxisLabelTextStyle={{
            color: "#9CA3AF",
            fontSize: 11,
          }}
          rulesColor="#262626"
          hideDataPoints={false}
          dataPointsColor="#A3E635"
          dataPointsRadius={4}
          showVerticalLines={false}
          showValuesAsDataPointsText
          textColor="#ffffff"
          textFontSize={11}
        />
      </View>


            {/* BMI Trend Chart */}

            <View
        style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6`}
      >
        <Text
          style={tw`text-white text-lg font-bold mb-5`}
        >
          BMI Trend
        </Text>

        <LineChart
          areaChart
          curved
          hideRules
          thickness={3}
          color="#22C55E"
          startFillColor="#22C55E"
          endFillColor="#22C55E"
          startOpacity={0.18}
          endOpacity={0.02}
          data={chartData.map((item) => ({
            value: item.bmi || 0,
            label: item.date,
            dataPointText: `${item.bmi ?? "-"}`,
          }))}
          height={220}
          spacing={60}
          initialSpacing={15}
          endSpacing={15}
          yAxisColor="#404040"
          xAxisColor="#404040"
          yAxisTextStyle={{
            color: "#9CA3AF",
            fontSize: 11,
          }}
          xAxisLabelTextStyle={{
            color: "#9CA3AF",
            fontSize: 11,
          }}
          rulesColor="#262626"
          hideDataPoints={false}
          dataPointsColor="#22C55E"
          dataPointsRadius={4}
          showVerticalLines={false}
          showValuesAsDataPointsText
          textColor="#ffffff"
          textFontSize={11}
        />
      </View>


            {/* Body Fat Percentage Trend Chart */}

            <View
        style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6`}
      >
        <Text
          style={tw`text-white text-lg font-bold mb-5`}
        >
          Body Fat Percentage Trend
        </Text>

        <LineChart
          areaChart
          curved
          hideRules
          thickness={3}
          color="#F59E0B"
          startFillColor="#F59E0B"
          endFillColor="#F59E0B"
          startOpacity={0.18}
          endOpacity={0.02}
          data={chartData.map((item) => ({
            value: item.bodyFat || 0,
            label: item.date,
            dataPointText: `${item.bodyFat ?? "-"}`,
          }))}
          height={220}
          spacing={60}
          initialSpacing={15}
          endSpacing={15}
          yAxisColor="#404040"
          xAxisColor="#404040"
          yAxisTextStyle={{
            color: "#9CA3AF",
            fontSize: 11,
          }}
          xAxisLabelTextStyle={{
            color: "#9CA3AF",
            fontSize: 11,
          }}
          rulesColor="#262626"
          hideDataPoints={false}
          dataPointsColor="#F59E0B"
          dataPointsRadius={4}
          showVerticalLines={false}
          showValuesAsDataPointsText
          textColor="#ffffff"
          textFontSize={11}
        />
      </View>


            {/* Body Measurements Trend */}

            <View
        style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6`}
      >
        <Text
          style={tw`text-white text-lg font-bold mb-5`}
        >
          Body Measurements Trend
        </Text>

        <LineChart
          height={320}
          curved
          areaChart={false}
          thickness={2}
          hideRules={false}
          rulesColor="#262626"
          spacing={60}
          initialSpacing={15}
          endSpacing={15}
          yAxisColor="#404040"
          xAxisColor="#404040"
          yAxisTextStyle={{
            color: "#9CA3AF",
            fontSize: 11,
          }}
          xAxisLabelTextStyle={{
            color: "#9CA3AF",
            fontSize: 11,
          }}
          dataSet={[
            {
              data: chartData.map((item) => ({
                value: item.chest || 0,
                label: item.date,
              })),
              color: "#8B5CF6",
              thickness: 2,
              dataPointsColor: "#8B5CF6",
              dataPointsRadius: 3,
              startFillColor: "#8B5CF6",
              endFillColor: "#8B5CF6",
            },
            {
              data: chartData.map((item) => ({
                value: item.waist || 0,
                label: item.date,
              })),
              color: "#EF4444",
              thickness: 2,
              dataPointsColor: "#EF4444",
              dataPointsRadius: 3,
              startFillColor: "#EF4444",
              endFillColor: "#EF4444",
            },
            {
              data: chartData.map((item) => ({
                value: item.hips || 0,
                label: item.date,
              })),
              color: "#06B6D4",
              thickness: 2,
              dataPointsColor: "#06B6D4",
              dataPointsRadius: 3,
              startFillColor: "#06B6D4",
              endFillColor: "#06B6D4",
            },
            {
              data: chartData.map((item) => ({
                value: item.biceps || 0,
                label: item.date,
              })),
              color: "#84CC16",
              thickness: 2,
              dataPointsColor: "#84CC16",
              dataPointsRadius: 3,
              startFillColor: "#84CC16",
              endFillColor: "#84CC16",
            },
            {
              data: chartData.map((item) => ({
                value: item.thighs || 0,
                label: item.date,
              })),
              color: "#F97316",
              thickness: 2,
              dataPointsColor: "#F97316",
              dataPointsRadius: 3,
              startFillColor: "#F97316",
              endFillColor: "#F97316",
            },
            {
              data: chartData.map((item) => ({
                value: item.neck || 0,
                label: item.date,
              })),
              color: "#3B82F6",
              thickness: 2,
              dataPointsColor: "#3B82F6",
              dataPointsRadius: 3,
              startFillColor: "#3B82F6",
              endFillColor: "#3B82F6",
            },
            {
              data: chartData.map((item) => ({
                value: item.calf || 0,
                label: item.date,
              })),
              color: "#10B981",
              thickness: 2,
              dataPointsColor: "#10B981",
              dataPointsRadius: 3,
              startFillColor: "#10B981",
              endFillColor: "#10B981",
            },
          ]}
        />

        {/* Legend */}

        <View
          style={tw`flex-row flex-wrap justify-center mt-5`}
        >
          {[
            ["Chest", "#8B5CF6"],
            ["Waist", "#EF4444"],
            ["Hips", "#06B6D4"],
            ["Biceps", "#84CC16"],
            ["Thighs", "#F97316"],
            ["Neck", "#3B82F6"],
            ["Calf", "#10B981"],
          ].map(([label, color]) => (
            <View
              key={label}
              style={tw`flex-row items-center mr-4 mb-3`}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: color,
                  marginRight: 6,
                }}
              />

              <Text
                style={tw`text-neutral-400 text-xs`}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}