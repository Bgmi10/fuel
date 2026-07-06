import { Stack } from "expo-router";
import { View } from "react-native";
import { useState } from "react";

import MemberHeader from "./MemberHeader";
import MemberSidebar from "./MemberSidebar";
import { useAuth } from "../../src/contexts/AuthContext";

export default function AppLayout() {
  const { user: member } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {/* SIDEBAR (controlled) */}
      {sidebarOpen && (
        <MemberSidebar onClose={() => setSidebarOpen(false)} />
      )}

      {/* MAIN AREA */}
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <MemberHeader
          member={member}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}