import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, ApiError, displayToKg, kgToDisplay } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { GymSession, TrainingDay } from "@/lib/types";

export default function StartSessionScreen() {
  const { trainingDayId: paramDayId } = useLocalSearchParams<{ trainingDayId?: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const unit = user?.weightUnit ?? "kg";

  const [days, setDays] = useState<TrainingDay[]>([]);
  const [trainingDayId, setTrainingDayId] = useState(paramDayId ?? "");
  const [bodyweightDisplay, setBodyweightDisplay] = useState(
    user?.bodyweightKg != null ? String(kgToDisplay(user.bodyweightKg, unit)) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [active, dayList] = await Promise.all([
          api<GymSession | null>("/sessions/active", { token }),
          api<TrainingDay[]>("/training-days", { token }),
        ]);
        if (active) {
          router.replace(`/session/${active.id}`);
          return;
        }
        setDays(dayList);
        setTrainingDayId((current) => current || dayList[0]?.id || "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, router]);

  async function start() {
    if (!token || !trainingDayId) {
      setError("Pick a Training Day");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const bodyweightKg = bodyweightDisplay
        ? displayToKg(Number(bodyweightDisplay) || 0, unit)
        : undefined;
      const session = await api<GymSession>("/sessions/start", {
        token,
        method: "POST",
        body: {
          trainingDayId,
          ...(bodyweightKg && bodyweightKg > 0 ? { bodyweightKg } : {}),
        },
      });
      router.replace(`/session/${session.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        try {
          const active = await api<GymSession | null>("/sessions/active", { token });
          if (active) {
            router.replace(`/session/${active.id}`);
            return;
          }
        } catch {
          // fall through
        }
      }
      setError(e instanceof ApiError ? e.message : "Could not start Session");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-ink items-center justify-center">
        <ActivityIndicator color="#3DDC97" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-ink px-4 pt-3" keyboardShouldPersistTaps="handled">
      <Text className="text-sand text-xl font-bold mb-2">Start Session</Text>
      <Text className="text-sand/60 mb-4">
        Choose a Training Day. Planned sets become your workout checklist.
      </Text>

      <Text className="text-sand mb-2 font-semibold">Training Day</Text>
      {days.map((day) => {
        const active = day.id === trainingDayId;
        return (
          <Pressable
            key={day.id}
            onPress={() => setTrainingDayId(day.id)}
            className={`border rounded-xl p-3 mb-2 ${
              active ? "border-leaf bg-moss/25" : "border-sand/15 bg-sand/5"
            }`}
          >
            <Text className="text-sand font-semibold">{day.name}</Text>
            <Text className="text-sand/50 text-xs mt-1">
              {day.exercises.length} exercises ·{" "}
              {day.exercises.map((e) => e.name).join(", ")}
            </Text>
          </Pressable>
        );
      })}

      <Text className="text-sand mt-4 mb-1 font-semibold">Bodyweight ({unit})</Text>
      <Text className="text-sand/50 text-xs mb-2">
        Used for bodyweight and assisted exercises. Snapshotted into this Session.
      </Text>
      <TextInput
        className="bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand mb-4"
        keyboardType="decimal-pad"
        value={bodyweightDisplay}
        onChangeText={setBodyweightDisplay}
        placeholder={`e.g. ${unit === "kg" ? "80" : "176"}`}
        placeholderTextColor="#F2EDE466"
      />

      {error ? <Text className="text-ember mb-3">{error}</Text> : null}

      <Pressable
        onPress={() => void start()}
        disabled={starting || days.length === 0}
        className="bg-moss rounded-xl py-3.5 items-center mb-10"
      >
        {starting ? (
          <ActivityIndicator color="#F2EDE4" />
        ) : (
          <Text className="text-sand font-semibold">Start workout</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
