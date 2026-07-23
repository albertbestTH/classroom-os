import { fireEvent, render } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AppButton, SearchBar, SkeletonCard } from "@/components/ui/primitives";
import { ThemeProvider } from "@/features/theme/theme-context";

async function renderThemed(node: ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("mobile UI primitives", () => {
  it("exposes an accessible button and handles a press", async () => {
    const onPress = jest.fn();
    const screen = await renderThemed(<AppButton label="บันทึก" onPress={onPress} />);
    fireEvent.press(screen.getByRole("button", { name: "บันทึก" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("labels search and updates its value", async () => {
    const onChangeText = jest.fn();
    const screen = await renderThemed(<SearchBar value="" onChangeText={onChangeText} placeholder="ค้นหา" accessibilityLabel="ค้นหานักเรียน" />);
    fireEvent.changeText(screen.getByLabelText("ค้นหานักเรียน"), "65001");
    expect(onChangeText).toHaveBeenCalledWith("65001");
  });

  it("announces skeleton loading state", async () => {
    expect((await renderThemed(<SkeletonCard />)).getByLabelText("กำลังโหลดข้อมูล")).toBeTruthy();
  });
});
