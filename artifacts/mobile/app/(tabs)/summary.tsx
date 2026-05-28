import { PlusCircle, Sliders, Trash2, Zap } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGastito } from "@/context/GastitoContext";
import { useColors } from "@/hooks/useColors";

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function ProgressBar({
  value,
  max,
  color,
  bgColor,
}: {
  value: number;
  max: number;
  color: string;
  bgColor: string;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={[pbStyles.track, { backgroundColor: bgColor }]}>
      <View style={[pbStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const pbStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
});

export default function SummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    transactions,
    wallets,
    totalBalance,
    monthlyExpenses,
    monthlyIncome,
    debts,
    budgetStatus,
    clearAll,
  } = useGastito();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthName = now.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  const monthlyTxs = transactions.filter((t) => new Date(t.date) >= startOfMonth && t.confirmed);
  const expenses = monthlyTxs.filter((t) => t.type === "expense");

  const byCategory: Record<string, number> = {};
  for (const t of expenses) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0];

  const totalActive = debts.filter((d) => !d.settled);
  const netDebt =
    totalActive.filter((d) => d.direction === "owed_to_me").reduce((s, d) => s + d.amount, 0) -
    totalActive.filter((d) => d.direction === "i_owe").reduce((s, d) => s + d.amount, 0);

  const savingsRate =
    monthlyIncome > 0
      ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
      : 0;

  const savingsColor =
    savingsRate >= 20 ? colors.positive : savingsRate >= 10 ? colors.warning : colors.negative;

  const budgetStatusColor = (status: "ok" | "warning" | "over") => {
    if (status === "over") return colors.negative;
    if (status === "warning") return colors.warning;
    return colors.positive;
  };

  const overBudgetCount = budgetStatus.filter((b) => b.status === "over").length;
  const warningCount = budgetStatus.filter((b) => b.status === "warning").length;

  const handleClearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Limpiar todos los datos",
      "Esto borrara todos tus gastos, cuentas, deudas y presupuestos. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar todo",
          style: "destructive",
          onPress: async () => {
            await clearAll();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text
            style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
          >
            Resumen
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Balance total</Text>
          <Text
            style={[styles.bigNumber, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
          >
            {formatCLP(totalBalance)}
          </Text>
          <View style={styles.miniRow}>
            <View style={styles.miniItem}>
              <View style={[styles.miniDot, { backgroundColor: colors.positive }]} />
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Ingresos: </Text>
              <Text
                style={[styles.miniVal, { color: colors.positive, fontFamily: "Inter_600SemiBold" }]}
              >
                +{formatCLP(monthlyIncome)}
              </Text>
            </View>
            <View style={styles.miniItem}>
              <View style={[styles.miniDot, { backgroundColor: colors.negative }]} />
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Gastos: </Text>
              <Text
                style={[
                  styles.miniVal,
                  { color: colors.negative, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                -{formatCLP(monthlyExpenses)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Tasa de ahorro</Text>
            <Text
              style={[styles.pctBadge, { color: savingsColor, fontFamily: "Inter_700Bold" }]}
            >
              {savingsRate.toFixed(1)}%
            </Text>
          </View>
          <ProgressBar
            value={monthlyIncome - monthlyExpenses}
            max={monthlyIncome}
            color={savingsColor}
            bgColor={colors.muted}
          />
          <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
            {savingsRate >= 20
              ? "Buen ritmo de ahorro."
              : savingsRate >= 10
              ? "Ahorro moderado. Puedes mejorar."
              : "Ahorro bajo este mes. Revisa gastos no esenciales."}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>
                Presupuestos
              </Text>
              {(overBudgetCount > 0 || warningCount > 0) && (
                <View
                  style={[
                    styles.alertBadge,
                    {
                      backgroundColor:
                        overBudgetCount > 0 ? colors.negative + "20" : colors.warning + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.alertBadgeText,
                      {
                        color: overBudgetCount > 0 ? colors.negative : colors.warning,
                        fontFamily: "Inter_600SemiBold",
                      },
                    ]}
                  >
                    {overBudgetCount > 0
                      ? `${overBudgetCount} excedido${overBudgetCount > 1 ? "s" : ""}`
                      : `${warningCount} en limite`}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/budget-modal" as any);
              }}
              style={[styles.editBtn, { backgroundColor: colors.muted }]}
            >
              <Sliders size={13} color={colors.primary} />
              <Text
                style={[
                  styles.editBtnText,
                  { color: colors.primary, fontFamily: "Inter_500Medium" },
                ]}
              >
                Editar
              </Text>
            </Pressable>
          </View>

          {budgetStatus.length === 0 ? (
            <Pressable
              onPress={() => router.push("/budget-modal" as any)}
              style={[styles.emptyBudget, { borderColor: colors.border }]}
            >
              <PlusCircle size={16} color={colors.mutedForeground} />
              <Text style={[styles.emptyBudgetText, { color: colors.mutedForeground }]}>
                Toca para definir tus limites mensuales
              </Text>
            </Pressable>
          ) : (
            budgetStatus.map((b) => {
              const barColor = budgetStatusColor(b.status);
              return (
                <View key={b.category} style={styles.budgetRow}>
                  <View style={styles.budgetRowTop}>
                    <Text
                      style={[
                        styles.budgetCat,
                        { color: colors.foreground, fontFamily: "Inter_500Medium" },
                      ]}
                    >
                      {b.category}
                    </Text>
                    <Text
                      style={[
                        styles.budgetPct,
                        { color: barColor, fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {b.percentage.toFixed(0)}%
                    </Text>
                  </View>
                  <ProgressBar
                    value={b.spent}
                    max={b.limit}
                    color={barColor}
                    bgColor={colors.muted}
                  />
                  <View style={styles.budgetRowBottom}>
                    <Text style={[styles.budgetSpent, { color: colors.mutedForeground }]}>
                      {formatCLP(b.spent)} gastado
                    </Text>
                    <Text style={[styles.budgetLimit, { color: colors.mutedForeground }]}>
                      limite {formatCLP(b.limit)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {sortedCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>
              Gastos por categoria
            </Text>
            {sortedCategories.slice(0, 5).map(([cat, total]) => (
              <View key={cat} style={styles.catRow}>
                <Text
                  style={[
                    styles.catName,
                    { color: colors.foreground, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {cat}
                </Text>
                <View style={styles.catRight}>
                  <ProgressBar
                    value={total}
                    max={monthlyExpenses}
                    color={colors.primary}
                    bgColor={colors.muted}
                  />
                  <Text
                    style={[
                      styles.catAmount,
                      { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {formatCLP(total)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Deudas activas</Text>
          <Text
            style={[
              styles.bigNumber,
              {
                color: netDebt >= 0 ? colors.positive : colors.negative,
                fontFamily: "Inter_700Bold",
              },
            ]}
          >
            {netDebt >= 0 ? "+" : ""}
            {formatCLP(Math.abs(netDebt))}
          </Text>
          <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
            {netDebt > 0
              ? "Saldo neto a tu favor."
              : netDebt < 0
              ? "Debes mas de lo que te deben."
              : "Sin deudas netas. Limpio."}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Cuentas</Text>
          {wallets.map((w) => (
            <View key={w.id} style={styles.walletRow}>
              <View style={[styles.walletDot, { backgroundColor: w.color }]} />
              <Text
                style={[
                  styles.walletName,
                  { color: colors.foreground, fontFamily: "Inter_500Medium" },
                ]}
              >
                {w.name}
              </Text>
              <Text
                style={[
                  styles.walletBal,
                  {
                    color: w.balance < 0 ? colors.negative : colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                {formatCLP(w.balance)}
              </Text>
            </View>
          ))}
        </View>

        {topCategory && (
          <View
            style={[
              styles.insightCard,
              { backgroundColor: colors.accent, borderColor: colors.primary + "30" },
            ]}
          >
            <Zap size={16} color={colors.primary} />
            <Text
              style={[
                styles.insightText,
                { color: colors.foreground, fontFamily: "Inter_400Regular" },
              ]}
            >
              Tu mayor gasto este mes fue en{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>{topCategory[0]}</Text> con{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>{formatCLP(topCategory[1])}</Text>.
              {topCategory[0] === "Entretenimiento" || topCategory[0] === "Compras"
                ? " Vale la pena revisarlo."
                : ""}
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleClearAll}
          style={[styles.clearBtn, { borderColor: colors.negative + "40", backgroundColor: colors.negative + "10" }]}
        >
          <Trash2 size={15} color={colors.negative} />
          <Text style={[styles.clearBtnText, { color: colors.negative, fontFamily: "Inter_500Medium" }]}>
            Limpiar todos los datos
          </Text>
        </Pressable>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 2,
  },
  headerTitle: { fontSize: 18 },
  headerSub: { fontSize: 13 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  cardHint: { fontSize: 13, lineHeight: 18 },
  bigNumber: { fontSize: 32 },
  pctBadge: { fontSize: 22 },
  miniRow: { flexDirection: "row", gap: 16 },
  miniItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  miniLabel: { fontSize: 13 },
  miniVal: { fontSize: 13 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 12 },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alertBadgeText: { fontSize: 11 },
  emptyBudget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  emptyBudgetText: { fontSize: 13 },
  budgetRow: { gap: 5 },
  budgetRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  budgetCat: { fontSize: 13 },
  budgetPct: { fontSize: 12 },
  budgetRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetSpent: { fontSize: 11 },
  budgetLimit: { fontSize: 11 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  catName: { width: 100, fontSize: 13 },
  catRight: { flex: 1, gap: 4 },
  catAmount: { fontSize: 13 },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  walletDot: { width: 8, height: 8, borderRadius: 4 },
  walletName: { flex: 1, fontSize: 14 },
  walletBal: { fontSize: 14 },
  insightCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  insightText: { flex: 1, fontSize: 14, lineHeight: 20 },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  clearBtnText: { fontSize: 14 },
});
