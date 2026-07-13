import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type CompareResponse = {
  me: { displayName?: string; points: { date: string; volume: number }[] };
  buddy: { displayName?: string; points: { date: string; volume: number }[] };
};

export default function CompareScreen() {
  const { buddyId } = useLocalSearchParams<{ buddyId: string }>();
  const { token } = useAuth();
  const [name, setName] = useState("bench press");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token || !buddyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<CompareResponse>(
        `/buddies/${buddyId}/compare?name=${encodeURIComponent(name.trim())}`,
        { token },
      );
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setLoading(false);
    }
  }

  const myData = (data?.me.points ?? []).map((p) => ({
    value: Math.round(p.volume),
    label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));
  const buddyData = (data?.buddy.points ?? []).map((p) => ({
    value: Math.round(p.volume),
  }));

  return (
    <ScrollView className="flex-1 bg-ink px-4 pt-3">
      <Text className="text-sand/70 mb-2">Same Exercise — your Volume vs theirs (kg)</Text>
      <TextInput
        className="bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand mb-3"
        value={name}
        onChangeText={setName}
        placeholder="Exercise name"
        placeholderTextColor="#F2EDE466"
        autoCapitalize="none"
      />
      <Pressable onPress={load} className="bg-moss rounded-xl py-3 items-center mb-4">
        <Text className="text-sand font-semibold">Compare</Text>
      </Pressable>

      {loading ? <ActivityIndicator color="#3DDC97" /> : null}
      {error ? <Text className="text-ember mb-2">{error}</Text> : null}

      {data ? (
        <View>
          <Text className="text-leaf mb-1">You — {data.me.displayName}</Text>
          <Text className="text-ember mb-3">Buddy — {data.buddy.displayName}</Text>
          {myData.length || buddyData.length ? (
            <View className="bg-sand/5 rounded-2xl p-3 border border-sand/10">
              <LineChart
                data={myData.length ? myData : [{ value: 0 }]}
                data2={buddyData.length ? buddyData : undefined}
                color="#3DDC97"
                color2="#E4572E"
                thickness={3}
                thickness2={3}
                hideDataPoints={false}
                yAxisTextStyle={{ color: "#F2EDE499" }}
                xAxisLabelTextStyle={{ color: "#F2EDE466", fontSize: 10 }}
                rulesColor="#F2EDE422"
                width={320}
                height={240}
                curved
              />
            </View>
          ) : (
            <Text className="text-sand/60">No overlapping Volume yet for this Exercise.</Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
