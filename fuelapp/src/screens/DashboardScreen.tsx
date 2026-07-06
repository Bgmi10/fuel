import { ActivityIndicator, Text, View } from "react-native";
import tw from "twrnc";
import { useAuth } from "../contexts/AuthContext";

export default function DashboardScreen() {
    const { user } = useAuth();

    return (
      <View style={tw``}>
        <Text>
            kasld
        </Text>
      </View>
    );
  }