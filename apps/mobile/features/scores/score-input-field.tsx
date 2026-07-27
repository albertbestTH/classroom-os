import { useRef } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputProps } from "react-native";

import { touchTargets } from "@/constants/tokens";

type ScoreInputFieldProps = Pick<TextInputProps, "accessibilityLabel" | "maxLength" | "onChangeText" | "placeholder" | "style" | "value">;

export function ScoreInputField(props: ScoreInputFieldProps) {
  const inputRef = useRef<TextInput>(null);
  return <Pressable
    accessibilityRole="none"
    testID="score-input-touch-target"
    onPress={() => inputRef.current?.focus()}
    style={styles.touchTarget}
  >
    <TextInput
      {...props}
      ref={inputRef}
      editable
      keyboardType="decimal-pad"
      inputMode="decimal"
      returnKeyType="next"
      showSoftInputOnFocus
      selectTextOnFocus
    />
  </Pressable>;
}

const styles = StyleSheet.create({
  touchTarget: { minWidth: 64, minHeight: touchTargets.comfortable, justifyContent: "center" },
});
