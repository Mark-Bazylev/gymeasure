import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { WeightUnit } from "@gymeasure/shared";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SettingsScreen() {
  const { user, token, setUser, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function setUnit(weightUnit: WeightUnit) {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api<typeof user>("/auth/settings", {
        token,
        method: "PATCH",
        body: { weightUnit },
      });
      if (updated) setUser(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-ink px-4 pt-4">
      <Text className="text-sand text-xl font-semibold">{user?.displayName}</Text>
      <Text className="text-sand/60 mt-1">{user?.email}</Text>
      <Text className="text-leaf mt-3 tracking-widest">Code {user?.inviteCode}</Text>

      <Text className="text-sand mt-8 mb-2 font-semibold">Weight display</Text>
      <Text className="text-sand/50 text-xs mb-3">
        Stored as kg. Charts and Compare always use kg.
      </Text>
      <View className="flex-row gap-3">
        {(["kg", "lbs"] as WeightUnit[]).map((unit) => {
          const active = user?.weightUnit === unit;
          return (
            <Pressable
              key={unit}
              disabled={saving}
              onPress={() => setUnit(unit)}
              className={`flex-1 py-3 rounded-xl items-center border ${
                active ? "bg-moss border-leaf" : "bg-sand/5 border-sand/20"
              }`}
            >
              <Text className="text-sand font-semibold uppercase">{unit}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text className="text-ember mt-3">{error}</Text> : null}

      <Text className="text-sand/40 text-xs mt-10">
        Exercise demos via ExerciseDB / AscendAPI when available.
      </Text>

      <Pressable
        onPress={() => void signOut()}
        className="mt-8 border border-ember/50 rounded-xl py-3 items-center"
      >
        <Text className="text-ember font-semibold">Sign out</Text>
      </Pressable>
    </View>
  );
}
