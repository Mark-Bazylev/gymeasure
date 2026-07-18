import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { api, kgToDisplay } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { TrainingDay } from "@/lib/types";

export default function TrainingDayDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const unit = user?.weightUnit ?? "kg";
  const [day, setDay] = useState<TrainingDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    (async () => {
      try {
        const data = await api<TrainingDay>(`/training-days/${id}`, { token });
        setDay(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [token, id]);

  if (!day && !error) {
    return (
      <View className="flex-1 bg-ink items-center justify-center">
        <ActivityIndicator color="#3DDC97" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-ink px-4 pt-3">
      {error ? <Text className="text-ember">{error}</Text> : null}
      <Text className="text-sand text-2xl font-bold mb-4">{day?.name}</Text>
      {day?.exercises.map((ex) => (
        <View
          key={ex.id ?? ex.exerciseId}
          className="flex-row items-center gap-3 border border-sand/10 rounded-xl p-3 mb-2"
        >
          {ex.imageUrl ? (
            <Image source={{ uri: ex.imageUrl }} style={{ width: 64, height: 64, borderRadius: 8 }} />
          ) : (
            <View className="w-16 h-16 rounded-lg bg-sand/10 items-center justify-center">
              <Text className="text-sand/40 text-xs">No image</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-sand font-semibold">{ex.name}</Text>
            <Text className="text-sand/50 text-xs mt-1">
              {ex.plannedSets
                .map((s) => `${s.reps}×${kgToDisplay(s.weightKg, unit).toFixed(0)}${unit}`)
                .join(" · ")}
            </Text>
            {ex.attribution ? (
              <Text className="text-sand/30 text-[10px] mt-1" numberOfLines={1}>
                {ex.attribution}
              </Text>
            ) : null}
          </View>
        </View>
      ))}

      <Pressable
        onPress={() => router.push({ pathname: "/session/new", params: { trainingDayId: id } })}
        className="bg-moss rounded-xl py-3.5 items-center mt-6 mb-10"
      >
        <Text className="text-sand font-semibold">Start Session from this day</Text>
      </Pressable>
    </ScrollView>
  );
}
