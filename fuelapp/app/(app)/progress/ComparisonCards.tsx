import {
    View,
    Text,
    ScrollView,
  } from "react-native";
  
  import tw from "twrnc";
  
  import {
    TrendingUp,
    TrendingDown,
    Minus,
  } from "lucide-react-native";
  
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
    current: any;
    previous: any;
    comparison: ComparisonData | null;
    unit: string;
    isBetter?: "higher" | "lower";
  }


  function ComparisonCard({
    title,
    current,
    previous,
    comparison,
    unit,
    isBetter = "lower",
  }: ComparisonCardProps) {


    if (
        current == null ||
        previous == null ||
        !comparison
      ) {
        return (
          <View
            style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-4`}
          >
            <Text
              style={tw`text-white text-lg font-bold mb-4`}
            >
              {title}
            </Text>
    
            <Text
              style={tw`text-neutral-400`}
            >
              Current:{" "}
              {current != null
                ? `${current}${unit}`
                : "N/A"}
            </Text>
    
            <Text
              style={tw`text-neutral-500 mt-2`}
            >
              No comparison data
              available
            </Text>
          </View>
        );
      }


      const isImprovement =
      isBetter === "lower"
        ? comparison.isNegative
        : comparison.isPositive;
  
    const changeColor =
      comparison.value === 0
        ? "#9CA3AF"
        : isImprovement
        ? "#4ADE80"
        : "#F87171";
  
    const backgroundColor =
      comparison.value === 0
        ? "#171717"
        : isImprovement
        ? "rgba(74,222,128,0.06)"
        : "rgba(248,113,113,0.06)";
  
    const borderColor =
      comparison.value === 0
        ? "#262626"
        : isImprovement
        ? "rgba(74,222,128,0.25)"
        : "rgba(248,113,113,0.25)";


        const getIcon = () => {
            if (comparison.value === 0)
              return (
                <Minus
                  size={20}
                  color={changeColor}
                />
              );
        
            return comparison.isPositive ? (
              <TrendingUp
                size={20}
                color={changeColor}
              />
            ) : (
              <TrendingDown
                size={20}
                color={changeColor}
              />
            );
          };
        
          const getChangeText = () => {
            if (comparison.value === 0)
              return "No change";
        
            const sign =
              comparison.isPositive ? "+" : "";
        
            return `${sign}${comparison.value}${unit}`;
          };
        
          const getEmoji = () => {
            if (comparison.value === 0)
              return "🔄";
        
            return isImprovement
              ? "🔥"
              : "⚠️";
          };


          return (
            <View
              style={[
                tw`rounded-3xl p-5 mb-4 border`,
                {
                  backgroundColor,
                  borderColor,
                },
              ]}
            >
              {/* Header */}
        
              <View
                style={tw`flex-row items-center justify-between mb-5`}
              >
                <Text
                  style={tw`text-white text-lg font-bold`}
                >
                  {title}
                </Text>
        
                <Text style={tw`text-2xl`}>
                  {getEmoji()}
                </Text>
              </View>
        
              {/* Current */}
        
              <View
                style={tw`flex-row items-center justify-between mb-4`}
              >
                <Text
                  style={tw`text-white text-3xl font-bold`}
                >
                  {current}
                  {unit}
                </Text>
        
                <Text
                  style={tw`text-neutral-500 text-xs`}
                >
                  Current
                </Text>
              </View>
        
              {/* Previous */}
        
              <View
                style={tw`flex-row items-center justify-between mb-5`}
              >
                <Text
                  style={tw`text-neutral-300 text-xl`}
                >
                  {previous}
                  {unit}
                </Text>
        
                <Text
                  style={tw`text-neutral-500 text-xs`}
                >
                  Previous
                </Text>
              </View>
        
              {/* Divider */}
        
              <View
                style={tw`border-t border-neutral-800 pt-4`}
              >
                <View
                  style={tw`flex-row items-center justify-between`}
                >
                  <View
                    style={tw`flex-row items-center`}
                  >
                    {getIcon()}
        
                    <Text
                      style={[
                        tw`ml-2 font-bold`,
                        {
                          color: changeColor,
                        },
                      ]}
                    >
                      {getChangeText()}
                    </Text>
                  </View>
        
                  <Text
                    style={[
                      tw`text-sm capitalize`,
                      {
                        color: changeColor,
                      },
                    ]}
                  >
                    {comparison.label}
                  </Text>
                </View>
              </View>
            </View>
          );
        }


        export default function ComparisonCards({
            current,
            previous,
            comparison,
          }: ComparisonCardsProps) {
            return (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`p-5 pb-10`}
              >
                <View style={tw`mb-6`}>
                  <Text
                    style={tw`text-white text-2xl font-bold mb-2`}
                  >
                    Progress Comparison
                  </Text>
          
                  <Text
                    style={tw`text-neutral-400`}
                  >
                    Latest vs Previous Assessment
                  </Text>
                </View>
          
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
              </ScrollView>
            );
          }