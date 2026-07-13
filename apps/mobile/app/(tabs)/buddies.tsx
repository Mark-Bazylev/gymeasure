import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Buddy = {
  id: string;
  displayName: string;
  inviteCode: string;
  email: string;
};

export default function BuddiesScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<Buddy[]>("/buddies", { token });
      setBuddies(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load buddies");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function linkBuddy() {
    if (!token) return;
    setLinking(true);
    setError(null);
    setMessage(null);
    try {
      const buddy = await api<Buddy>("/buddies/link", {
        token,
        method: "POST",
        body: { inviteCode: code },
      });
      setMessage(`Linked with ${buddy.displayName}`);
      setCode("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Link failed");
    } finally {
      setLinking(false);
    }
  }

  return (
    <View className="flex-1 bg-ink px-4 pt-2">
      <View className="border border-leaf/40 bg-leaf/10 rounded-2xl p-4 mb-4">
        <Text className="text-sand/70 text-sm">Your invite code</Text>
        <Text className="text-leaf text-3xl font-bold tracking-widest mt-1">
          {user?.inviteCode ?? "—"}
        </Text>
        <Text className="text-sand/50 mt-2 text-xs">
          Share this with your Gym Buddy so they can add you.
        </Text>
      </View>

      <Text className="text-sand mb-1">Add buddy by invite code</Text>
      <View className="flex-row gap-2 mb-3">
        <TextInput
          className="flex-1 bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand tracking-widest"
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
          placeholder="MARK7K"
          placeholderTextColor="#F2EDE466"
        />
        <Pressable
          onPress={linkBuddy}
          disabled={linking}
          className="bg-moss rounded-xl px-4 justify-center"
        >
          {linking ? (
            <ActivityIndicator color="#F2EDE4" />
          ) : (
            <Text className="text-sand font-semibold">Link</Text>
          )}
        </Pressable>
      </View>

      {error ? <Text className="text-ember mb-2">{error}</Text> : null}
      {message ? <Text className="text-leaf mb-2">{message}</Text> : null}

      {loading ? <ActivityIndicator color="#3DDC97" /> : null}

      <FlatList
        data={buddies}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loading ? (
            <Text className="text-sand/60 text-center mt-8">No Gym Buddies yet.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/buddy/${item.id}`)}
            className="border border-sand/15 rounded-2xl p-4 mb-3 bg-sand/5"
          >
            <Text className="text-sand text-lg font-semibold">{item.displayName}</Text>
            <Text className="text-sand/50 mt-1">{item.email}</Text>
            <Text className="text-leaf mt-2">View profile · Compare</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
