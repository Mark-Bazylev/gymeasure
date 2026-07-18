import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Plus, SkipForward } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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
import type { GymSession, SessionExercise, SessionSet } from "@/lib/types";

function toPayload(session: GymSession) {
  return {
    notes: session.notes,
    bodyweightKg: session.bodyweightKg ?? undefined,
    exercises: session.exercises.map((ex, i) => ({
      exerciseId: ex.exerciseId,
      sortOrder: i,
      sets: ex.sets.map((s, si) => ({
        sortOrder: si,
        status: s.status,
        plannedReps: s.plannedReps,
        plannedWeightKg: s.plannedWeightKg,
        reps: s.reps,
        weightKg: s.weightKg,
        isExtra: s.isExtra,
      })),
    })),
  };
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const unit = user?.weightUnit ?? "kg";

  const [session, setSession] = useState<GymSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<GymSession | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const data = await api<GymSession>(`/sessions/${id}`, { token });
      setSession(data);
      latestRef.current = data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Session");
    }
  }, [token, id]);

  useEffect(() => {
    void load();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [load]);

  async function persistNow(next: GymSession) {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api<GymSession>(`/sessions/${next.id}`, {
        token,
        method: "PUT",
        body: toPayload(next),
      });
      setSession(updated);
      latestRef.current = updated;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function queuePersist(next: GymSession) {
    setSession(next);
    latestRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistNow(next);
    }, 450);
  }

  function updateSet(exIndex: number, setIndex: number, patch: Partial<SessionSet>, immediate = false) {
    if (!session) return;
    const exercises = session.exercises.map((ex, ei) => {
      if (ei !== exIndex) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, si) => (si === setIndex ? { ...s, ...patch } : s)),
      };
    });
    const next = { ...session, exercises };
    if (immediate) void persistNow(next);
    else queuePersist(next);
  }

  function confirmSet(exIndex: number, setIndex: number) {
    if (!session) return;
    const set = session.exercises[exIndex]!.sets[setIndex]!;
    updateSet(
      exIndex,
      setIndex,
      {
        status: "completed",
        reps: set.reps ?? set.plannedReps ?? 1,
        weightKg: set.weightKg ?? set.plannedWeightKg ?? 0,
      },
      true,
    );
  }

  function skipSet(exIndex: number, setIndex: number) {
    updateSet(exIndex, setIndex, { status: "skipped" }, true);
  }

  function addExtraSet(exIndex: number) {
    if (!session) return;
    const ex = session.exercises[exIndex]!;
    const last = ex.sets[ex.sets.length - 1];
    const nextSet: SessionSet = {
      sortOrder: ex.sets.length,
      status: "pending",
      plannedReps: null,
      plannedWeightKg: null,
      reps: last?.reps ?? last?.plannedReps ?? 8,
      weightKg: last?.weightKg ?? last?.plannedWeightKg ?? 0,
      isExtra: true,
    };
    const exercises = session.exercises.map((row, i) =>
      i === exIndex ? { ...row, sets: [...row.sets, nextSet] } : row,
    );
    void persistNow({ ...session, exercises });
  }

  async function complete(completeRemainingAsPlanned: boolean) {
    if (!token || !session) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      await persistNow(latestRef.current ?? session);
    }
    setSaving(true);
    setError(null);
    try {
      const current = latestRef.current ?? session;
      const updated = await api<GymSession>(`/sessions/${current.id}/complete`, {
        token,
        method: "POST",
        body: {
          completeRemainingAsPlanned,
          ...toPayload(current),
        },
      });
      setSession(updated);
      router.replace("/(tabs)/sessions");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not complete Session");
    } finally {
      setSaving(false);
    }
  }

  async function discard() {
    if (!token || !session) return;
    setSaving(true);
    try {
      await api(`/sessions/${session.id}`, { token, method: "DELETE" });
      router.replace("/(tabs)/sessions");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not discard");
      setSaving(false);
    }
  }

  if (!session && !error) {
    return (
      <View className="flex-1 bg-ink items-center justify-center">
        <ActivityIndicator color="#3DDC97" />
      </View>
    );
  }

  const editable = session?.status === "active" || session?.status === "completed";

  return (
    <ScrollView className="flex-1 bg-ink px-4 pt-3" keyboardShouldPersistTaps="handled">
      <Text className="text-sand text-xl font-bold">
        {session?.status === "active" ? "Active Session" : "Session"}
      </Text>
      <Text className="text-sand/50 text-xs mt-1 mb-4">
        {session ? new Date(session.performedAt).toLocaleString() : ""}
        {saving ? " · saving…" : ""}
      </Text>
      {error ? <Text className="text-ember mb-3">{error}</Text> : null}

      {session?.exercises.map((ex, exIndex) => (
        <ExerciseCard
          key={ex.id ?? `${ex.exerciseId}-${exIndex}`}
          ex={ex}
          unit={unit}
          editable={editable}
          onConfirm={(si) => confirmSet(exIndex, si)}
          onSkip={(si) => skipSet(exIndex, si)}
          onChange={(si, patch) => updateSet(exIndex, si, patch)}
          onAddExtra={() => addExtraSet(exIndex)}
        />
      ))}

      {session?.status === "active" ? (
        <View className="gap-3 mb-12 mt-4">
          <Pressable
            onPress={() => void complete(true)}
            disabled={saving}
            className="bg-moss rounded-xl py-3.5 items-center"
          >
            <Text className="text-sand font-semibold">Complete remaining as planned</Text>
          </Pressable>
          <Pressable
            onPress={() => void complete(false)}
            disabled={saving}
            className="border border-leaf rounded-xl py-3.5 items-center"
          >
            <Text className="text-leaf font-semibold">Finish (skip unfinished)</Text>
          </Pressable>
          <Pressable onPress={() => void discard()} disabled={saving} className="py-3 items-center">
            <Text className="text-ember">Discard workout</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mb-12 mt-4">
          <Text className="text-sand/60 text-center mb-3">
            Total volume {session?.totalVolume?.toFixed(0) ?? 0} kg
          </Text>
          <Pressable
            onPress={() => session && void persistNow(session)}
            disabled={saving}
            className="bg-moss rounded-xl py-3 items-center mb-3"
          >
            <Text className="text-sand font-semibold">Save corrections</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="border border-sand/30 rounded-xl py-3 items-center"
          >
            <Text className="text-sand">Done</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function ExerciseCard({
  ex,
  unit,
  editable,
  onConfirm,
  onSkip,
  onChange,
  onAddExtra,
}: {
  ex: SessionExercise;
  unit: "kg" | "lbs";
  editable: boolean;
  onConfirm: (setIndex: number) => void;
  onSkip: (setIndex: number) => void;
  onChange: (setIndex: number, patch: Partial<SessionSet>) => void;
  onAddExtra: () => void;
}) {
  return (
    <View className="border border-sand/15 rounded-2xl p-3 mb-3 bg-sand/5">
      <View className="flex-row items-center gap-3 mb-3">
        {ex.imageUrl ? (
          <Image source={{ uri: ex.imageUrl }} style={{ width: 48, height: 48, borderRadius: 8 }} />
        ) : (
          <View className="w-12 h-12 rounded-lg bg-sand/10" />
        )}
        <View className="flex-1">
          <Text className="text-sand font-semibold">{ex.name}</Text>
          <Text className="text-sand/40 text-xs">{ex.loadingType}</Text>
        </View>
      </View>

      {ex.sets.map((set, si) => {
        const done = set.status === "completed";
        const skipped = set.status === "skipped";
        return (
          <View
            key={set.id ?? si}
            className={`flex-row items-center gap-2 mb-2 rounded-xl px-2 py-2 ${
              done ? "bg-moss/20" : skipped ? "bg-sand/5 opacity-50" : "bg-ink/40"
            }`}
          >
            <Text className="text-sand/50 w-10 text-xs">
              {set.isExtra ? "Extra" : `Set ${si + 1}`}
            </Text>
            <TextInput
              editable={editable && !skipped}
              className="flex-1 bg-sand/10 border border-sand/20 rounded-lg px-2 py-1.5 text-sand text-sm"
              keyboardType="number-pad"
              value={String(set.reps ?? set.plannedReps ?? "")}
              onChangeText={(v) =>
                onChange(si, {
                  reps: Math.max(1, Number(v) || 1),
                  status: set.status === "completed" ? "completed" : "pending",
                })
              }
            />
            <TextInput
              editable={editable && !skipped}
              className="flex-1 bg-sand/10 border border-sand/20 rounded-lg px-2 py-1.5 text-sand text-sm"
              keyboardType="decimal-pad"
              value={String(kgToDisplay(set.weightKg ?? set.plannedWeightKg ?? 0, unit))}
              onChangeText={(v) =>
                onChange(si, {
                  weightKg: displayToKg(Number(v) || 0, unit),
                  status: set.status === "completed" ? "completed" : "pending",
                })
              }
            />
            {editable && !skipped ? (
              <Pressable onPress={() => onConfirm(si)} hitSlop={6} className="p-1">
                <Check color={done ? "#3DDC97" : "#F2EDE466"} size={20} />
              </Pressable>
            ) : null}
            {editable && set.status === "pending" && !set.isExtra ? (
              <Pressable onPress={() => onSkip(si)} hitSlop={6} className="p-1">
                <SkipForward color="#F2EDE466" size={18} />
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {editable ? (
        <Pressable onPress={onAddExtra} className="flex-row items-center gap-1 mt-1 py-1">
          <Plus color="#3DDC97" size={16} />
          <Text className="text-leaf text-sm">Extra set</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
