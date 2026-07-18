import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { AuthScreen } from "@/components/AuthScreen";
import { PasswordField } from "@/components/PasswordField";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const { signIn, signInWithGoogle, refreshing } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Login failed");
    }
  }

  async function onGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    }
  }

  return (
    <AuthScreen>
      <Text className="text-leaf text-4xl font-bold tracking-tight">Gymeasure</Text>
      <Text className="text-sand/70 mt-2 mb-8 text-base">
        Track volume. Compare with your Gym Buddy.
      </Text>

      <Text className="text-sand mb-1">Email</Text>
      <TextInput
        className="bg-sand/10 border border-sand/20 rounded-xl px-4 py-3 text-sand mb-4"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        placeholderTextColor="#F2EDE466"
      />

      <PasswordField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
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

      {Platform.OS === "android" && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ? (
        <Pressable
          onPress={onGoogle}
          disabled={refreshing}
          className="mt-3 border border-sand/30 rounded-xl py-3.5 items-center"
        >
          <Text className="text-sand font-semibold text-base">Continue with Google</Text>
        </Pressable>
      ) : null}

      <Link href="/(auth)/register" asChild>
        <Pressable className="mt-5 items-center">
          <Text className="text-leaf">Create an account</Text>
        </Pressable>
      </Link>
      <View className="h-8" />
    </AuthScreen>
  );
}
