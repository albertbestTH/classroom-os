import { semanticTokens, spacing as sharedSpacing, touchTargets as sharedTouchTargets } from "@classroom-os/design-tokens";

import { lightColors, spacing, touchTargets } from "@/constants/tokens";

describe("Web/Mobile semantic token parity", () => {
  it("keeps core light status and brand colors aligned", () => {
    expect(lightColors.primary).toBe(semanticTokens.light.brand.primary);
    expect(lightColors.primarySoft).toBe(semanticTokens.light.brand.primarySoft);
    expect(lightColors.success).toBe(semanticTokens.light.attendance.present);
    expect(lightColors.warning).toBe(semanticTokens.light.attendance.late);
    expect(lightColors.danger).toBe(semanticTokens.light.attendance.absent);
    expect(lightColors.background).toBe(semanticTokens.light.background.canvas);
    expect(lightColors.text).toBe(semanticTokens.light.text.primary);
  });

  it("keeps spacing and touch target foundations aligned", () => {
    expect(spacing).toEqual(sharedSpacing);
    expect(touchTargets.minimum).toBe(sharedTouchTargets.minimum);
    expect(touchTargets.comfortable).toBe(sharedTouchTargets.preferred);
  });
});
