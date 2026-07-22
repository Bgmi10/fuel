import React from "react";

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
} from "react-native";

import tw from "twrnc";

import QRCode from "react-native-qrcode-svg";

import {
  X,
} from "lucide-react-native";

interface QrModalProps {
  visible: boolean;
  booking: any;
  onClose: () => void;
}

export default function QrModal({
  visible,
  booking,
  onClose,
}: QrModalProps) {
  if (!booking) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={tw`flex-1 bg-black/80 justify-center items-center px-5`}
      >
        <View
          style={tw`w-full bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden`}
        >
          {/* Header */}

          <View
            style={tw`flex-row justify-between items-center border-b border-neutral-800 p-5`}
          >
            <View>
              <Text
                style={tw`text-white text-xl font-bold`}
              >
                Session Pass
              </Text>

              <Text
                style={tw`text-neutral-400 mt-1`}
              >
                Present this QR during check-in
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              style={tw`w-10 h-10 rounded-full bg-neutral-800 items-center justify-center`}
            >
              <X
                size={18}
                color="#A3A3A3"
              />
            </TouchableOpacity>
          </View>

          {/* QR */}

          <View
            style={tw`items-center p-8`}
          >
            <View
              style={tw`bg-white rounded-3xl p-5`}
            >
              <QRCode
                value={booking.id}
                size={220}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}