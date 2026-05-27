import { Feather } from "@expo/vector-icons";
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

import { EXPENSE_CATEGORIES, useGastito } from "@/context/GastitoContext";
import { useColors } from "@/hooks/useColors";

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

const CATEGORY_ICONS: Record<string, string> = {
  Comida: "coffee",
  Transporte: "navigation",
  Entretenimiento: "film",
  Compras: "shopping-bag",
  Salud: "heart",
  Educacion: "book",
  Servicios: "zap",
  Otro: "more-horizontal",
};

export default function BudgetModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { budgets, setBudget, deleteBudget, budgetStatus } = useGastito();

  const [editing, setEditing] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const getBudget = (category: string) =>
    budgets.find((b) => b.category === category);

  const getStatus = (category: string) =>
    budgetStatus.find((b) => b.category === category);

  const handleEdit = (category: string) => {
    const existing = getBudget(category);
    setInputValue(existing ? existing.limit.toString() : "");
    setEditing(category);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = (category: string) => {
    const raw = inputValue.replace(/[^0-9]/g, "");
    const amount = parseInt(raw, 10);
    if (!isNaN(amount) && amount > 0) {
      setBudget(category, amount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditing(null);
    setInputValue("");
  };

  const handleDelete = (category: string) => {
    deleteBudget(category);
    setEditing(null);
    setInputValue("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const statusColor = (s?: "ok" | "warning" | "over") => {
    if (s === "over") return colors.negative;
    if (s === "warning") return colors.warning;
    return colors.positive;
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
        <Text
          style={[styles.title, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
        >
          Presupuestos
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Limite mensual por categoria
        </Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[styles.sectionHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          >
            Define cuanto puedes gastar por categoria cada mes. Gastito te avisara cuando estes cerca del limite.
          </Text>

          {EXPENSE_CATEGORIES.map((category) => {
            const budget = getBudget(category);
            const status = getStatus(category);
            const isEditing = editing === category;
            const iconName = (CATEGORY_ICONS[category] ?? "tag") as any;

            return (
              <View
                key={category}
                style={[
                  styles.row,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
                  <Feather name={iconName} size={16} color={colors.primary} />
                </View>

                <View style={styles.rowMiddle}>
                  <Text
                    style={[styles.catName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
                  >
                    {category}
                  </Text>

                  {!isEditing && budget && status && (
                    <View style={styles.progressWrap}>
                      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(status.percentage, 100)}%` as any,
                              backgroundColor: statusColor(status.status),
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                        {formatCLP(status.spent)} / {formatCLP(budget.limit)}
                        {"  "}
                        <Text
                          style={{ color: statusColor(status.status), fontFamily: "Inter_600SemiBold" }}
                        >
                          {status.percentage.toFixed(0)}%
                        </Text>
                      </Text>
                    </View>
                  )}

                  {!isEditing && !budget && (
                    <Text style={[styles.noLimit, { color: colors.mutedForeground }]}>
                      Sin limite definido
                    </Text>
                  )}

                  {isEditing && (
                    <View style={styles.inputRow}>
                      <Text style={[styles.currencySign, { color: colors.mutedForeground }]}>$</Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            color: colors.foreground,
                            borderColor: colors.primary,
                            backgroundColor: colors.muted,
                            fontFamily: "Inter_400Regular",
                          },
                        ]}
                        value={inputValue}
                        onChangeText={(v) => setInputValue(v.replace(/[^0-9]/g, ""))}
                        keyboardType="numeric"
                        placeholder="ej: 80000"
                        placeholderTextColor={colors.mutedForeground}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => handleSave(category)}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.actions}>
                  {isEditing ? (
                    <>
                      {budget && (
                        <Pressable
                          onPress={() => handleDelete(category)}
                          style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                          hitSlop={8}
                        >
                          <Feather name="trash-2" size={14} color={colors.negative} />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => { setEditing(null); setInputValue(""); }}
                        style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                        hitSlop={8}
                      >
                        <Feather name="x" size={14} color={colors.mutedForeground} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleSave(category)}
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        hitSlop={8}
                      >
                        <Feather name="check" size={14} color={colors.primaryForeground} />
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => handleEdit(category)}
                      style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                      hitSlop={8}
                    >
                      <Feather name={budget ? "edit-2" : "plus"} size={14} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 2,
  },
  title: { fontSize: 18 },
  subtitle: { fontSize: 13 },
  closeBtn: {
    position: "absolute",
    right: 20,
    top: 20,
    padding: 8,
  },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  sectionHint: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMiddle: { flex: 1, gap: 6 },
  catName: { fontSize: 14 },
  noLimit: { fontSize: 12 },
  progressWrap: { gap: 4 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 11 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  currencySign: { fontSize: 15 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
  },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
