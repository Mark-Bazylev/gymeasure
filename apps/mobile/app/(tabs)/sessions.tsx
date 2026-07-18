import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cacheSessions, getCachedSessions } from "@/lib/storage";
import type { GymSession } from "@/lib/types";

export default function SessionsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [active, setActive] = useState<GymSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    const cached = await getCachedSessions<GymSession[]>();
    if (cached) setSessions(cached.filter((s) => s.status === "completed"));
    try {
      const [activeSession, list] = await Promise.all([
        api<GymSession | null>("/sessions/active", { token }),
        api<GymSession[]>("/sessions?status=completed", { token }),
      ]);
      setActive(activeSession);
      setSessions(list);
      await cacheSessions(list);
    } catch (e) {
      if (!cached) setError(e instanceof Error ? e.message : "Failed to load");
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
      {active ? (
        <Pressable
          onPress={() => router.push(`/session/${active.id}`)}
          className="bg-moss/30 border border-leaf rounded-xl py-3 px-4 mb-3"
        >
          <Text className="text-leaf font-semibold">Resume workout</Text>
          <Text className="text-sand/70 text-xs mt-1">
            {active.exercises.map((e) => e.name).join(" · ")}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push("/session/new")}
          className="bg-moss rounded-xl py-3 items-center mb-4"
        >
          <Text className="text-sand font-semibold">Start Session</Text>
        </Pressable>
      )}

      {loading && sessions.length === 0 ? (
        <ActivityIndicator color="#3DDC97" className="mt-8" />
      ) : null}
      {error ? <Text className="text-ember mb-2">{error}</Text> : null}

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loading ? (
            <Text className="text-sand/60 text-center mt-10">
              No completed Sessions yet. Start one from a Training Day.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/session/${item.id}`)}
            className="border border-sand/15 rounded-2xl p-4 mb-3 bg-sand/5"
          >
            <Text className="text-sand font-semibold">
              {new Date(item.performedAt).toLocaleString()}
            </Text>
            <Text className="text-sand/60 mt-1" numberOfLines={2}>
              {item.exercises.map((e) => e.name).join(" · ")}
            </Text>
            <Text className="text-leaf mt-2 text-xs">
              Volume {(item.totalVolume ?? 0).toFixed(0)} kg · tap to review or edit
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
