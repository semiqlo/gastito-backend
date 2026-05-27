import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGastito, type Wallet } from "@/context/GastitoContext";
import { useColors } from "@/hooks/useColors";

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

const WALLET_TYPE_LABELS: Record<Wallet["type"], string> = {
  bank: "Cuenta bancaria",
  cash: "Efectivo",
  digital: "Billetera digital",
  credit: "Tarjeta de credito",
  savings: "Ahorro",
};

const WALLET_TYPE_ICONS: Record<Wallet["type"], string> = {
  bank: "home",
  cash: "dollar-sign",
  digital: "smartphone",
  credit: "credit-card",
  savings: "archive",
};

interface WalletCardProps {
  wallet: Wallet;
}

function WalletCard({ wallet }: WalletCardProps) {
  const colors = useColors();
  const isNegative = wallet.balance < 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: wallet.color + "20" }]}>
          <Feather
            name={(WALLET_TYPE_ICONS[wallet.type] ?? "circle") as any}
            size={20}
            color={wallet.color}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {wallet.name}
          </Text>
          <Text style={[styles.cardType, { color: colors.mutedForeground }]}>
            {WALLET_TYPE_LABELS[wallet.type]}
          </Text>
        </View>
      </View>
      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
      <Text
        style={[
          styles.cardBalance,
          {
            color: isNegative ? colors.negative : colors.foreground,
            fontFamily: "Inter_700Bold",
          },
        ]}
      >
        {formatCLP(wallet.balance)}
      </Text>
      <Text style={[styles.cardCurrency, { color: colors.mutedForeground }]}>CLP</Text>
    </View>
  );
}

export default function WalletsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { wallets, totalBalance } = useGastito();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Cuentas
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/new-wallet");
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
        <View style={[styles.totalBox, { backgroundColor: colors.accent }]}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Balance total</Text>
          <Text style={[styles.totalValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {formatCLP(totalBalance)}
          </Text>
        </View>
      </View>

      <FlatList
        data={wallets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => <WalletCard wallet={item} />}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 16 }]}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="credit-card" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Agrega tu primera cuenta
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 18 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  totalBox: { borderRadius: 12, padding: 14, gap: 4 },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 28 },
  list: { paddingHorizontal: 12, paddingTop: 16, gap: 12 },
  row: { gap: 12 },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  cardIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 14 },
  cardType: { fontSize: 11 },
  cardDivider: { height: 1, marginVertical: 10 },
  cardBalance: { fontSize: 20 },
  cardCurrency: { fontSize: 11 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, textAlign: "center" },
});
