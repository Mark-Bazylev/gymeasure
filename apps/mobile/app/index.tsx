import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <ActivityIndicator color="#3DDC97" size="large" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)/days" : "/(auth)/login"} />;
}
