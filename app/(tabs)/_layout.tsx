// app/_layout.tsx (or app/(tabs)/_layout.tsx if your template used a tabs group)
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* Add other screens as needed */}
    </Stack>
  );
}
