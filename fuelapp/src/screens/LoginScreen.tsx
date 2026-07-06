import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import tw from "twrnc";
import { storage } from "../utils/storage";
import { request } from "../api/client";

import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"IDENTIFIER" | "OTP">("IDENTIFIER");
const [otp, setOtp] = useState("");
const { login } = useAuth();

useEffect(() => {
  checkSession();
}, []);

const checkSession = async () => {
  const token = await storage.get("token");

  if (!token) {
      return;
  }

  try {
      const data = await request({
          method: "GET",
          url: "/member/session",
      });

  } catch {
      await storage.remove("token");
  }
};


  const isPhone = useMemo(() => {
    return /^[0-9]+$/.test(identifier);
  }, [identifier]);

  const formattedPhone = useMemo(() => {
    if (!isPhone) return "";

    const cleaned = identifier.replace(/\D/g, "");

    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }

    return "";
  }, [identifier, isPhone]);

  const validate = () => {
    if (!identifier.trim()) {
      return "Email or mobile number is required";
    }

    if (isPhone) {
      const cleaned = identifier.replace(/\D/g, "");

      if (cleaned.length !== 10) {
        return "Mobile number must be 10 digits";
      }

      if (!/^[6-9]\d{9}$/.test(cleaned)) {
        return "Enter valid Indian mobile number";
      }

      return "";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(identifier)) {
      return "Enter valid email address";
    }

    return "";
  };

  const handleContinue = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await request({
        method: "POST",
        url: "/member/send-otp",
        data: {
          type: isPhone ? "PHONE" : "EMAIL",
          value: isPhone
            ? formattedPhone
            : identifier.toLowerCase(),
        },
      });

      if (!data.success) {
        setError(data.message);
        return;
      }
      setStep("OTP");

    } catch (err: any) {
      console.log(err)
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };


  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Enter valid OTP");
      return;
    }
  
    setError("");
    setLoading(true);
  
    try {
      const data = await request({
        method: "POST",
        url: "/member/verify-otp",
        data: {
          otp,
          email: !isPhone
            ? identifier.toLowerCase()
            : undefined,
          phone: isPhone
            ? identifier
            : undefined,
        },
      });
  
      if (!data.success) {
        setError(data.message);
        return;
      }

      console.log(data);
      login(data.token);

router.replace("/(onboarding)/complete-profile");

  
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-black`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={tw`flex-1 justify-center px-6`}
      >
       {step === "IDENTIFIER" ?  <View
          style={tw`bg-neutral-950 border border-neutral-900 rounded-3xl p-7`}
        >
          <Text style={tw`text-white text-4xl font-bold`}>
            Welcome Back
          </Text>

          <Text style={tw`text-neutral-500 mt-3 text-base leading-6`}>
            Login with your email address or mobile number.
          </Text>

          <Text style={tw`text-neutral-400 mt-8 mb-2`}>
            Email or Mobile Number
          </Text>

          <View style={tw`relative`}>
            {isPhone && identifier.length > 0 && (
              <Text
                style={[
                  tw`absolute text-neutral-400`,
                  {
                    left: 16,
                    top: 18,
                    zIndex: 1,
                  },
                ]}
              >
                +91
              </Text>
            )}

            <TextInput
              value={identifier}
              onChangeText={(text) => {
                if (/^[0-9]*$/.test(text)) {
                  setIdentifier(text.slice(0, 10));
                  setError("");
                  return;
                }

                setIdentifier(text.trim());
                setError("");
              }}
              placeholder="Enter email or mobile number"
              placeholderTextColor="#737373"
              keyboardType={
                isPhone ? "number-pad" : "email-address"
              }
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              style={[
                tw`bg-neutral-900 text-white rounded-2xl h-14 px-4 border`,
                error
                  ? tw`border-red-500`
                  : tw`border-neutral-800`,
                isPhone &&
                  identifier.length > 0 && {
                    paddingLeft: 56,
                  },
              ]}
            />
          </View>

          {isPhone && identifier.length > 0 && (
            <Text style={tw`text-neutral-500 text-xs mt-2`}>
              OTP will be sent to {formattedPhone}
            </Text>
          )}

          {!!error && (
            <Text style={tw`text-red-400 text-sm mt-2`}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={loading}
            onPress={handleContinue}
            style={[
              tw`rounded-2xl h-14 items-center justify-center mt-8`,
              loading
                ? tw`bg-lime-300`
                : tw`bg-lime-400`,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={tw`text-black font-bold text-lg`}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View> : <>
  <TouchableOpacity
    onPress={() => {
      setStep("IDENTIFIER");
      setOtp("");
      setError("");
    }}
  >
    <Text style={tw`text-neutral-400 text-xl`}>
      ←
    </Text>
  </TouchableOpacity>

  <Text
    style={tw`text-white text-4xl font-bold mt-6`}
  >
    Verify OTP
  </Text>

  <Text
    style={tw`text-neutral-500 mt-3`}
  >
    Enter the 6 digit OTP sent to your
    phone and email
  </Text>

  <TextInput
    value={otp}
    onChangeText={(text) => {
      setOtp(
        text.replace(/\D/g, "").slice(0, 6)
      );
      setError("");
    }}
    maxLength={6}
    keyboardType="number-pad"
    placeholder="000000"
    placeholderTextColor="#737373"
    style={[
      tw`mt-8 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-white text-3xl text-center`,
      {
        letterSpacing: 14,
      },
    ]}
  />

  <View
    style={tw`flex-row justify-between mt-4`}
  >
    <Text style={tw`text-neutral-500`}>
      Didn't receive OTP?
    </Text>

    <TouchableOpacity>
      <Text style={tw`text-lime-400`}>
        Resend
      </Text>
    </TouchableOpacity>
  </View>

  {!!error && (
    <Text style={tw`text-red-400 mt-3`}>
      {error}
    </Text>
  )}

  <TouchableOpacity
    disabled={loading}
    onPress={handleVerifyOtp}
    style={tw`mt-8 h-14 rounded-2xl bg-lime-400 justify-center items-center`}
  >
    {loading ? (
      <ActivityIndicator color="#000" />
    ) : (
      <Text style={tw`text-black font-bold text-lg`}>
        Verify OTP
      </Text>
    )}
  </TouchableOpacity>
</>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}