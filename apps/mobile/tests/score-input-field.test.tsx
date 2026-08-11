import { fireEvent, render } from "@testing-library/react-native";
import { ScoreInputField } from "@/features/scores/score-input-field";

describe("ScoreInputField", () => {
  it("renders native decimal keyboard props and forwards changes", async () => {
    const onChangeText = jest.fn();
    const screen = await render(<ScoreInputField accessibilityLabel="คะแนนของนักเรียน" value="" onChangeText={onChangeText} />);
    const input = screen.getByLabelText("คะแนนของนักเรียน");
    expect(input.type).toBe("TextInput");
    expect(input.props).toMatchObject({ keyboardType: "decimal-pad", inputMode: "decimal", returnKeyType: "next", showSoftInputOnFocus: true, editable: true });
    fireEvent.changeText(input, "8.5");
    expect(onChangeText).toHaveBeenCalledWith("8.5");
    expect(screen.getByTestId("score-input-touch-target")).toBeTruthy();
  });
});
