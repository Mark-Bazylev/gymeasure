import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { displayToKg } from "@gymeasure/shared";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type DayExercise = {
  catalogId: string | null;
  name: string;
  gifUrl: string | null;
  isCustom: boolean;
  sortOrder: number;
};

type SetDraft = { weight: string; reps: string };

export default function NewSessionScreen() {
  const { trainingDayId } = useLocalSearchParams<{ trainingDayId?: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const unit = user?.weightUnit ?? "kg";

  const [days, setDays] = useState<{ id: string; name: string; exercises: DayExercise[] }[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(trainingDayId ?? null);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetDraft[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const data = await api<typeof days>("/training-days", { token });
      setDays(data);
      if (!selectedDayId && data[0]) setSelectedDayId(data[0].id);
    })().catch((e) => setError(e instanceof Error ? e.message : "Failed to load days"));
  }, [token]);

  const selectedDay = useMemo(
    () => days.find((d) => d.id === selectedDayId) ?? null,
    [days, selectedDayId],
  );

  useEffect(() => {
    if (!selectedDay) return;
    const init: Record<string, SetDraft[]> = {};
    for (const ex of selectedDay.exercises) {
      init[ex.name] = [{ weight: "", reps: "" }];
    }
    setSetsByExercise(init);
  }, [selectedDay?.id]);

  function updateSet(exName: string, index: number, field: keyof SetDraft, value: string) {
    setSetsByExercise((prev) => {
      const list = [...(prev[exName] ?? [])];
      list[index] = { ...list[index]!, [field]: value };
      return { ...prev, [exName]: list };
    });
  }

  function addSet(exName: string) {
    setSetsByExercise((prev) => ({
      ...prev,
      [exName]: [...(prev[exName] ?? []), { weight: "", reps: "" }],
    }));
  }

  async function save() {
    if (!token || !selectedDay) return;
    setSaving(true);
    setError(null);
    try {
      const exercises = selectedDay.exercises.map((ex, i) => {
        const drafts = (setsByExercise[ex.name] ?? []).filter(
          (s) => s.weight.trim() && s.reps.trim(),
        );
        return {
          catalogId: ex.catalogId,
          name: ex.name,
          gifUrl: ex.gifUrl,
          isCustom: ex.isCustom,
          sortOrder: i,
          sets: drafts.map((s) => ({
            weightKg: displayToKg(Number(s.weight), unit),
            reps: Number(s.reps),
          })),
        };
      }).filter((ex) => ex.sets.length > 0);

      if (exercises.length === 0) {
        setError("Add at least one set");
        setSaving(false);
        return;
      }

      await api("/sessions", {
        token,
        method: "POST",
        body: {
          trainingDayId: selectedDay.id,
          exercises,
        },
      });
      router.replace("/(tabs)/sessions");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed — need network");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-ink px-4 pt-3" keyboardShouldPersistTaps="handled">
      <Text className="text-sand/70 mb-2">Training Day</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {days.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => setSelectedDayId(d.id)}
            className={`mr-2 px-4 py-2 rounded-full border ${
              selectedDayId === d.id ? "bg-moss border-leaf" : "border-sand/20"
            }`}
          >
            <Text className="text-sand">{d.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedDay?.exercises.map((ex) => (
        <View key={ex.name} className="mb-5 border border-sand/10 rounded-2xl p-3">
          <Text className="text-leaf font-semibold mb-2">{ex.name}</Text>
          {(setsByExercise[ex.name] ?? []).map((s, idx) => (
            <View key={idx} className="flex-row gap-2 mb-2">
              <TextInput
                className="flex-1 bg-sand/10 border border-sand/20 rounded-xl px-3 py-2 text-sand"
                keyboardType="decimal-pad"
                value={s.weight}
                onChangeText={(v) => updateSet(ex.name, idx, "weight", v)}
                placeholder={`Weight (${unit})`}
                placeholderTextColor="#F2EDE466"
              />
              <TextInput
                className="w-24 bg-sand/10 border border-sand/20 rounded-xl px-3 py-2 text-sand"
                keyboardType="number-pad"
                value={s.reps}
                onChangeText={(v) => updateSet(ex.name, idx, "reps", v)}
                placeholder="Reps"
                placeholderTextColor="#F2EDE466"
              />
            </View>
          ))}
          <Pressable onPress={() => addSet(ex.name)}>
            <Text className="text-sand/70">+ Add set</Text>
          </Pressable>
        </View>
      ))}

      {error ? <Text className="text-ember mb-2">{error}</Text> : null}

      <Pressable
        onPress={save}
        disabled={saving}
        className="bg-moss rounded-xl py-3.5 items-center mb-10"
      >
        {saving ? (
          <ActivityIndicator color="#F2EDE4" />
        ) : (
          <Text className="text-sand font-semibold">Save Session</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
