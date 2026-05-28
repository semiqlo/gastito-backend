import { ArrowDownLeft, ArrowUpRight, X } from "lucide-react-native";
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

import { useGastito, type Debt } from "@/context/GastitoContext";
import { useColors } from "@/hooks/useColors";

export default function NewDebtScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addDebt } = useGastito();

  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [direction, setDirection] = useState<Debt["direction"]>("owed_to_me");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleSave = () => {
    if (!personName.trim() || !amount) return;
    const amt = parseInt(amount.replace(/[^0-9]/g, ""), 10);
    if (!amt || amt <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addDebt({
      personName: personName.trim(),
      amount: amt,
      description: description.trim() || `Deuda con ${personName.trim()}`,
      direction,
      date: new Date().toISOString(),
      settled: false,
    });
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Registrar deuda
        </Text>
        <Pressable onPress={handleSave} disabled={!personName.trim() || !amount}>
          <Text style={[styles.saveText, { color: personName.trim() && amount ? colors.primary : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            Guardar
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.form, { paddingBottom: bottomPad + 20 }]}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Direccion</Text>
        <View style={styles.dirRow}>
          <Pressable
            onPress={() => setDirection("owed_to_me")}
            style={[
              styles.dirBtn,
              {
                backgroundColor: direction === "owed_to_me" ? colors.positive + "20" : colors.card,
                borderColor: direction === "owed_to_me" ? colors.positive : colors.border,
              },
            ]}
          >
            <ArrowDownLeft size={18} color={direction === "owed_to_me" ? colors.positive : colors.mutedForeground} />
            <Text style={[styles.dirBtnText, { color: direction === "owed_to_me" ? colors.positive : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Me deben
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDirection("i_owe")}
            style={[
              styles.dirBtn,
              {
                backgroundColor: direction === "i_owe" ? colors.negative + "20" : colors.card,
                borderColor: direction === "i_owe" ? colors.negative : colors.border,
              },
            ]}
          >
            <ArrowUpRight size={18} color={direction === "i_owe" ? colors.negative : colors.mutedForeground} />
            <Text style={[styles.dirBtnText, { color: direction === "i_owe" ? colors.negative : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Yo debo
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Persona</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          value={personName}
          onChangeText={setPersonName}
          placeholder="Nombre"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Monto (CLP)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="Ej: 5000"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Descripcion (opcional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Almuerzo, taxi, etc."
          placeholderTextColor={colors.mutedForeground}
        />
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
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  dirRow: { flexDirection: "row", gap: 12 },
  dirBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  dirBtnText: { fontSize: 14 },
});
