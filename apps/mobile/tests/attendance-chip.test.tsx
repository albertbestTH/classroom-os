import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { AttendanceChip } from "@/components/ui/primitives";
import { lightColors } from "@/constants/tokens";
import { ThemeProvider } from "@/features/theme/theme-context";

describe("AttendanceChip", () => {
  it.each([
    ["present", "มา", lightColors.success],
    ["late", "สาย", lightColors.warning],
    ["absent", "ขาด", lightColors.danger],
    ["leave", "ลา", lightColors.primary],
  ] as const)("uses the semantic %s color when selected", async (status, label, color) => {
    const screen = await render(
      <ThemeProvider>
        <AttendanceChip
          label={label}
          status={status}
          selected
          accessibilityLabel={`สถานะ ${label}`}
          onPress={() => undefined}
        />
      </ThemeProvider>,
    );

    const style = StyleSheet.flatten(screen.getByLabelText(`สถานะ ${label}`).props.style);
    expect(style.backgroundColor).toBe(color);
    expect(style.borderColor).toBe(color);
  });
});
