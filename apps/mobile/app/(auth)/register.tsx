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

export default function RegisterScreen() {
  const { signUp, refreshing } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    try {
      await signUp(email.trim(), password, displayName.trim());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign up failed");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-ink px-6 justify-center"
    >
      <Text className="text-leaf text-3xl font-bold">Join Gymeasure</Text>
      <Text className="text-sand/70 mt-2 mb-8">Private circle. You and your Gym Buddies.</Text>

      <Text className="text-sand mb-1">Display name</Text>
      <TextInput
        className="bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand mb-4"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Mark"
        placeholderTextColor="#F2EDE466"
      />

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
        placeholder="At least 6 characters"
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
          <Text className="text-sand font-semibold text-base">Create account</Text>
        )}
      </Pressable>

      <Link href="/(auth)/login" asChild>
        <Pressable className="mt-5 items-center">
          <Text className="text-leaf">Already have an account?</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}
