import { BarChart2, CreditCard, List, MessageCircle, Users } from "lucide-react-native";
import { Tabs } from "expo-router";
import React from "react";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Gastos",
          tabBarIcon: ({ color }) => <List size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallets"
        options={{
          title: "Cuentas",
          tabBarIcon: ({ color }) => <CreditCard size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: "Deudas",
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: "Resumen",
          tabBarIcon: ({ color }) => <BarChart2 size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
