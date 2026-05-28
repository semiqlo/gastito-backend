import { Plus, Users } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGastito, type Debt } from "@/context/GastitoContext";
import { useColors } from "@/hooks/useColors";

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

const TABS = ["Activas", "Resueltas"] as const;
type Tab = (typeof TABS)[number];

interface DebtItemProps {
  debt: Debt;
  onSettle: (id: string) => void;
}

function DebtItem({ debt, onSettle }: DebtItemProps) {
  const colors = useColors();
  const iOwe = debt.direction === "i_owe";
  const accentColor = iOwe ? colors.negative : colors.positive;

  return (
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.itemBar, { backgroundColor: accentColor }]} />
      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <View style={styles.itemLeft}>
            <Text style={[styles.itemPerson, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {debt.personName}
            </Text>
            <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
              {debt.description}
            </Text>
          </View>
          <Text style={[styles.itemAmount, { color: accentColor, fontFamily: "Inter_700Bold" }]}>
            {formatCLP(debt.amount)}
          </Text>
        </View>
        <View style={styles.itemBottom}>
          <View style={[styles.badge, { backgroundColor: iOwe ? colors.negative + "15" : colors.positive + "15" }]}>
            <Text style={[styles.badgeText, { color: accentColor, fontFamily: "Inter_500Medium" }]}>
              {iOwe ? "Yo debo" : "Me deben"}
            </Text>
          </View>
          <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>{formatDate(debt.date)}</Text>
          {!debt.settled && (
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSettle(debt.id);
              }}
              style={[styles.settleBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.settleBtnText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                Resolver
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default function DebtsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { debts, settleDebt } = useGastito();
  const [tab, setTab] = useState<Tab>("Activas");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filtered = debts.filter((d) => (tab === "Activas" ? !d.settled : d.settled));

  const totalOwedToMe = debts.filter((d) => !d.settled && d.direction === "owed_to_me").reduce((s, d) => s + d.amount, 0);
  const totalIOwe = debts.filter((d) => !d.settled && d.direction === "i_owe").reduce((s, d) => s + d.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Deudas
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/new-debt");
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.positive + "15" }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Me deben</Text>
            <Text style={[styles.statValue, { color: colors.positive, fontFamily: "Inter_700Bold" }]}>
              +{formatCLP(totalOwedToMe)}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.negative + "15" }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Yo debo</Text>
            <Text style={[styles.statValue, { color: colors.negative, fontFamily: "Inter_700Bold" }]}>
              -{formatCLP(totalIOwe)}
            </Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, t === tab && { backgroundColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: t === tab ? colors.primaryForeground : colors.mutedForeground,
                    fontFamily: t === tab ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DebtItem debt={item} onSettle={settleDebt} />}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 16 }, filtered.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Users size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {tab === "Activas" ? "Sin deudas activas.\nBuen historial." : "Sin deudas resueltas aun."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 18 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 12 },
  statBox: { flex: 1, borderRadius: 10, padding: 12, gap: 4 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 18 },
  tabs: { flexDirection: "row", gap: 8 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  tabText: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  listEmpty: { flex: 1 },
  item: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  itemBar: { width: 4 },
  itemContent: { flex: 1, padding: 14, gap: 10 },
  itemTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  itemLeft: { flex: 1, gap: 3, marginRight: 8 },
  itemPerson: { fontSize: 15 },
  itemDesc: { fontSize: 13 },
  itemAmount: { fontSize: 18 },
  itemBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11 },
  itemDate: { flex: 1, fontSize: 12, textAlign: "right" },
  settleBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  settleBtnText: { fontSize: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
