import { useColorScheme } from "react-native";
import colors from "@/constants/colors";
import { useSettings } from "@/context/SettingsContext";

export function useColors() {
  const systemScheme = useColorScheme();
  const { theme } = useSettings();

  const resolvedScheme =
    theme === "system" ? (systemScheme ?? "light") : theme;

  const palette = resolvedScheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
