import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type CatalogExercise = {
  catalogId: string;
  name: string;
  gifUrl: string | null;
  isCustom: boolean;
};

type DraftExercise = CatalogExercise & { sortOrder: number };

export default function NewTrainingDayScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogExercise[]>([]);
  const [selected, setSelected] = useState<DraftExercise[]>([]);
  const [customName, setCustomName] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!token || !query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const data = await api<CatalogExercise[]>(
        `/exercises/search?q=${encodeURIComponent(query.trim())}`,
        { token },
      );
      setResults(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function addExercise(ex: CatalogExercise) {
    setSelected((prev) => {
      if (prev.some((p) => p.name === ex.name && p.catalogId === ex.catalogId)) return prev;
      return [...prev, { ...ex, sortOrder: prev.length }];
    });
  }

  function addCustom() {
    const n = customName.trim();
    if (!n) return;
    addExercise({ catalogId: "", name: n, gifUrl: null, isCustom: true });
    setCustomName("");
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await api("/training-days", {
        token,
        method: "POST",
        body: {
          name: name.trim(),
          exercises: selected.map((ex, i) => ({
            catalogId: ex.catalogId || null,
            name: ex.name,
            gifUrl: ex.gifUrl,
            isCustom: ex.isCustom,
            sortOrder: i,
          })),
        },
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed — need network");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-ink px-4 pt-3" keyboardShouldPersistTaps="handled">
      <Text className="text-sand mb-1">Day name</Text>
      <TextInput
        className="bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand mb-4"
        value={name}
        onChangeText={setName}
        placeholder="Push Day"
        placeholderTextColor="#F2EDE466"
      />

      <Text className="text-sand mb-1">Search exercises</Text>
      <View className="flex-row gap-2 mb-2">
        <TextInput
          className="flex-1 bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand"
          value={query}
          onChangeText={setQuery}
          placeholder="bench press"
          placeholderTextColor="#F2EDE466"
          autoCapitalize="none"
        />
        <Pressable onPress={search} className="bg-moss rounded-xl px-4 justify-center">
          {searching ? <ActivityIndicator color="#fff" /> : <Text className="text-sand">Search</Text>}
        </Pressable>
      </View>

      {results.map((ex) => (
        <Pressable
          key={`${ex.catalogId}-${ex.name}`}
          onPress={() => addExercise(ex)}
          className="flex-row items-center gap-3 border border-sand/10 rounded-xl p-2 mb-2"
        >
          {ex.gifUrl ? (
            <Image source={{ uri: ex.gifUrl }} style={{ width: 56, height: 56, borderRadius: 8 }} />
          ) : (
            <View className="w-14 h-14 rounded-lg bg-sand/10" />
          )}
          <Text className="text-sand flex-1">{ex.name}</Text>
          <Text className="text-leaf">Add</Text>
        </Pressable>
      ))}

      <Text className="text-sand mt-4 mb-1">Custom exercise</Text>
      <View className="flex-row gap-2 mb-4">
        <TextInput
          className="flex-1 bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand"
          value={customName}
          onChangeText={setCustomName}
          placeholder="Gym machine name"
          placeholderTextColor="#F2EDE466"
        />
        <Pressable onPress={addCustom} className="bg-sand/20 rounded-xl px-4 justify-center">
          <Text className="text-sand">Add</Text>
        </Pressable>
      </View>

      <Text className="text-leaf font-semibold mb-2">On this day ({selected.length})</Text>
      {selected.map((ex) => (
        <View key={`${ex.sortOrder}-${ex.name}`} className="flex-row items-center gap-3 mb-2">
          {ex.gifUrl ? (
            <Image source={{ uri: ex.gifUrl }} style={{ width: 40, height: 40, borderRadius: 6 }} />
          ) : null}
          <Text className="text-sand flex-1">{ex.name}</Text>
          <Pressable
            onPress={() => setSelected((prev) => prev.filter((p) => p !== ex))}
          >
            <Text className="text-ember">Remove</Text>
          </Pressable>
        </View>
      ))}

      {error ? <Text className="text-ember my-2">{error}</Text> : null}

      <Pressable
        onPress={save}
        disabled={saving || !name.trim() || selected.length === 0}
        className="bg-moss rounded-xl py-3.5 items-center my-6 opacity-100"
      >
        {saving ? (
          <ActivityIndicator color="#F2EDE4" />
        ) : (
          <Text className="text-sand font-semibold">Save Training Day</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
