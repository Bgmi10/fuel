import React, {
    useEffect,
    useMemo,
    useState,
  } from "react";

  import {
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    TouchableOpacity,
    ActivityIndicator,
    View,
    Text,
    TextInput,
    Image,
    Alert,
    Platform,
  } from "react-native";
  
  import tw from "twrnc";
  
  import * as ImagePicker from "expo-image-picker";
  
  import DateTimePicker from "@react-native-community/datetimepicker";
  
  import { useRouter } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";
import { request } from "../../../src/api/client";
  
  export default function CompleteProfileScreen() {
    const router = useRouter();
    const {
      user,
      loading,
      refreshSession,
    } = useAuth();
  
    const [saving, setSaving] =
      useState(false);
  
    const [uploading, setUploading] =
      useState(false);
  
    const [showDatePicker, setShowDatePicker] =
      useState(false);
  
    const [form, setForm] = useState({
      name: "",
      dob: "",
      age: "",
      height: "",
      weight: "",
      gender: "",
      emergencyContact: "",
      profileImage: "",
      address: "",
    });
    const [selectedDate, setSelectedDate] = useState(
        form.dob ? new Date(form.dob) : new Date()
      );

  
    /**
     * Redirect if profile already completed
     */
    useEffect(() => {
      if (!user) return;
  
      const completed =
        user.address &&
        user.dob &&
        user.age &&
        user.height &&
        user.weight &&
        user.gender &&
        user.profileImage &&
        user.emergencyContact;
  
      if (completed) {
        router.replace("/(onboarding)/complete-profile-1");
      }
    }, [user]);
  
    /**
     * Populate form
     */
    useEffect(() => {
      if (!user) return;
  
      setForm({
        name: user.name || "",
        dob: user.dob || "",
        age: user.age?.toString() || "",
        height: user.height?.toString() || "",
        weight: user.weight?.toString() || "",
        gender: user.gender || "",
        emergencyContact:
          user.emergencyContact || "",
        profileImage:
          user.profileImage || "",
        address: user.address || "",
      });
    }, [user]);
  
    /**
     * Form validation
     */
    const isComplete = useMemo(() => {
      return (
        form.name.trim() &&
        form.dob.trim() &&
        form.age.trim() &&
        form.height.trim() &&
        form.weight.trim() &&
        form.gender.trim() &&
        form.profileImage.trim() &&
        form.emergencyContact.trim() &&
        form.address.trim()
      );
    }, [form]);
  
    /**
     * Image Upload
     */
    const handleUpload = async () => {
        try {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
      
          if (!permission.granted) {
            Alert.alert(
              "Permission Required",
              "Gallery permission is required."
            );
            return;
          }
      
          const result =
            await ImagePicker.launchImageLibraryAsync({
              mediaTypes:
                ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
              allowsEditing: true,
              aspect: [1, 1],
            });
      
          if (result.canceled) return;
      
          setUploading(true);
      
          const asset = result.assets[0];
      
          const formData = new FormData();
      
          formData.append("file", {
            uri: asset.uri,
            name: asset.fileName ?? "profile.jpg",
            type: asset.mimeType ?? "image/jpeg",
          } as any);
      
          const data = await request({
            method: "POST",
            url: "/upload",
            data: formData,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
      
          if (!data.success) {
            Alert.alert("Upload failed");
            return;
          }
      
          setForm((prev) => ({
            ...prev,
            profileImage: data.url,
          }));
        } catch (err) {
          console.log(err);
      
          Alert.alert("Something went wrong");
        } finally {
          setUploading(false);
        }
      };
  
    /**
     * Date Picker
     */

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");
      
        return `${year}-${month}-${day}`;
      };
      const handleDateChange = (
        event: any,
        date?: Date
      ) => {
        if (!date) {
          setShowDatePicker(false);
          return;
        }
      
        const dob = formatDate(date);
      
        const today = new Date();
      
        let age = today.getFullYear() - date.getFullYear();
      
        const hasBirthdayPassed =
          today.getMonth() > date.getMonth() ||
          (today.getMonth() === date.getMonth() &&
            today.getDate() >= date.getDate());
      
        if (!hasBirthdayPassed) {
          age--;
        }
      
        setForm((prev) => ({
          ...prev,
          dob,
          age: age.toString(),
        }));
      
        // Hide picker after selection
        setShowDatePicker(false);
      };
  
    /**
     * Save Profile
     */
    const handleSubmit =
      async () => {
        if (!user) return;
  
        if (!isComplete) {
          Alert.alert(
            "Please complete all fields."
          );
  
          return;
        }
  
        try {
          setSaving(true);
  
          const data =
            await request({
              method: "PUT",
              url: `/members/${user.id}`,
              data: {
                name: form.name,
                dob: form.dob,
                age: parseInt(
                  form.age
                ),
                height:
                  parseFloat(
                    form.height
                  ),
                weight:
                  parseFloat(
                    form.weight
                  ),
                gender:
                  form.gender,
                emergencyContact:
                  form.emergencyContact,
                profileImage:
                  form.profileImage,
                address:
                  form.address,
              },
            });
  
          if (!data.success) {
            Alert.alert(
              "Failed to update profile."
            );
  
            return;
          }
  
          await refreshSession();
  
          router.replace(
            "/complete-profile-1"
          );
        } catch (err) {
          console.log(err);
  
          Alert.alert(
            "Something went wrong"
          );
        } finally {
          setSaving(false);
        }
      };

      if (loading) {
        return (
          <SafeAreaView style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#A3E635" />
            <Text style={tw`text-white mt-4 text-base`}>
              Loading Profile...
            </Text>
          </SafeAreaView>
        );
      }
      
      return (
        <SafeAreaView style={tw`flex-1 bg-slate-950`}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={tw`flex-1`}
          >
            <ScrollView
              contentContainerStyle={tw`px-6 pt-10 pb-14`}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* HEADER */}
      
              <View style={tw`items-center mb-8`}>
                <Text
                  style={tw`text-white text-3xl font-bold text-center`}
                >
                  Finish Setting Up
                </Text>
      
                <Text
                  style={tw`text-lime-400 text-3xl font-bold mt-1`}
                >
                  Your Member Profile
                </Text>
      
                <Text
                  style={tw`text-neutral-500 text-center mt-5 leading-6 px-2`}
                >
                  Complete your profile to access your dashboard,
                  invoices, subscriptions and membership details.
                </Text>
              </View>
      
              {/* CARD */}
      
              <View
                style={tw`bg-neutral-950 border border-neutral-900 rounded-3xl p-6`}
              >
                {/* AVATAR */}
      
                <View style={tw`items-center mb-8`}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleUpload}
                  >
                    <View
                      style={[
                        tw`rounded-full border-4 border-neutral-800 bg-neutral-900 items-center justify-center overflow-hidden`,
                        {
                          width: 150,
                          height: 150,
                        },
                      ]}
                    >
                      {form.profileImage ? (
                        <Image
                          source={{
                            uri: form.profileImage,
                          }}
                          resizeMode="cover"
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <Text
                          style={{
                            fontSize: 60,
                          }}
                        >
                          👤
                        </Text>
                      )}
      
                      <View
                        style={[
                          tw`absolute inset-0 items-center justify-center`,
                          {
                            backgroundColor:
                              "rgba(0,0,0,0.45)",
                          },
                        ]}
                      >
                        {uploading ? (
                          <ActivityIndicator
                            color="#A3E635"
                          />
                        ) : (
                          <Text
                            style={tw`text-white font-semibold`}
                          >
                            Upload
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
      
                  <Text
                    style={tw`text-neutral-500 mt-4`}
                  >
                    Profile Image *
                  </Text>
                </View>
      
                {/* NAME */}
      
                <Text
                  style={tw`text-neutral-400 mb-2`}
                >
                  Full Name *
                </Text>
      
                <TextInput
                  value={form.name}
                  onChangeText={(text) =>
                    setForm({
                      ...form,
                      name: text,
                    })
                  }
                  placeholder="Enter full name"
                  placeholderTextColor="#737373"
                  style={tw`bg-neutral-900 text-white h-14 rounded-2xl px-4 border border-neutral-800 mb-5`}
                />
      
                {/* DOB */}
      
                <Text
                  style={tw`text-neutral-400 mb-2`}
                >
                  Date of Birth *
                </Text>
      
                <TouchableOpacity
                  onPress={() =>
                    setShowDatePicker(true)
                  }
                  style={tw`bg-neutral-900 h-14 rounded-2xl border border-neutral-800 justify-center px-4 mb-5`}
                >
                  <Text
                    style={[
                      tw`text-base`,
                      {
                        color: form.dob
                          ? "#fff"
                          : "#737373",
                      },
                    ]}
                  >
                    {form.dob ||
                      "Select Date"}
                  </Text>
                </TouchableOpacity>
      
                {/* AGE */}
      
                <Text
                  style={tw`text-neutral-400 mb-2`}
                >
                  Age *
                </Text>
      
                <TextInput
                  editable={false}
                  value={form.age}
                  placeholder="Age"
                  placeholderTextColor="#737373"
                  style={tw`bg-neutral-800 text-neutral-400 h-14 rounded-2xl px-4 border border-neutral-800 mb-5`}
                />
      
                {/* HEIGHT */}
      
                <Text
                  style={tw`text-neutral-400 mb-2`}
                >
                  Height (cm) *
                </Text>
      
                <TextInput
                  keyboardType="decimal-pad"
                  value={form.height}
                  onChangeText={(text) =>
                    setForm({
                      ...form,
                      height: text,
                    })
                  }
                  placeholder="170"
                  placeholderTextColor="#737373"
                  style={tw`bg-neutral-900 text-white h-14 rounded-2xl px-4 border border-neutral-800 mb-5`}
                />
      
                {/* WEIGHT */}
      
                <Text
                  style={tw`text-neutral-400 mb-2`}
                >
                  Weight (kg) *
                </Text>
      
                <TextInput
                  keyboardType="decimal-pad"
                  value={form.weight}
                  onChangeText={(text) =>
                    setForm({
                      ...form,
                      weight: text,
                    })
                  }
                  placeholder="70"
                  placeholderTextColor="#737373"
                  style={tw`bg-neutral-900 text-white h-14 rounded-2xl px-4 border border-neutral-800 mb-5`}
                />
      
                {/* GENDER */}
      
                <Text
                  style={tw`text-neutral-400 mb-2`}
                >
                  Gender *
                </Text>
      
                <View
                  style={tw`flex-row justify-between mb-5`}
                >
                  {["Male", "Female", "Other"].map(
                    (item) => (
                      <TouchableOpacity
                        key={item}
                        onPress={() =>
                          setForm({
                            ...form,
                            gender: item,
                          })
                        }
                        style={[
                          tw`flex-1 h-12 rounded-xl justify-center items-center border mx-1`,
                          form.gender === item
                            ? tw`bg-lime-400 border-lime-400`
                            : tw`bg-neutral-900 border-neutral-800`,
                        ]}
                      >
                        <Text
                          style={[
                            tw`font-semibold`,
                            {
                              color:
                                form.gender === item
                                  ? "#000"
                                  : "#fff",
                            },
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
      
                {/* EMERGENCY */}
      
                <Text
                  style={tw`text-neutral-400 mb-2`}
                >
                  Emergency Contact *
                </Text>
      
                <TextInput
                  keyboardType="phone-pad"
                  value={form.emergencyContact}
                  onChangeText={(text) =>
                    setForm({
                      ...form,
                      emergencyContact: text,
                    })
                  }
                  placeholder="Emergency phone"
                  placeholderTextColor="#737373"
                  style={tw`bg-neutral-900 text-white h-14 rounded-2xl px-4 border border-neutral-800 mb-5`}
                />
      
                {/* ADDRESS */}
      
                <Text
                  style={tw`text-neutral-400 mb-2`}
                >
                  Address *
                </Text>
      
                <TextInput
                  multiline
                  value={form.address}
                  onChangeText={(text) =>
                    setForm({
                      ...form,
                      address: text,
                    })
                  }
                  placeholder="Enter your address"
                  placeholderTextColor="#737373"
                  textAlignVertical="top"
                  style={[
                    tw`bg-neutral-900 text-white rounded-2xl border border-neutral-800 p-4`,
                    {
                      minHeight: 130,
                    },
                  ]}
                />
      
                {!isComplete && (
                  <View
                    style={tw`bg-yellow-500/10 border border-yellow-600 rounded-2xl p-4 mt-6`}
                  >
                    <Text
                      style={tw`text-yellow-300 leading-6`}
                    >
                      Please complete all required fields
                      before continuing.
                    </Text>
                  </View>
                )}
      
                <TouchableOpacity
                  disabled={
                    !isComplete ||
                    saving ||
                    uploading
                  }
                  onPress={handleSubmit}
                  activeOpacity={0.9}
                  style={[
                    tw`h-14 rounded-2xl justify-center items-center mt-8`,
                    saving ||
                    uploading ||
                    !isComplete
                      ? tw`bg-lime-300`
                      : tw`bg-lime-400`,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator
                      color="#000"
                    />
                  ) : (
                    <Text
                      style={tw`text-black font-bold text-lg`}
                    >
                      Continue To Onboarding
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
      
             
            </ScrollView>
            {showDatePicker && (
 <View
 style={{
   borderRadius: 16,
   overflow: "hidden",
   marginTop: 10,
 }}
>
 <DateTimePicker
   value={selectedDate}
   mode="date"
   maximumDate={new Date()}
   display={Platform.OS === "ios" ? "inline" : "default"}
   onChange={handleDateChange}
 />
</View>
)}
          </KeyboardAvoidingView>
        </SafeAreaView>
      );

    }