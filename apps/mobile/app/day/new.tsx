import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Check, Minus, Plus, Search, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, ApiError, displayToKg, kgToDisplay } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { CatalogExercise, DayExercise, PlannedSet } from "@/lib/types";

function defaultSets(): PlannedSet[] {
  return [
    { sortOrder: 0, reps: 8, weightKg: 0 },
    { sortOrder: 1, reps: 8, weightKg: 0 },
    { sortOrder: 2, reps: 8, weightKg: 0 },
  ];
}

export default function NewTrainingDayScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const unit = user?.weightUnit ?? "kg";

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selected, setSelected] = useState<DayExercise[]>([]);
  const [editing, setEditing] = useState<DayExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadFilters = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ bodyParts: string[]; equipment: string[] }>("/exercises/filters", {
        token,
      });
      setBodyParts(data.bodyParts.filter(Boolean) as string[]);
      setEquipmentOptions(data.equipment.filter(Boolean) as string[]);
    } catch {
      // optional
    }
  }, [token]);

  const loadCatalog = useCallback(async () => {
    if (!token) return;
    setLoadingCatalog(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (bodyPart) params.set("bodyPart", bodyPart);
      if (equipment) params.set("equipment", equipment);
      params.set("limit", "60");
      const data = await api<{ total: number; items: CatalogExercise[] }>(
        `/exercises?${params.toString()}`,
        { token },
      );
      setCatalog(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog");
    } finally {
      setLoadingCatalog(false);
    }
  }, [token, query, bodyPart, equipment]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    const t = setTimeout(() => void loadCatalog(), 250);
    return () => clearTimeout(t);
  }, [loadCatalog]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.exerciseId)), [selected]);

  function addExercise(ex: CatalogExercise) {
    if (selectedIds.has(ex.id)) return;
    const draft: DayExercise = {
      exerciseId: ex.id,
      sortOrder: selected.length,
      name: ex.name,
      imageUrl: ex.imageUrl,
      loadingType: ex.loadingType,
      bodyPart: ex.bodyPart,
      equipment: ex.equipment,
      attribution: ex.attribution,
      plannedSets: defaultSets(),
    };
    setSelected((prev) => [...prev, draft]);
    setEditing(draft);
  }

  function updateEditingSets(sets: PlannedSet[]) {
    if (!editing) return;
    const next = { ...editing, plannedSets: sets };
    setEditing(next);
    setSelected((prev) => prev.map((e) => (e.exerciseId === next.exerciseId ? next : e)));
  }

  function removeSelected(exerciseId: string) {
    setSelected((prev) =>
      prev.filter((e) => e.exerciseId !== exerciseId).map((e, i) => ({ ...e, sortOrder: i })),
    );
    if (editing?.exerciseId === exerciseId) setEditing(null);
  }

  async function save() {
    if (!token) return;
    setError(null);
    if (!name.trim()) {
      setError("Name your Training Day");
      return;
    }
    if (selected.length === 0) {
      setError("Add at least one Exercise from the catalog");
      return;
    }
    for (const ex of selected) {
      if (ex.plannedSets.length === 0 || ex.plannedSets.some((s) => s.reps < 1)) {
        setError(`Set reps for ${ex.name}`);
        return;
      }
    }
    setSaving(true);
    try {
      await api("/training-days", {
        token,
        method: "POST",
        body: {
          name: name.trim(),
          exercises: selected.map((ex, i) => ({
            exerciseId: ex.exerciseId,
            sortOrder: i,
            plannedSets: ex.plannedSets.map((s, si) => ({
              sortOrder: si,
              reps: s.reps,
              weightKg: s.weightKg,
            })),
          })),
        },
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function weightLabel(loadingType: string) {
    if (loadingType === "bodyweight") return `Added ${unit}`;
    if (loadingType === "assisted") return `Assist ${unit}`;
    return `Weight ${unit}`;
  }

  return (
    <View className="flex-1 bg-ink">
      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <Text className="text-sand mb-1 mt-2">Training Day name</Text>
        <TextInput
          className="bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand mb-4"
          value={name}
          onChangeText={setName}
          placeholder="Push A"
          placeholderTextColor="#F2EDE466"
        />

        <Text className="text-sand font-semibold mb-2">Exercise catalog</Text>
        <View className="flex-row items-center bg-sand/10 border border-sand/20 rounded-xl px-3 mb-3">
          <Search color="#F2EDE466" size={18} />
          <TextInput
            className="flex-1 px-2 py-3 text-sand"
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            placeholderTextColor="#F2EDE466"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <Pressable
            onPress={() => setBodyPart("")}
            className={`mr-2 px-3 py-1.5 rounded-full border ${
              !bodyPart ? "bg-moss border-leaf" : "border-sand/20"
            }`}
          >
            <Text className="text-sand text-xs">All muscles</Text>
          </Pressable>
          {bodyParts.slice(0, 20).map((bp) => (
            <Pressable
              key={bp}
              onPress={() => setBodyPart(bp === bodyPart ? "" : bp)}
              className={`mr-2 px-3 py-1.5 rounded-full border ${
                bodyPart === bp ? "bg-moss border-leaf" : "border-sand/20"
              }`}
            >
              <Text className="text-sand text-xs">{bp}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <Pressable
            onPress={() => setEquipment("")}
            className={`mr-2 px-3 py-1.5 rounded-full border ${
              !equipment ? "bg-moss border-leaf" : "border-sand/20"
            }`}
          >
            <Text className="text-sand text-xs">All equipment</Text>
          </Pressable>
          {equipmentOptions.slice(0, 20).map((eq) => (
            <Pressable
              key={eq}
              onPress={() => setEquipment(eq === equipment ? "" : eq)}
              className={`mr-2 px-3 py-1.5 rounded-full border ${
                equipment === eq ? "bg-moss border-leaf" : "border-sand/20"
              }`}
            >
              <Text className="text-sand text-xs" numberOfLines={1}>
                {eq}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loadingCatalog ? <ActivityIndicator color="#3DDC97" className="my-4" /> : null}
        <Text className="text-sand/50 text-xs mb-2">{total} exercises</Text>

        {catalog.map((ex) => {
          const added = selectedIds.has(ex.id);
          return (
            <Pressable
              key={ex.id}
              onPress={() => (added ? setEditing(selected.find((s) => s.exerciseId === ex.id)!) : addExercise(ex))}
              className={`flex-row items-center gap-3 border rounded-xl p-3 mb-2 ${
                added ? "border-leaf bg-moss/20" : "border-sand/10 bg-sand/5"
              }`}
            >
              {ex.imageUrl ? (
                <Image source={{ uri: ex.imageUrl }} style={{ width: 56, height: 56, borderRadius: 8 }} />
              ) : (
                <View className="w-14 h-14 rounded-lg bg-sand/10" />
              )}
              <View className="flex-1">
                <Text className="text-sand font-semibold">{ex.name}</Text>
                <Text className="text-sand/50 text-xs mt-0.5">
                  {[ex.bodyPart, ex.equipment].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {added ? <Check color="#3DDC97" size={20} /> : <Plus color="#F2EDE4" size={20} />}
            </Pressable>
          );
        })}

        <Text className="text-sand font-semibold mt-6 mb-2">Selected ({selected.length})</Text>
        {selected.map((ex) => (
          <Pressable
            key={ex.exerciseId}
            onPress={() => setEditing(ex)}
            className="border border-sand/15 rounded-xl p-3 mb-2 bg-sand/5"
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-2">
                <Text className="text-sand font-semibold">{ex.name}</Text>
                <Text className="text-leaf text-xs mt-1">
                  {ex.plannedSets.length} sets ·{" "}
                  {ex.plannedSets.map((s) => `${s.reps}×${kgToDisplay(s.weightKg, unit).toFixed(0)}`).join(", ")}{" "}
                  {unit}
                </Text>
              </View>
              <Pressable onPress={() => removeSelected(ex.exerciseId)} hitSlop={8}>
                <X color="#E85D4C" size={18} />
              </Pressable>
            </View>
          </Pressable>
        ))}

        {error ? <Text className="text-ember my-3">{error}</Text> : null}

        <Pressable
          onPress={() => void save()}
          disabled={saving}
          className="bg-moss rounded-xl py-3.5 items-center mt-2 mb-10"
        >
          {saving ? (
            <ActivityIndicator color="#F2EDE4" />
          ) : (
            <Text className="text-sand font-semibold">Save Training Day</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-ink border-t border-sand/20 rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sand text-lg font-bold flex-1 pr-3">{editing?.name}</Text>
              <Pressable onPress={() => setEditing(null)}>
                <X color="#F2EDE4" size={22} />
              </Pressable>
            </View>
            {editing?.imageUrl ? (
              <Image
                source={{ uri: editing.imageUrl }}
                style={{ width: "100%", height: 160, borderRadius: 12, marginBottom: 12 }}
                contentFit="contain"
              />
            ) : null}
            <Text className="text-sand/50 text-xs mb-3">
              {editing?.loadingType} · {weightLabel(editing?.loadingType ?? "external")}
            </Text>

            <ScrollView>
              {editing?.plannedSets.map((set, idx) => (
                <View key={idx} className="flex-row items-center gap-2 mb-3">
                  <Text className="text-sand/60 w-12">Set {idx + 1}</Text>
                  <TextInput
                    className="flex-1 bg-sand/10 border border-sand/20 rounded-xl px-3 py-2 text-sand"
                    keyboardType="number-pad"
                    value={String(set.reps)}
                    onChangeText={(v) => {
                      const reps = Math.max(1, Number(v) || 1);
                      const next = editing.plannedSets.map((s, i) =>
                        i === idx ? { ...s, reps } : s,
                      );
                      updateEditingSets(next);
                    }}
                    placeholder="Reps"
                    placeholderTextColor="#F2EDE466"
                  />
                  <TextInput
                    className="flex-1 bg-sand/10 border border-sand/20 rounded-xl px-3 py-2 text-sand"
                    keyboardType="decimal-pad"
                    value={String(kgToDisplay(set.weightKg, unit))}
                    onChangeText={(v) => {
                      const display = Number(v) || 0;
                      const weightKg = displayToKg(display, unit);
                      const next = editing.plannedSets.map((s, i) =>
                        i === idx ? { ...s, weightKg } : s,
                      );
                      updateEditingSets(next);
                    }}
                    placeholder={unit}
                    placeholderTextColor="#F2EDE466"
                  />
                  <Pressable
                    onPress={() => {
                      if (editing.plannedSets.length <= 1) return;
                      updateEditingSets(editing.plannedSets.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })));
                    }}
                  >
                    <Minus color="#E85D4C" size={18} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={() => {
                  if (!editing) return;
                  const last = editing.plannedSets[editing.plannedSets.length - 1];
                  updateEditingSets([
                    ...editing.plannedSets,
                    {
                      sortOrder: editing.plannedSets.length,
                      reps: last?.reps ?? 8,
                      weightKg: last?.weightKg ?? 0,
                    },
                  ]);
                }}
                className="flex-row items-center justify-center gap-2 py-3 mb-4"
              >
                <Plus color="#3DDC97" size={18} />
                <Text className="text-leaf font-semibold">Add set</Text>
              </Pressable>
            </ScrollView>

            <Pressable
              onPress={() => setEditing(null)}
              className="bg-moss rounded-xl py-3 items-center"
            >
              <Text className="text-sand font-semibold">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
