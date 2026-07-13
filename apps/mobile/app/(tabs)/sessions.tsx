import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cacheSessions, getCachedSessions } from "@/lib/storage";

type Session = {
  id: string;
  performedAt: string;
  exercises: { name: string; volume: number }[];
};

export default function SessionsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    const cached = await getCachedSessions<Session[]>();
    if (cached) setSessions(cached);
    try {
      const data = await api<Session[]>("/sessions", { token });
      setSessions(data);
      await cacheSessions(data);
    } catch {
      // soft offline: keep cache
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View className="flex-1 bg-ink px-4 pt-2">
      <Pressable
        onPress={() => router.push("/session/new")}
        className="bg-moss rounded-xl py-3 items-center mb-4"
      >
        <Text className="text-sand font-semibold">Log Session</Text>
      </Pressable>

      {loading && sessions.length === 0 ? (
        <ActivityIndicator color="#3DDC97" className="mt-8" />
      ) : null}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loading ? (
            <Text className="text-sand/60 text-center mt-10">No Sessions yet.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const total = item.exercises.reduce((s, e) => s + (e.volume ?? 0), 0);
          return (
            <View className="border border-sand/15 rounded-2xl p-4 mb-3 bg-sand/5">
              <Text className="text-sand font-semibold">
                {new Date(item.performedAt).toLocaleString()}
              </Text>
              <Text className="text-sand/60 mt-1">
                {item.exercises.map((e) => e.name).join(" · ")}
              </Text>
              <Text className="text-leaf mt-2">Volume {Math.round(total)} kg</Text>
            </View>
          );
        }}
      />
    </View>
  );
}
