import { View, Text, Pressable, Image } from "react-native";
import tw from "twrnc";

import { useRouter } from "expo-router";
import { Menu, Bell } from "lucide-react-native";

import { SafeAreaView } from "react-native-safe-area-context";

export default function MemberHeader({ member, onOpenSidebar }: any) {

  const router = useRouter();

  return (
    <SafeAreaView style={tw`border-b border-[#1f1f1f]`}>
      {/* HEADER */}
      <View style={tw`flex-row items-center justify-between px-4`}>
        {/* MENU */}
        <Pressable onPress={onOpenSidebar}>
          <Menu color="white" size={22} />
        </Pressable>

        {/* TITLE */}
        <Text style={tw`text-white font-semibold capitalize`}>
          Fuel Gym
        </Text>

        {/* RIGHT ICONS */}
        <View style={tw`flex-row items-center gap-3`}>
          <Pressable>
            <Bell color="#999" size={20} />
          </Pressable>

          <Pressable onPress={() => router.replace('/(app)/profile')}>
            <Image
              source={{
                uri:
                  member?.profileImage ||
                  `https://ui-avatars.com/api/?name=${member?.name}`,
              }}
              style={tw`w-8 h-8 rounded-full`}
            />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}