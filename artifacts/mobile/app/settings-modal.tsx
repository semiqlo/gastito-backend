import { Check, Eye, EyeOff, Moon, Smartphone, Sun, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSettings, type ThemePreference } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

interface ThemeOption {
  value: ThemePreference;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: "system", label: "Sistema", Icon: Smartphone },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
];

export default function SettingsModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { apiKey, botName, userName, theme, updateSettings } = useSettings();

  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localBotName, setLocalBotName] = useState(botName);
  const [localUserName, setLocalUserName] = useState(userName);
  const [localTheme, setLocalTheme] = useState<ThemePreference>(theme);
  const [showApiKey, setShowApiKey] = useState(false);

  const hasChanges =
    localApiKey !== apiKey ||
    localBotName.trim() !== botName ||
    localUserName.trim() !== userName ||
    localTheme !== theme;

  const handleSave = () => {
    updateSettings({
      apiKey: localApiKey.trim(),
      botName: localBotName.trim() || "Gastito",
      userName: localUserName.trim(),
      theme: localTheme,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Configuracion
        </Text>
        <Pressable onPress={handleSave} disabled={!hasChanges}>
          <Text
            style={[
              styles.saveText,
              {
                color: hasChanges ? colors.primary : colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
              },
            ]}
          >
            Guardar
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Tu nombre
            </Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
              El asistente te llamara por tu nombre en la conversacion.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={localUserName}
              onChangeText={setLocalUserName}
              placeholder="Ej: Carlos, Maria..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Nombre del asistente
            </Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
              Como se llama tu asistente financiero.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={localBotName}
              onChangeText={setLocalBotName}
              placeholder="Gastito"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Tema
            </Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
              Apariencia de la aplicacion.
            </Text>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map(({ value, label, Icon }) => {
                const active = localTheme === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setLocalTheme(value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.themeBtn,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Icon size={18} color={active ? colors.primaryForeground : colors.mutedForeground} />
                    <Text
                      style={[
                        styles.themeBtnText,
                        {
                          color: active ? colors.primaryForeground : colors.foreground,
                          fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {label}
                    </Text>
                    {active && <Check size={14} color={colors.primaryForeground} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              API Key de Gemini
            </Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
              Pega tu propia API key de Google Gemini para usar tus propios tokens. Si la dejas vacia se usa la clave del servidor.
            </Text>
            <View style={styles.apiKeyRow}>
              <TextInput
                style={[
                  styles.apiKeyInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: localApiKey ? colors.primary : colors.border,
                    color: colors.foreground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
                value={localApiKey}
                onChangeText={setLocalApiKey}
                placeholder="AIza..."
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowApiKey((v) => !v)}
                style={[styles.eyeBtn, { backgroundColor: colors.muted }]}
                hitSlop={8}
              >
                {showApiKey ? (
                  <EyeOff size={18} color={colors.mutedForeground} />
                ) : (
                  <Eye size={18} color={colors.mutedForeground} />
                )}
              </Pressable>
            </View>
            {localApiKey ? (
              <View style={[styles.keyBadge, { backgroundColor: colors.positive + "15" }]}>
                <Check size={12} color={colors.positive} />
                <Text style={[styles.keyBadgeText, { color: colors.positive, fontFamily: "Inter_500Medium" }]}>
                  API key configurada
                </Text>
              </View>
            ) : (
              <View style={[styles.keyBadge, { backgroundColor: colors.warning + "15" }]}>
                <Text style={[styles.keyBadgeText, { color: colors.warning, fontFamily: "Inter_500Medium" }]}>
                  Usando clave del servidor (compartida)
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17 },
  saveText: { fontSize: 16 },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 28 },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHint: { fontSize: 13, lineHeight: 18, marginTop: -4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  themeRow: { flexDirection: "row", gap: 10 },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeBtnText: { fontSize: 13 },
  apiKeyRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  apiKeyInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  keyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  keyBadgeText: { fontSize: 12 },
});
