import { View, Text, Pressable, Image } from "react-native";
import { useRouter, usePathname } from "expo-router";
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  ClipboardCheck,
  TrendingUp,
  CreditCard,
  CalendarPlus2,
  Users,
  X,
  LogOut,
} from "lucide-react-native";
import { useAuth } from "../../src/contexts/AuthContext"; // adjust path

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workouts", href: "/workout-plans", icon: Dumbbell },
  { label: "Diet Plans", href: "/diet-plans", icon: Apple },
  { label: "Food Tracker", href: "/food-tracker", icon: ClipboardCheck },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Membership", href: "/membership", icon: CreditCard },
  { label: "Book Session", href: "/slot", icon: CalendarPlus2 },
  { label: "Referrals", href: "/referrals", icon: Users },
];

type Props = {
  onClose: () => void;
};

export default function MemberSidebar({ onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <View style={{ position: "absolute", inset: 0, zIndex: 100 }}>
      {/* BACKDROP */}
      <Pressable
        onPress={onClose}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      />

      {/* SIDEBAR */}
      <View
        style={{
          width: 280,
          height: "100%",
          backgroundColor: "#0a0a0a",
          paddingTop: 50,
          paddingHorizontal: 12,
          borderRightWidth: 1,
          borderRightColor: "#1f1f1f",

          // 👇 Important
          justifyContent: "space-between",
        }}
      >
        {/* TOP CONTENT */}
        <View>
          {/* HEADER */}
<View
  style={{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  }}
>
  <Image
    source={require("../../assets/splash-icon.png")} // adjust path
    style={{
      width: 80,
      height: 40,
      resizeMode: "contain",
    }}
  />

  <Pressable
    onPress={onClose}
    style={{
      padding: 6,
    }}
  >
    <X color="white" size={22} />
  </Pressable>
</View>

          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Pressable
                key={item.href}
                onPress={() => {
                  router.push(item.href as any);
                  onClose();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  marginBottom: 8,
                  backgroundColor: active ? "#a3e635" : "transparent",
                }}
              >
                <Icon size={20} color={active ? "#000" : "#aaa"} />

                <Text
                  style={{
                    marginLeft: 12,
                    color: active ? "#000" : "#ccc",
                    fontWeight: active ? "600" : "400",
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* LOGOUT BUTTON */}
        <Pressable
  onPress={logout}
  style={({ pressed }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 30,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  })}
>
  <LogOut size={18} color="#f87171" />
  <Text
    style={{
      color: "#f87171",
      fontSize: 14,
      fontWeight: "600",
    }}
  >
    Logout
  </Text>
</Pressable>
      </View>
    </View>
  );
}