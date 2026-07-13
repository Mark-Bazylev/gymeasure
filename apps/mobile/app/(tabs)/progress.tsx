import { useCallback, useState } from "react";
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

type Point = { date: string; volume: number };

export default function ProgressScreen() {
  const { token } = useAuth();
  const [query, setQuery] = useState("bench press");
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    if (!token || !query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ points: Point[] }>(
        `/sessions/stats/volume?name=${encodeURIComponent(query.trim())}`,
        { token },
      );
      setPoints(data.points);
      setLabel(query.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load volume");
    } finally {
      setLoading(false);
    }
  }, [token, query]);

  const chartData = points.map((p) => ({
    value: Math.round(p.volume),
    label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  return (
    <ScrollView className="flex-1 bg-ink px-4 pt-2">
      <Text className="text-sand/70 mb-3">
        Volume over time for an Exercise (weight × reps, kg).
      </Text>
      <TextInput
        className="bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand mb-3"
        value={query}
        onChangeText={setQuery}
        placeholder="Exercise name"
        placeholderTextColor="#F2EDE466"
        autoCapitalize="none"
      />
      <Pressable onPress={load} className="bg-moss rounded-xl py-3 items-center mb-4">
        <Text className="text-sand font-semibold">Show progress</Text>
      </Pressable>

      {loading ? <ActivityIndicator color="#3DDC97" /> : null}
      {error ? <Text className="text-ember mb-2">{error}</Text> : null}

      {label ? (
        <Text className="text-leaf text-lg font-semibold mb-3">{label}</Text>
      ) : null}

      {chartData.length > 0 ? (
        <View className="bg-sand/5 rounded-2xl p-3 border border-sand/10">
          <LineChart
            data={chartData}
            color="#3DDC97"
            thickness={3}
            hideDataPoints={false}
            dataPointsColor="#3DDC97"
            yAxisTextStyle={{ color: "#F2EDE499" }}
            xAxisLabelTextStyle={{ color: "#F2EDE466", fontSize: 10 }}
            rulesColor="#F2EDE422"
            backgroundColor="transparent"
            width={320}
            height={220}
            curved
          />
        </View>
      ) : !loading && label ? (
        <Text className="text-sand/60">No logged Volume for this Exercise yet.</Text>
      ) : null}
    </ScrollView>
  );
}
