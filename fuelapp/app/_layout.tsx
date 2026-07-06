import { Stack } from "expo-router";
import { View } from "react-native";
import { AuthProvider } from "../src/contexts/AuthContext";

export default function Layout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: "#020617" }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#020617",
            },
          }}
        />
      </View>
    </AuthProvider>
  );    
}