import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cacheTrainingDays, getCachedTrainingDays } from "@/lib/storage";

type DayExercise = {
  id: string;
  name: string;
  gifUrl: string | null;
  catalogId: string | null;
};

type TrainingDay = {
  id: string;
  name: string;
  exercises: DayExercise[];
};

export default function DaysScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState<TrainingDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    const cached = await getCachedTrainingDays<TrainingDay[]>();
    if (cached) setDays(cached);
    try {
      const data = await api<TrainingDay[]>("/training-days", { token });
      setDays(data);
      await cacheTrainingDays(data);
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
      <Pressable
        onPress={() => router.push("/day/new")}
        className="bg-moss rounded-xl py-3 items-center mb-4"
      >
        <Text className="text-sand font-semibold">Build Training Day</Text>
      </Pressable>

      {loading && days.length === 0 ? (
        <ActivityIndicator color="#3DDC97" className="mt-8" />
      ) : null}
      {error ? <Text className="text-ember mb-2">{error}</Text> : null}

      <FlatList
        data={days}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loading ? (
            <Text className="text-sand/60 text-center mt-10">
              No Training Days yet. Build one to start logging.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/day/${item.id}`)}
            className="border border-sand/15 rounded-2xl p-4 mb-3 bg-sand/5"
          >
            <Text className="text-sand text-lg font-semibold">{item.name}</Text>
            <Text className="text-sand/60 mt-1">
              {item.exercises.length} exercise{item.exercises.length === 1 ? "" : "s"}
            </Text>
            <Text className="text-leaf mt-2" numberOfLines={1}>
              {item.exercises.map((e) => e.name).join(" · ")}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
