import { useRef } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputProps } from "react-native";

import { touchTargets } from "@/constants/tokens";

type ScoreInputFieldProps = Pick<TextInputProps, "accessibilityLabel" | "maxLength" | "onChangeText" | "onSubmitEditing" | "placeholder" | "style" | "submitBehavior" | "value"> & {
  inputRef?: (input: TextInput | null) => void;
};

export function ScoreInputField({ inputRef: registerInput, ...props }: ScoreInputFieldProps) {
  const localInputRef = useRef<TextInput>(null);
  return <Pressable
    accessibilityRole="none"
    testID="score-input-touch-target"
    onPress={() => localInputRef.current?.focus()}
    style={styles.touchTarget}
  >
    <TextInput
      {...props}
      ref={(input) => {
        localInputRef.current = input;
        registerInput?.(input);
      }}
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
