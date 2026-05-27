import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGastito, type Transaction } from "@/context/GastitoContext";
import { useColors } from "@/hooks/useColors";

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} dias`;
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

const CATEGORY_ICONS: Record<string, string> = {
  Comida: "coffee",
  Transporte: "navigation",
  Entretenimiento: "film",
  Compras: "shopping-bag",
  Salud: "heart",
  Educacion: "book",
  Servicios: "wifi",
  Ingresos: "trending-up",
  Deudas: "users",
  Otro: "circle",
};

const FILTERS = ["Todos", "Gastos", "Ingresos"] as const;
type Filter = (typeof FILTERS)[number];

interface TxItemProps {
  item: Transaction;
  onDelete: (id: string) => void;
}

function TransactionItem({ item, onDelete }: TxItemProps) {
  const colors = useColors();
  const icon = CATEGORY_ICONS[item.category] ?? "circle";
  const isIncome = item.type === "income";

  return (
    <View style={[styles.txItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.txIcon, { backgroundColor: isIncome ? colors.success + "20" : colors.accent }]}>
        <Feather
          name={icon as any}
          size={18}
          color={isIncome ? colors.positive : colors.primary}
        />
      </View>
      <View style={styles.txBody}>
        <Text
          style={[styles.txDesc, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
          numberOfLines={1}
        >
          {item.description}
        </Text>
        <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>
          {item.category} · {formatDate(item.date)}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text
          style={[
            styles.txAmount,
            {
              color: isIncome ? colors.positive : colors.foreground,
              fontFamily: "Inter_600SemiBold",
            },
          ]}
        >
          {isIncome ? "+" : "-"}{formatCLP(item.amount)}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert("Eliminar gasto", "¿Seguro que quieres eliminar este registro?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Eliminar", style: "destructive", onPress: () => onDelete(item.id) },
            ]);
          }}
          hitSlop={8}
        >
          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions, deleteTransaction, monthlyExpenses, monthlyIncome } = useGastito();
  const [filter, setFilter] = useState<Filter>("Todos");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filtered = transactions.filter((t) => {
    if (filter === "Gastos") return t.type === "expense";
    if (filter === "Ingresos") return t.type === "income";
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Movimientos
        </Text>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Gastos</Text>
            <Text style={[styles.statValue, { color: colors.negative, fontFamily: "Inter_600SemiBold" }]}>
              -{formatCLP(monthlyExpenses)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Ingresos</Text>
            <Text style={[styles.statValue, { color: colors.positive, fontFamily: "Inter_600SemiBold" }]}>
              +{formatCLP(monthlyIncome)}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterBtn,
              filter === f && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filter === f ? colors.primaryForeground : colors.mutedForeground,
                  fontFamily: filter === f ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem item={item} onDelete={deleteTransaction} />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 16 },
          filtered.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Sin movimientos.{"\n"}Cuéntale a Gastito en que gastaste.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: { fontSize: 18 },
  headerStats: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1 },
  statLabel: { fontSize: 12, marginBottom: 2 },
  statValue: { fontSize: 16 },
  statDivider: { width: 1, height: 32, marginHorizontal: 16 },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  listEmpty: { flex: 1 },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  txBody: { flex: 1, gap: 3 },
  txDesc: { fontSize: 14 },
  txMeta: { fontSize: 12 },
  txRight: { alignItems: "flex-end", gap: 6 },
  txAmount: { fontSize: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
