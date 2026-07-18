import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";

type Props = TextInputProps & {
  label: string;
};

export function PasswordField({ label, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="mb-4">
      <Text className="text-sand mb-1">{label}</Text>
      <View className="bg-sand/10 border border-sand/20 rounded-xl flex-row items-center px-4">
        <TextInput
          className="flex-1 py-3 text-sand"
          secureTextEntry={!visible}
          placeholderTextColor="#F2EDE466"
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          hitSlop={8}
          className="pl-2 py-2"
        >
          {visible ? <EyeOff color="#F2EDE4" size={20} /> : <Eye color="#F2EDE4" size={20} />}
        </Pressable>
      </View>
    </View>
  );
}
