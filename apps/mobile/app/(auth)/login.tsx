import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const { signIn, refreshing } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Login failed");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-ink px-6 justify-center"
    >
      <Text className="text-leaf text-4xl font-bold tracking-tight">Gymeasure</Text>
      <Text className="text-sand/70 mt-2 mb-8 text-base">
        Track volume. Compare with your Gym Buddy.
      </Text>

      <Text className="text-sand mb-1">Email</Text>
      <TextInput
        className="bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand mb-4"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        placeholderTextColor="#F2EDE466"
      />

      <Text className="text-sand mb-1">Password</Text>
      <TextInput
        className="bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand mb-4"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor="#F2EDE466"
      />

      {error ? <Text className="text-ember mb-3">{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={refreshing}
        className="bg-moss rounded-xl py-3.5 items-center"
      >
        {refreshing ? (
          <ActivityIndicator color="#F2EDE4" />
        ) : (
          <Text className="text-sand font-semibold text-base">Log in</Text>
        )}
      </Pressable>

      <Link href="/(auth)/register" asChild>
        <Pressable className="mt-5 items-center">
          <Text className="text-leaf">Create an account</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}
