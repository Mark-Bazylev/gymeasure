import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import type { WeightUnit } from "@gymeasure/shared";
import { api, ApiError, displayToKg, kgToDisplay, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SettingsScreen() {
  const { user, token, setUser, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const unit = user?.weightUnit ?? "kg";
  const [bodyweightDisplay, setBodyweightDisplay] = useState(
    user?.bodyweightKg != null ? String(kgToDisplay(user.bodyweightKg, unit)) : "",
  );

  async function patchSettings(body: Record<string, unknown>) {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api<User>("/auth/settings", {
        token,
        method: "PATCH",
        body,
      });
      setUser(updated);
      if (updated.bodyweightKg != null) {
        setBodyweightDisplay(String(kgToDisplay(updated.bodyweightKg, updated.weightUnit)));
      }
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
        {(["kg", "lbs"] as WeightUnit[]).map((nextUnit) => {
          const active = user?.weightUnit === nextUnit;
          return (
            <Pressable
              key={nextUnit}
              disabled={saving}
              onPress={() => void patchSettings({ weightUnit: nextUnit })}
              className={`flex-1 py-3 rounded-xl items-center border ${
                active ? "bg-moss border-leaf" : "bg-sand/5 border-sand/20"
              }`}
            >
              <Text className="text-sand font-semibold uppercase">{nextUnit}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-sand mt-8 mb-2 font-semibold">Bodyweight ({unit})</Text>
      <Text className="text-sand/50 text-xs mb-3">
        Used for bodyweight and assisted Exercises. Snapshotted into each Session.
      </Text>
      <View className="flex-row gap-2">
        <TextInput
          className="flex-1 bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand"
          keyboardType="decimal-pad"
          value={bodyweightDisplay}
          onChangeText={setBodyweightDisplay}
          placeholderTextColor="#F2EDE466"
          placeholder={unit === "kg" ? "80" : "176"}
        />
        <Pressable
          disabled={saving}
          onPress={() => {
            const value = Number(bodyweightDisplay);
            if (!value || value <= 0) {
              setError("Enter a valid bodyweight");
              return;
            }
            void patchSettings({ bodyweightKg: displayToKg(value, unit) });
          }}
          className="bg-moss rounded-xl px-4 items-center justify-center"
        >
          {saving ? (
            <ActivityIndicator color="#F2EDE4" />
          ) : (
            <Text className="text-sand font-semibold">Save</Text>
          )}
        </Pressable>
      </View>

      {error ? <Text className="text-ember mt-3">{error}</Text> : null}

      <Text className="text-sand/40 text-xs mt-10">
        Exercise images are hosted by Gymeasure from the wger open catalog (CC licenses with
        attribution).
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
