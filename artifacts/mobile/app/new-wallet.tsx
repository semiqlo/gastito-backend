import { Check, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGastito, type Wallet } from "@/context/GastitoContext";
import { useColors } from "@/hooks/useColors";

const TYPES: { value: Wallet["type"]; label: string }[] = [
  { value: "bank", label: "Banco" },
  { value: "cash", label: "Efectivo" },
  { value: "digital", label: "Digital" },
  { value: "credit", label: "Credito" },
  { value: "savings", label: "Ahorro" },
];

const PALETTE = ["#1A56DB", "#16A34A", "#D97706", "#9333EA", "#DC2626", "#0891B2", "#EA580C", "#059669"];

export default function NewWalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addWallet } = useGastito();

  const [name, setName] = useState("");
  const [type, setType] = useState<Wallet["type"]>("bank");
  const [balance, setBalance] = useState("");
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleSave = () => {
    if (!name.trim()) return;
    const bal = parseInt(balance.replace(/[^0-9]/g, ""), 10) || 0;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addWallet({ name: name.trim(), type, balance: bal, currency: "CLP", color: selectedColor });
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Nueva cuenta
        </Text>
        <Pressable onPress={handleSave} disabled={!name.trim()}>
          <Text style={[styles.saveText, { color: name.trim() ? colors.primary : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            Guardar
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: bottomPad + 20 }]}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Nombre</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Cuenta RUT, Efectivo billetera"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Tipo</Text>
        <View style={styles.typeRow}>
          {TYPES.map((t) => (
            <Pressable
              key={t.value}
              onPress={() => setType(t.value)}
              style={[
                styles.typeBtn,
                {
                  backgroundColor: type === t.value ? colors.primary : colors.card,
                  borderColor: type === t.value ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.typeBtnText, { color: type === t.value ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Saldo actual (CLP)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          value={balance}
          onChangeText={setBalance}
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Color</Text>
        <View style={styles.colorRow}>
          {PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => setSelectedColor(c)}
              style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
            >
              {selectedColor === c && <Check size={14} color="#fff" />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  form: { paddingHorizontal: 20, paddingTop: 24, gap: 8 },
  label: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  typeBtnText: { fontSize: 13 },
  colorRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: { borderWidth: 3, borderColor: "#fff" },
});
