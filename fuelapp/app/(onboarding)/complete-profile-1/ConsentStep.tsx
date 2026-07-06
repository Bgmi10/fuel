import React, { useMemo, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import tw from "twrnc";
import SignatureScreen from "react-native-signature-canvas";


type Props = {
    assessment: any;
    setAssessment: any;
    onBack: () => void;
    onSubmit: (signature: string) => void;

    onSignatureCaptured:(signature:string)=>Promise<void>;
  };

function ConsentCard({
  checked,
  text,
  onPress,
}: {
  checked: boolean;
  text: string;
  onPress: () => void;
}) {

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 flex-row mb-5`}
    >
      <View
        style={[
          tw`w-6 h-6 rounded-md border mr-4 justify-center items-center`,
          checked
            ? tw`bg-lime-400 border-lime-400`
            : tw`border-neutral-600`,
        ]}
      >
        {checked && (
          <Text style={tw`text-black font-bold`}>
            ✓
          </Text>
        )}
      </View>

      <Text
        style={tw`text-neutral-300 flex-1 leading-6`}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

export default function ConsentStep({
  assessment,
  setAssessment,
  onBack,
  onSubmit,
  onSignatureCaptured
}: Props) {
  const updateConsent = (
    key: string,
    value: any
  ) => {
    setAssessment((prev: any) => ({
      ...prev,
      consent: {
        ...prev.consent,
        [key]: value,
      },
    }));
  };
  const [pendingSubmit, setPendingSubmit] =
  useState(false);
  const sigRef = useRef<any>(null);
  const [scrollEnabled, setScrollEnabled] =
  useState(true);

  const [hasSigned, setHasSigned] = useState(false);

  const isComplete = useMemo(() => {
    return (
      assessment.consent.declarationAccepted &&
      assessment.consent.exerciseRiskAccepted &&
      hasSigned
    );
  }, [
    assessment.consent.declarationAccepted,
    assessment.consent.exerciseRiskAccepted,
    hasSigned,
  ]);

  return (
    <ScrollView
    scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={tw`px-5 pt-8 pb-12`}
    >
      {/* Header */}

      <View style={tw`items-center mb-8`}>
        <View
          style={tw`bg-lime-400/10 border border-lime-400/30 rounded-full px-5 py-2 mb-5`}
        >
          <Text
            style={tw`text-lime-400 font-semibold`}
          >
            STEP 3 OF 3
          </Text>
        </View>

        <Text
          style={tw`text-white text-3xl font-bold text-center`}
        >
          Consent &
        </Text>

        <Text
          style={tw`text-lime-400 text-3xl font-bold text-center`}
        >
          Declaration
        </Text>

        <Text
          style={tw`text-neutral-500 text-center mt-5 leading-6`}
        >
          Please review the declarations
          carefully before completing your
          profile.
        </Text>
      </View>

      <View
        style={tw`bg-neutral-950 border border-neutral-900 rounded-3xl p-5`}
      >
        <ConsentCard
          checked={
            assessment.consent
              .declarationAccepted
          }
          onPress={() =>
            updateConsent(
              "declarationAccepted",
              !assessment.consent
                .declarationAccepted
            )
          }
          text="I declare that all information provided in this assessment is true and accurate to the best of my knowledge."
        />

        <ConsentCard
          checked={
            assessment.consent
              .exerciseRiskAccepted
          }
          onPress={() =>
            updateConsent(
              "exerciseRiskAccepted",
              !assessment.consent
                .exerciseRiskAccepted
            )
          }
          text="I understand that participating in physical exercise carries inherent risks and I voluntarily accept responsibility for my participation."
        />

<View
  style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-5`}
>
  <View style={tw`flex-row justify-between items-center mb-4`}>
    <View>
      <Text
        style={tw`text-white text-base font-semibold`}
      >
        Digital Signature
      </Text>

      <Text
        style={tw`text-neutral-500 text-sm mt-1`}
      >
        Please sign below.
      </Text>
    </View>

    <TouchableOpacity
     onPress={() => {
        sigRef.current?.clearSignature();
       
        setHasSigned(false);
      }}
    >
      <Text style={tw`text-red-400`}>
        Clear
      </Text>
    </TouchableOpacity>
  </View>

  {assessment.consent.signature && (
  <View
    style={tw`bg-lime-400/10 border border-lime-400/30 rounded-2xl p-4 mb-6`}
  >
    <Text
      style={tw`text-lime-400 font-semibold`}
    >
      ✓ Signature Captured
    </Text>
  </View>
)}

  <View
    style={tw`rounded-3xl overflow-hidden bg-white h-60`}
  >
    <SignatureScreen
onBegin={() => {
    setScrollEnabled(false);
    setHasSigned(true);
  }}  onEnd={() => {
    setScrollEnabled(true);
    setHasSigned(true);
  }}
      ref={sigRef}
      onOK={async (signature) => {
        try {
          const url: any = await onSignatureCaptured(signature);
      
          setAssessment((prev: any) => ({
            ...prev,
            consent: {
              ...prev.consent,
              signature: url,
            },
          }));
      
          await onSubmit(url);
        } catch (e) {
          console.log(e);
        }
      }}
    
      autoClear={false}
      webStyle={`
        .m-signature-pad--footer{
            display:none;
            margin:0;
        }

        body,html{
            width:100%;
            height:100%;
        }

        .m-signature-pad{
            box-shadow:none;
            border:none;
        }
      `}
    />
  </View>
</View>

        {!isComplete && (
          <View
            style={tw`bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6`}
          >
            <Text
              style={tw`text-red-400 text-center`}
            >
              Please complete all consent
              requirements.
            </Text>
          </View>
        )}

        <View style={tw`flex-row`}>
          <TouchableOpacity
            onPress={onBack}
            style={tw`flex-1 h-14 rounded-2xl border border-neutral-700 justify-center items-center mr-2`}
          >
            <Text
              style={tw`text-white font-bold text-lg`}
            >
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!isComplete}
            
            onPress={() => {
            
              
                sigRef.current?.readSignature();
              }}
            style={[
              tw`flex-1 h-14 rounded-2xl justify-center items-center ml-2`,
              isComplete
                ? tw`bg-lime-400`
                : tw`bg-lime-300`,
            ]}
          >
            <Text
              style={tw`text-black font-bold text-lg`}
            >
              Complete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}