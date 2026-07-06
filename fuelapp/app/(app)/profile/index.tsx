import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
  } from "react-native";
  import { SafeAreaView } from "react-native-safe-area-context";
  import { useEffect, useRef, useState } from "react";
  import * as ImagePicker from "expo-image-picker";
  import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";
  import tw from "twrnc";
  
  import {
    Camera,
    User,
    Mail,
    Phone,
    Calendar,
    MapPin,
    Ruler,
    Weight,
    Shield,
    Save,
    Pencil,
    X,
  } from "lucide-react-native";
import { request } from "../../../src/api/client";
import { useAuth } from "../../../src/contexts/AuthContext";
  



const Input = ({
    label,
    value,
    onChangeText,
    editable = true,
    keyboardType = "default",
    editing = false,
    multiline = false,
  }: any) => (
    <View style={tw`mb-5`}>
      <Text
        style={tw`text-neutral-400 mb-2`}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        editable={editing && editable}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[
          tw`bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white`,
          multiline && {
            height: 100,
            textAlignVertical: "top",
          },
        ]}
      />
    </View>
  );


  
  export default function Profile() {
    const { user: member, refreshSession } = useAuth();
  
    const [showDatePicker, setShowDatePicker] = useState(false);



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

  setSelectedDate(date);

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

  setFormData(prev => ({
    ...prev,
    dob,
    age: age.toString(),
  }));

  setShowDatePicker(false);
};
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
  
    const [editing, setEditing] = useState(false);
  
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
  
    const [formData, setFormData] = useState({
      name: "",
      email: "",
      phone: "",
      dob: "",
      gender: "",
      address: "",
      emergencyContact: "",
      profileImage: "",
      height: "",
      weight: "",
      age: "",
    });
  

    const [selectedDate, setSelectedDate] = useState(
        formData.dob ? new Date(formData.dob) : new Date()
      );

      
    useEffect(() => {
      if (!member) return;
  
      setFormData({
        name: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        dob: member.dob || "",
        gender: member.gender || "",
        address: member.address || "",
        emergencyContact: member.emergencyContact || "",
        profileImage: member.profileImage || "",
        height: member.height?.toString() || "",
        weight: member.weight?.toString() || "",
        age: member.age?.toString() || "",
      });
    }, [member]);


    const saveProfile = async () => {
        try {
          setLoading(true);
          setError("");
    
          const res = await request({
            method: "PUT",
            url: `/members/${member?.id}`,
            data: {
              ...formData,
              height: Number(formData.height),
              weight: Number(formData.weight),
              age: Number(formData.age),
            },
          });
    
          if (!res.success) {
            setError(res.message);
            return;
          }
    
          setSuccess(true);
          setEditing(false);
    
          await refreshSession();
    
          setTimeout(() => {
            setSuccess(false);
          }, 2500);
        } catch (err: any) {
          setError(err.message || "Failed to update profile");
        } finally {
          setLoading(false);
        }
      };


      const cancelEditing = () => {
        setEditing(false);
        setError("");
    
        if (!member) return;
    
        setFormData({
          name: member.name || "",
          email: member.email || "",
          phone: member.phone || "",
          dob: member.dob || "",
          gender: member.gender || "",
          address: member.address || "",
          emergencyContact: member.emergencyContact || "",
          profileImage: member.profileImage || "",
          height: member.height?.toString() || "",
          weight: member.weight?.toString() || "",
          age: member.age?.toString() || "",
        });
      };


      const pickImage = async () => {
        if (!editing) return;
    
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
    
        if (!permission.granted) {
          Alert.alert(
            "Permission Required",
            "Please allow gallery access."
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
    
        try {
          setUploading(true);
    
          const asset = result.assets[0];
    
          const body = new FormData();
    
          body.append("file", {
            uri: asset.uri,
            type: "image/jpeg",
            name: "profile.jpg",
          } as any);
    
          const data  = await request({
         url: "/upload",
         method: "POST",
         data: body,
         headers: {
           "Content-Type": "multipart/form-data",
         }
          }
          );
          
          if (!data.success) {
            throw new Error(data.message);
          }
    
          setFormData((prev) => ({
            ...prev,
            profileImage: data.url,
          }));
        } catch (err: any) {
          Alert.alert(
            "Upload Failed",
            err.message
          );
        } finally {
          setUploading(false);
        }
      };





      const ProfileHeader = () => (
        <View
          style={tw`bg-neutral-950 border border-neutral-900 rounded-3xl p-6 mb-6`}
        >
          {/* Avatar */}
          <View style={tw`items-center`}>
            <View>
      
              <Image
                source={{
                  uri:
                    formData.profileImage ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      formData.name || "Member"
                    )}`,
                }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 3,
                  borderColor: "#84cc16",
                }}
              />
      
              {editing && (
                <TouchableOpacity
                  onPress={pickImage}
                  activeOpacity={0.8}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#84cc16",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {uploading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Camera
                      size={20}
                      color="#000"
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
      
            <Text
              style={tw`text-white text-2xl font-bold mt-5`}
            >
              {formData.name || "Member"}
            </Text>
      
            <Text
              style={tw`text-neutral-400 mt-1`}
            >
              {formData.email}
            </Text>
      
            <View
              style={tw`flex-row mt-4`}
            >
              <View
                style={tw`bg-lime-400 px-3 py-1 rounded-full`}
              >
                <Text
                  style={tw`text-black font-semibold`}
                >
                  Active Member
                </Text>
              </View>
      
              <View
                style={tw`ml-2 bg-neutral-800 px-3 py-1 rounded-full`}
              >
                <Text
                  style={tw`text-neutral-300`}
                >
                  #{member?.id?.slice(0, 8)}
                </Text>
              </View>
            </View>
          </View>
      
          {/* Messages */}
      
          {success && (
            <View
              style={tw`mt-6 bg-green-900 border border-green-700 rounded-xl p-4`}
            >
              <Text
                style={tw`text-green-300 font-medium`}
              >
                ✓ Profile updated successfully.
              </Text>
            </View>
          )}
      
          {!!error && (
            <View
              style={tw`mt-6 bg-red-900 border border-red-700 rounded-xl p-4`}
            >
              <Text
                style={tw`text-red-300`}
              >
                {error}
              </Text>
            </View>
          )}
      
          {/* Buttons */}
      
          {!editing ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setEditing(true)}
              style={tw`mt-6 bg-lime-400 h-14 rounded-2xl justify-center items-center flex-row`}
            >
              <Pencil
                color="#000"
                size={18}
              />
      
              <Text
                style={tw`text-black font-bold text-lg ml-2`}
              >
                Edit Profile
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={tw`flex-row mt-6`}
            >
              <TouchableOpacity
                onPress={cancelEditing}
                style={tw`flex-1 h-14 rounded-2xl border border-neutral-700 justify-center items-center mr-2`}
              >
                <View style={tw`flex-row items-center`}>
                  <X
                    color="white"
                    size={18}
                  />
      
                  <Text
                    style={tw`text-white ml-2 font-semibold`}
                  >
                    Cancel
                  </Text>
                </View>
              </TouchableOpacity>
      
              <TouchableOpacity
                disabled={loading}
                onPress={saveProfile}
                style={tw`flex-1 h-14 rounded-2xl bg-lime-400 justify-center items-center ml-2`}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <View style={tw`flex-row items-center`}>
                    <Save
                      color="#000"
                      size={18}
                    />
      
                    <Text
                      style={tw`text-black font-bold ml-2`}
                    >
                      Save
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      );

      return (
        <SafeAreaView style={tw`flex-1 bg-black`}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 18,
              paddingBottom: 40,
            }}
          >
            <ProfileHeader />
      
            {/* Personal Information card comes here */}


            <View
  style={tw`bg-neutral-950 border border-neutral-900 rounded-3xl p-5`}
>

  <Text
    style={tw`text-white text-xl font-bold mb-6`}
  >
    Personal Information
  </Text>

  {/* Name */}

  <Input
    label="Full Name"
    value={formData.name}
    editing={editing}
    onChangeText={(v: string) =>
      setFormData({
        ...formData,
        name: v,
      })
    }
  />

  {/* Email */}

  <Input
    label="Email Address"
    value={formData.email}
    keyboardType="email-address"
    editing={editing}
    onChangeText={(v: string) =>
      setFormData({
        ...formData,
        email: v,
      })
    }
  />

  {/* Phone */}

  <Input
    label="Phone Number"
    value={formData.phone}
    editing={editing}
    editable={false}
  />

  <Text
    style={tw`text-neutral-500 text-xs -mt-3 mb-5`}
  >
    Phone number cannot be changed.
  </Text>

  {/* DOB */}

  <View style={tw`mb-5`}>
  <Text style={tw`text-neutral-400 mb-2`}>
    Date of Birth
  </Text>

  <TouchableOpacity
    disabled={!editing}
    onPress={() => setShowDatePicker(true)}
    style={[
      tw`bg-neutral-900 border border-neutral-800 rounded-xl px-4 h-14 justify-center`,
      !editing && tw`opacity-70`,
    ]}
  >
    <Text style={tw`text-white`}>
      {formData.dob || "Select Date"}
    </Text>
  </TouchableOpacity>
</View>

  <Text
    style={tw`text-neutral-500 text-xs -mt-3 mb-5`}
  >
    Format : YYYY-MM-DD
  </Text>

  {/* Gender */}

  <View style={tw`mb-5`}>
  <Text style={tw`text-neutral-400 mb-2`}>
    Gender
  </Text>

  <View style={tw`flex-row justify-between`}>
    {["Male", "Female", "Other"].map((item) => (
      <TouchableOpacity
        key={item}
        disabled={!editing}
        activeOpacity={0.8}
        onPress={() =>
          setFormData((prev) => ({
            ...prev,
            gender: item,
          }))
        }
        style={[
          tw`flex-1 h-12 rounded-xl justify-center items-center border mx-1`,
          formData.gender === item
            ? tw`bg-lime-400 border-lime-400`
            : tw`bg-neutral-900 border-neutral-800`,
          !editing && tw`opacity-70`,
        ]}
      >
        <Text
          style={[
            tw`font-semibold`,
            {
              color:
                formData.gender === item
                  ? "#000"
                  : "#fff",
            },
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>

  {/* Height */}

  <Input
    label="Height (cm)"
    value={formData.height}
    editing={editing}

    keyboardType="numeric"
    onChangeText={(v: string) =>
      setFormData({
        ...formData,
        height: v,
      })
    }
  />

  {/* Weight */}

  <Input
    label="Weight (kg)"
    value={formData.weight}
    keyboardType="numeric"
    editing={editing}

    onChangeText={(v: string) =>
      setFormData({
        ...formData,
        weight: v,
      })
    }
  />

  {/* Age */}

  <Input
    label="Age"
    editing={editing}

    editable={false}
    value={formData.age}
  />

  {/* Emergency */}

  <Input
    label="Emergency Contact"
    editing={editing}

    keyboardType="phone-pad"
    value={formData.emergencyContact}
    onChangeText={(v: string) =>
      setFormData({
        ...formData,
        emergencyContact: v,
      })
    }
  />

  {/* Address */}

  <Input
    multiline
    editing={editing}

    label="Address"
    value={formData.address}
    onChangeText={(v: string) =>
      setFormData({
        ...formData,
        address: v,
      })
    }
  />

</View>

      
          </ScrollView>
          {showDatePicker && (
  <DateTimePicker
    value={selectedDate}
    mode="date"
    maximumDate={new Date()}
    display={Platform.OS === "ios" ? "inline" : "default"}
    onChange={handleDateChange}
  />
)}
        </SafeAreaView>
      );

    }
