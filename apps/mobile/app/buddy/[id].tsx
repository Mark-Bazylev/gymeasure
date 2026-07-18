import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Profile = {
  id: string;
  displayName: string;
  inviteCode: string;
  sessions: {
    id: string;
    performedAt: string;
    exercises: { name: string; exerciseId: string }[];
  }[];
};

export default function BuddyProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    (async () => {
      try {
        const data = await api<Profile>(`/buddies/${id}/profile`, { token });
        setProfile(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      }
    })();
  }, [token, id]);

  if (!profile && !error) {
    return (
      <View className="flex-1 bg-ink items-center justify-center">
        <ActivityIndicator color="#3DDC97" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ink px-4 pt-3">
      {error ? <Text className="text-ember">{error}</Text> : null}
      <Text className="text-sand text-2xl font-bold">{profile?.displayName}</Text>
      <Text className="text-sand/50 mt-1">Code {profile?.inviteCode}</Text>

      <Pressable
        onPress={() => router.push(`/compare/${id}`)}
        className="bg-moss rounded-xl py-3 items-center mt-4 mb-4"
      >
        <Text className="text-sand font-semibold">Compare Volume</Text>
      </Pressable>

      <Text className="text-leaf font-semibold mb-2">Recent Sessions</Text>
      <FlatList
        data={profile?.sessions ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text className="text-sand/50">No sessions yet.</Text>}
        renderItem={({ item }) => (
          <View className="border border-sand/10 rounded-xl p-3 mb-2">
            <Text className="text-sand">
              {new Date(item.performedAt).toLocaleString()}
            </Text>
            <Text className="text-sand/60 mt-1">
              {item.exercises.map((e) => e.name).join(" · ")}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
