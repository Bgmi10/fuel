import React, {
    useEffect,
    useState,
  } from "react";
  
  import {
    Modal,
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
  } from "react-native";
  
  import tw from "twrnc";
  
  import {
    X,
    Calculator,
  } from "lucide-react-native";
  
  import DateTimePicker from "@react-native-community/datetimepicker";
import { calculateBMI } from "../../../src/utils/helper";
import { request } from "../../../src/api/client";
  
  
  
  interface AssessmentModalProps {
    memberId: string;
    assessment?: any | null;
    onClose: () => void;
    onSuccess: () => void;
  }
  
  export function AssessmentModal({
    memberId,
    assessment,
    onClose,
    onSuccess,
  }: AssessmentModalProps) {


    const [formData, setFormData] =
    useState({
      weight:
        assessment?.weight?.toString() ||
        "",

      height:
        assessment?.height?.toString() ||
        "",

      bmi:
        assessment?.bmi?.toString() ||
        "",

      bodyFatPercentage:
        assessment?.bodyFatPercentage?.toString() ||
        "",

      chest:
        assessment?.chest?.toString() ||
        "",

      waist:
        assessment?.waist?.toString() ||
        "",

      hips:
        assessment?.hips?.toString() ||
        "",

      biceps:
        assessment?.biceps?.toString() ||
        "",

      thighs:
        assessment?.thighs?.toString() ||
        "",

      neck:
        assessment?.neck?.toString() ||
        "",

      calf:
        assessment?.calf?.toString() ||
        "",

      hba1c:
        assessment?.hba1c?.toString() ||
        "",

      bloodPressure:
        assessment?.bloodPressure ||
        "",

      t3:
        assessment?.t3?.toString() ||
        "",

      t4:
        assessment?.t4?.toString() ||
        "",

      tsh:
        assessment?.tsh?.toString() ||
        "",

      memberNotes:
        assessment?.memberNotes || "",

      assessmentDate:
        assessment?.assessmentDate
          ? new Date(
              assessment.assessmentDate
            )
          : new Date(),
    });

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [showDatePicker, setShowDatePicker] =
    useState(false);


    useEffect(() => {
        if (
          formData.weight &&
          formData.height
        ) {
          const weight = parseFloat(
            formData.weight
          );
    
          const height = parseFloat(
            formData.height
          );
    
          if (
            !isNaN(weight) &&
            !isNaN(height) &&
            weight > 0 &&
            height > 0
          ) {
            const bmi =
              calculateBMI(
                weight,
                height
              );
    
            setFormData((prev) => ({
              ...prev,
              bmi: bmi.toString(),
            }));
          }
        }
      }, [
        formData.weight,
        formData.height,
      ]);


      const handleInputChange = (
        field: string,
        value: string
      ) => {
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
    }
        const handleSubmit = async () => {
            setIsSubmitting(true);
        

            try {
              const payload = {
                memberId,
        
                weight: formData.weight
                  ? parseFloat(formData.weight)
                  : undefined,
        
                height: formData.height
                  ? parseFloat(formData.height)
                  : undefined,
        
                bodyFatPercentage:
                  formData.bodyFatPercentage
                    ? parseFloat(
                        formData.bodyFatPercentage
                      )
                    : undefined,
        
                chest: formData.chest
                  ? parseFloat(formData.chest)
                  : undefined,
        
                waist: formData.waist
                  ? parseFloat(formData.waist)
                  : undefined,
        
                hips: formData.hips
                  ? parseFloat(formData.hips)
                  : undefined,
        
                biceps: formData.biceps
                  ? parseFloat(formData.biceps)
                  : undefined,
        
                thighs: formData.thighs
                  ? parseFloat(formData.thighs)
                  : undefined,
        
                neck: formData.neck
                  ? parseFloat(formData.neck)
                  : undefined,
        
                calf: formData.calf
                  ? parseFloat(formData.calf)
                  : undefined,
        
                hba1c: formData.hba1c
                  ? parseFloat(formData.hba1c)
                  : undefined,
        
                bloodPressure:
                  formData.bloodPressure ||
                  undefined,
        
                t3: formData.t3
                  ? parseFloat(formData.t3)
                  : undefined,
        
                t4: formData.t4
                  ? parseFloat(formData.t4)
                  : undefined,
        
                tsh: formData.tsh
                  ? parseFloat(formData.tsh)
                  : undefined,
        
                assessmentDate:
                  formData.assessmentDate,
        
                memberNotes:
                  formData.memberNotes,
              };
        
              await request({
                url: "/assessments",
                data: payload,
                method: "POST"
              })
        
              onSuccess();
            } catch (error) {
              console.log(error);
            } finally {
              setIsSubmitting(false);
            }
          };

          const onChangeDate = (
            _: any,
            selectedDate?: Date
          ) => {
            setShowDatePicker(false);
        
            if (selectedDate) {
              setFormData((prev) => ({
                ...prev,
                assessmentDate:
                  selectedDate,
              }));
            }
          };


          return (
            <Modal
              visible
              transparent
              animationType="fade"
            >
              <KeyboardAvoidingView
                style={tw`flex-1 bg-black/70`}
                behavior={
                  Platform.OS === "ios"
                    ? "padding"
                    : undefined
                }
              >
                <View
                  style={tw`flex-1 justify-center px-5`}
                >
                  <View
                    style={tw`bg-neutral-900 rounded-3xl max-h-[90%] overflow-hidden`}
                  >

<View
              style={tw`flex-row items-center justify-between px-6 py-5 border-b border-neutral-800`}
            >
              <Text
                style={tw`text-white text-xl font-bold`}
              >
                {assessment
                  ? "Edit Assessment"
                  : "Add Assessment"}
              </Text>

              <TouchableOpacity
                onPress={onClose}
              >
                <X
                  size={22}
                  color="#A3A3A3"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={tw`p-6 pb-10`}
            >

                              {/* Basic Measurements */}

              <View style={tw`mb-6`}>
                <View
                  style={tw`flex-row justify-between`}
                >
                  {/* Weight */}

                  <View
                    style={tw`w-[48%]`}
                  >
                    <Text
                      style={tw`text-neutral-300 text-sm mb-2`}
                    >
                      Weight (kg) *
                    </Text>

                    <TextInput
                      keyboardType="numeric"
                      placeholder="70"
                      placeholderTextColor="#737373"
                      value={formData.weight}
                      onChangeText={(text) =>
                        handleInputChange(
                          "weight",
                          text
                        )
                      }
                      style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                    />
                  </View>

                  {/* Height */}

                  <View
                    style={tw`w-[48%]`}
                  >
                    <Text
                      style={tw`text-neutral-300 text-sm mb-2`}
                    >
                      Height (cm)
                    </Text>

                    <TextInput
                      keyboardType="numeric"
                      placeholder="170"
                      placeholderTextColor="#737373"
                      value={formData.height}
                      onChangeText={(text) =>
                        handleInputChange(
                          "height",
                          text
                        )
                      }
                      style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                    />
                  </View>
                </View>
              </View>

              {/* BMI */}

              <View style={tw`mb-6`}>
                <Text
                  style={tw`text-neutral-300 text-sm mb-2`}
                >
                  BMI (Auto Calculated)
                </Text>

                <View
                  style={tw`flex-row items-center bg-neutral-700 rounded-xl px-4 py-3 border border-neutral-600`}
                >
                  <Calculator
                    size={18}
                    color="#A3E635"
                  />

                  <Text
                    style={tw`text-lime-400 font-bold text-base ml-3`}
                  >
                    {formData.bmi ||
                      "Will auto calculate"}
                  </Text>
                </View>
              </View>

              {/* Body Fat */}

              <View style={tw`mb-6`}>
                <Text
                  style={tw`text-neutral-300 text-sm mb-2`}
                >
                  Body Fat Percentage (%)
                </Text>

                <TextInput
                  keyboardType="numeric"
                  placeholder="15.5"
                  placeholderTextColor="#737373"
                  value={
                    formData.bodyFatPercentage
                  }
                  onChangeText={(text) =>
                    handleInputChange(
                      "bodyFatPercentage",
                      text
                    )
                  }
                  style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                />
              </View>

              {/* Health Assessment */}

              <View style={tw`mb-6`}>
                <Text
                  style={tw`text-white text-lg font-bold mb-4`}
                >
                  Health Assessment
                </Text>
                </View>

                <View
                  style={tw`flex-row justify-between mb-4`}
                >
                  <View
                    style={tw`w-[48%]`}
                  >
                    <Text
                      style={tw`text-neutral-300 text-sm mb-2`}
                    >
                      HbA1c
                    </Text>

                    <TextInput
                      keyboardType="numeric"
                      value={formData.hba1c}
                      onChangeText={(text) =>
                        handleInputChange(
                          "hba1c",
                          text
                        )
                      }
                      style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                    />
                  </View>

                  <View
                    style={tw`w-[48%]`}
                  >
                    <Text
                      style={tw`text-neutral-300 text-sm mb-2`}
                    >
                      Blood Pressure
                    </Text>

                    <TextInput
                      placeholder="120/80"
                      placeholderTextColor="#737373"
                      value={
                        formData.bloodPressure
                      }
                      onChangeText={(text) =>
                        handleInputChange(
                          "bloodPressure",
                          text
                        )
                      }
                      style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                    />
                  </View>
                </View>



                <View
                style={tw`flex-row justify-between mb-4`}
              >
                {/* T3 */}

                <View
                  style={tw`w-[48%]`}
                >
                  <Text
                    style={tw`text-neutral-300 text-sm mb-2`}
                  >
                    T3
                  </Text>

                  <TextInput
                    keyboardType="numeric"
                    value={formData.t3}
                    onChangeText={(text) =>
                      handleInputChange(
                        "t3",
                        text
                      )
                    }
                    style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                  />
                </View>

                {/* T4 */}

                <View
                  style={tw`w-[48%]`}
                >
                  <Text
                    style={tw`text-neutral-300 text-sm mb-2`}
                  >
                    T4
                  </Text>

                  <TextInput
                    keyboardType="numeric"
                    value={formData.t4}
                    onChangeText={(text) =>
                      handleInputChange(
                        "t4",
                        text
                      )
                    }
                    style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                  />
                </View>
              </View>

              {/* TSH */}

              <View style={tw`mb-6`}>
                <Text
                  style={tw`text-neutral-300 text-sm mb-2`}
                >
                  TSH
                </Text>

                <TextInput
                  keyboardType="numeric"
                  value={formData.tsh}
                  onChangeText={(text) =>
                    handleInputChange(
                      "tsh",
                      text
                    )
                  }
                  style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                />
              </View>

              {/* Body Measurements */}

              <View style={tw`mb-6`}>
                <Text
                  style={tw`text-white text-lg font-bold mb-4`}
                >
                  Body Measurements (cm)
                </Text>

                {/* Chest & Waist */}

                <View
                  style={tw`flex-row justify-between mb-4`}
                >
                  <View style={tw`w-[48%]`}>
                    <Text
                      style={tw`text-neutral-300 text-sm mb-2`}
                    >
                      Chest
                    </Text>

                    <TextInput
                      keyboardType="numeric"
                      value={formData.chest}
                      onChangeText={(text) =>
                        handleInputChange(
                          "chest",
                          text
                        )
                      }
                      style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                    />
                  </View>

                  <View style={tw`w-[48%]`}>
                    <Text
                      style={tw`text-neutral-300 text-sm mb-2`}
                    >
                      Waist
                    </Text>

                    <TextInput
                      keyboardType="numeric"
                      value={formData.waist}
                      onChangeText={(text) =>
                        handleInputChange(
                          "waist",
                          text
                        )
                      }
                      style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                    />
                  </View>
                </View>

                {/* Hips & Biceps */}

                <View
                  style={tw`flex-row justify-between mb-4`}
                >
                  <View style={tw`w-[48%]`}>
                    <Text
                      style={tw`text-neutral-300 text-sm mb-2`}
                    >
                      Hips
                    </Text>

                    <TextInput
                      keyboardType="numeric"
                      value={formData.hips}
                      onChangeText={(text) =>
                        handleInputChange(
                          "hips",
                          text
                        )
                      }
                      style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                    />
                  </View>

                  <View style={tw`w-[48%]`}>
                    <Text
                      style={tw`text-neutral-300 text-sm mb-2`}
                    >
                      Biceps
                    </Text>

                    <TextInput
                      keyboardType="numeric"
                      value={formData.biceps}
                      onChangeText={(text) =>
                        handleInputChange(
                          "biceps",
                          text
                        )
                      }
                      style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                    />
                  </View>
                </View>

                {/* Thighs */}

                <View style={tw`mb-4`}>
                  <Text
                    style={tw`text-neutral-300 text-sm mb-2`}
                  >
                    Thighs
                  </Text>

                  <TextInput
                    keyboardType="numeric"
                    value={formData.thighs}
                    onChangeText={(text) =>
                      handleInputChange(
                        "thighs",
                        text
                      )
                    }
                    style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                  />
                </View>

                {/* Neck */}

                <View style={tw`mb-4`}>
                  <Text
                    style={tw`text-neutral-300 text-sm mb-2`}
                  >
                    Neck
                  </Text>

                  <TextInput
                    keyboardType="numeric"
                    value={formData.neck}
                    onChangeText={(text) =>
                      handleInputChange(
                        "neck",
                        text
                      )
                    }
                    style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                  />
                </View>

                {/* Calf */}

                <View>
                  <Text
                    style={tw`text-neutral-300 text-sm mb-2`}
                  >
                    Calf
                  </Text>

                  <TextInput
                    keyboardType="numeric"
                    value={formData.calf}
                    onChangeText={(text) =>
                      handleInputChange(
                        "calf",
                        text
                      )
                    }
                    style={tw`bg-neutral-800 text-white rounded-xl px-4 py-3 border border-neutral-700`}
                  />
                </View>
              </View>


                            {/* Personal Notes */}

                            <View style={tw`mb-6`}>
                <Text
                  style={tw`text-white text-lg font-bold mb-4`}
                >
                  Personal Notes
                </Text>

                <TextInput
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  placeholder="Add your notes..."
                  placeholderTextColor="#737373"
                  value={formData.memberNotes}
                  onChangeText={(text) =>
                    handleInputChange(
                      "memberNotes",
                      text
                    )
                  }
                  style={tw`bg-neutral-800 text-white rounded-xl px-4 py-4 border border-neutral-700 min-h-[120px]`}
                />
              </View>

              {/* Assessment Date */}

              <View style={tw`mb-8`}>
                <Text
                  style={tw`text-white text-lg font-bold mb-4`}
                >
                  Assessment Date
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    setShowDatePicker(true)
                  }
                  style={tw`bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-4`}
                >
                  <Text
                    style={tw`text-white`}
                  >
                    {formData.assessmentDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={formData.assessmentDate}
                    mode="date"
                    display={
                      Platform.OS === "ios"
                        ? "spinner"
                        : "default"
                    }
                    onChange={onChangeDate}
                  />
                )}
              </View>

              {/* Buttons */}

              <View
                style={tw`flex-row justify-end`}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onClose}
                  style={tw`bg-neutral-700 rounded-xl px-6 py-4 mr-3`}
                >
                  <Text
                    style={tw`text-white font-semibold`}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  style={tw`bg-lime-400 rounded-xl px-8 py-4 flex-row items-center justify-center`}
                >
                  {isSubmitting ? (
                    <ActivityIndicator
                      color="#000"
                    />
                  ) : (
                    <Text
                      style={tw`text-black font-bold`}
                    >
                      {assessment
                        ? "Update Assessment"
                        : "Save Assessment"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}