import { router } from "expo-router";

import { AppButton, AppHeader, ListTile, SafeScreen, SectionCard } from "@/components/ui/primitives";

const dependencies = ["Expo", "React Native", "TanStack Query", "Zod"];

export default function LicensesScreen() {
  return <SafeScreen>
    <AppButton label="← กลับ" tone="secondary" onPress={() => router.back()} />
    <AppHeader title="โอเพนซอร์สไลเซนส์" subtitle="ซอฟต์แวร์หลักที่ช่วยสร้าง Classroom OS" />
    <SectionCard>{dependencies.map((name) => <ListTile key={name} title={name} subtitle="ดูเงื่อนไขฉบับเต็มในแพ็กเกจต้นทาง" />)}</SectionCard>
  </SafeScreen>;
}
