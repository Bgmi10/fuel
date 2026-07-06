import { ActivityIndicator, View } from "react-native";
import tw from "twrnc";

export default function SplashScreen() {
    return (
      <View style={tw`flex-1 justify-center items-center bg-black`}>
        <ActivityIndicator size="large" color="#a3e635" />
      </View>
    );
  }