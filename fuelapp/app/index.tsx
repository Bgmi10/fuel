import { Redirect } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";
import SplashScreen from "../src/screens/SplashScreen";

export default function Index() {
  const { loading, authenticated } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (authenticated) {
    return <Redirect href="/complete-profile" />;
  }

  return <Redirect href="/login" />;
}
