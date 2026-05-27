import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGastito, type ChatMessage, type Transaction } from "@/context/GastitoContext";

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

interface PendingCard {
  tx: Partial<Transaction>;
  onConfirm: () => void;
  onReject: () => void;
}

function PendingTransactionCard({ tx, onConfirm, onReject }: PendingCard) {
  const colors = useColors();
  return (
    <View style={[styles.pendingCard, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
      <Text style={[styles.pendingTitle, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
        Transaccion detectada
      </Text>
      <View style={styles.pendingRow}>
        <Text style={[styles.pendingLabel, { color: colors.mutedForeground }]}>Monto</Text>
        <Text style={[styles.pendingValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {formatCLP(tx.amount ?? 0)}
        </Text>
      </View>
      {tx.category && (
        <View style={styles.pendingRow}>
          <Text style={[styles.pendingLabel, { color: colors.mutedForeground }]}>Categoria</Text>
          <Text style={[styles.pendingValue, { color: colors.foreground }]}>{tx.category}</Text>
        </View>
      )}
      {tx.merchant && (
        <View style={styles.pendingRow}>
          <Text style={[styles.pendingLabel, { color: colors.mutedForeground }]}>Comercio</Text>
          <Text style={[styles.pendingValue, { color: colors.foreground }]}>{tx.merchant}</Text>
        </View>
      )}
      <View style={styles.pendingActions}>
        <Pressable
          onPress={onReject}
          style={[styles.pendingBtn, { backgroundColor: colors.muted }]}
        >
          <Text style={[styles.pendingBtnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            No
          </Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          style={[styles.pendingBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.pendingBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
            Confirmar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

interface BubbleProps {
  message: ChatMessage;
  onConfirmTransaction?: () => void;
  onRejectTransaction?: () => void;
}

function MessageBubble({ message, onConfirmTransaction, onRejectTransaction }: BubbleProps) {
  const colors = useColors();
  const isUser = message.role === "user";

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowBot]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>G</Text>
        </View>
      )}
      <View style={styles.bubbleContent}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: colors.chatBubbleUser }]
              : [styles.bubbleBot, { backgroundColor: colors.chatBubbleBot, borderColor: colors.border }],
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? colors.chatBubbleUserText : colors.chatBubbleBotText, fontFamily: "Inter_400Regular" },
            ]}
          >
            {message.content}
          </Text>
        </View>
        {message.pendingTransaction && onConfirmTransaction && onRejectTransaction && (
          <PendingTransactionCard
            tx={message.pendingTransaction}
            onConfirm={onConfirmTransaction}
            onReject={onRejectTransaction}
          />
        )}
        <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
          {new Date(message.timestamp).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );
}

const SYSTEM_PROMPT = `Eres Gastito, un asistente financiero personal chileno. Hablas chileno coloquial directo y estructurado.

PERSONALIDAD:
- Tono: amigable + profesional, NO infantil, NO corporativo
- Sin emojis
- Sarcasmo leve ocasional para gastos innecesarios (ej: "AliExpress otra vez.")
- Respuestas concisas y estructuradas

CAPACIDADES:
- Detectar gastos e ingresos en lenguaje natural chileno
- Entender montos: "8 lucas" = $8.000, "12 mil" = $12.000, "medio palo" = $500.000
- Sugerir categorías automáticamente
- Rastrear deudas entre amigos
- Dar recomendaciones financieras
- Responder preguntas sobre presupuesto

CUANDO DETECTES UNA TRANSACCION, responde con este formato EXACTO:
[TRANSACTION]
amount: <numero sin puntos ni signo>
category: <categoria en español>
type: <expense o income>
description: <descripcion breve>
merchant: <nombre comercio o vacío>
[/TRANSACTION]
<tu mensaje conversacional>

Categorías válidas: Comida, Transporte, Entretenimiento, Compras, Salud, Educación, Servicios, Ingresos, Deudas, Otro

EJEMPLOS:
- "Gasté 8 lucas en sushi" → detectar expense $8.000 Comida
- "Uber 12 mil" → detectar expense $12.000 Transporte  
- "Me llegó el sueldo 890 lucas" → detectar income $890.000 Ingresos
- "¿Cuánto puedo gastar?" → respuesta conversacional de análisis

Si no hay transacción, responde conversacionalmente en chileno.`;

function parseTransactionFromResponse(text: string): { cleanText: string; transaction: Partial<Transaction> | null } {
  const match = text.match(/\[TRANSACTION\]([\s\S]*?)\[\/TRANSACTION\]/);
  if (!match) return { cleanText: text, transaction: null };

  const block = match[1];
  const get = (key: string) => {
    const m = block.match(new RegExp(`${key}:\\s*(.+)`));
    return m ? m[1].trim() : "";
  };

  const amountRaw = get("amount").replace(/[$.]/g, "").replace(/,/g, "");
  const amount = parseInt(amountRaw, 10);

  const transaction: Partial<Transaction> = {
    amount: isNaN(amount) ? 0 : amount,
    category: get("category") || "Otro",
    type: (get("type") as "expense" | "income") || "expense",
    description: get("description"),
    merchant: get("merchant") || undefined,
    walletId: "w1",
    date: new Date().toISOString(),
    confirmed: false,
  };

  const cleanText = text.replace(/\[TRANSACTION\][\s\S]*?\[\/TRANSACTION\]\n?/, "").trim();
  return { cleanText, transaction: transaction.amount && transaction.amount > 0 ? transaction : null };
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { messages, addMessage, updateMessage, addTransaction, wallets, totalBalance, monthlyExpenses } = useGastito();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const buildContext = useCallback(() => {
    const balance = `$${totalBalance.toLocaleString("es-CL")}`;
    const expenses = `$${monthlyExpenses.toLocaleString("es-CL")}`;
    return `Contexto del usuario: Balance total: ${balance}, Gastos este mes: ${expenses}, Cuentas: ${wallets.map((w) => `${w.name} (${w.type}): $${w.balance.toLocaleString("es-CL")}`).join(", ")}`;
  }, [totalBalance, monthlyExpenses, wallets]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");
    setIsLoading(true);

    addMessage({ role: "user", content: text });

    const botMsg = addMessage({ role: "assistant", content: "" });
    const botId = botMsg.id;

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const baseUrl = domain ? `https://${domain}` : "";

      const response = await fetch(`${baseUrl}/api/gastito/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: buildContext(),
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error("Error en el servidor");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullText += data.content;
                const { cleanText } = parseTransactionFromResponse(fullText);
                updateMessage(botId, { content: cleanText || fullText });
              }
              if (data.done) {
                const { cleanText, transaction } = parseTransactionFromResponse(fullText);
                if (transaction) {
                  updateMessage(botId, { content: cleanText, pendingTransaction: transaction });
                } else {
                  updateMessage(botId, { content: cleanText || fullText });
                }
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      updateMessage(botId, {
        content: "Hubo un problema al conectar. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, addMessage, updateMessage, buildContext]);

  const handleConfirmTransaction = useCallback(
    (msgId: string, tx: Partial<Transaction>) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addTransaction({
        amount: tx.amount!,
        description: tx.description!,
        category: tx.category!,
        walletId: tx.walletId || "w1",
        date: tx.date || new Date().toISOString(),
        type: tx.type!,
        merchant: tx.merchant,
        confirmed: true,
      });
      updateMessage(msgId, { pendingTransaction: undefined });
    },
    [addTransaction, updateMessage]
  );

  const handleRejectTransaction = useCallback(
    (msgId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateMessage(msgId, { pendingTransaction: undefined, content: "Entendido, no registro nada." });
    },
    [updateMessage]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        onConfirmTransaction={
          item.pendingTransaction
            ? () => handleConfirmTransaction(item.id, item.pendingTransaction!)
            : undefined
        }
        onRejectTransaction={
          item.pendingTransaction ? () => handleRejectTransaction(item.id) : undefined
        }
      />
    ),
    [handleConfirmTransaction, handleRejectTransaction]
  );

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.headerDot, { backgroundColor: colors.positive }]} />
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Gastito
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={[styles.typingRow, { paddingHorizontal: 16 }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>G</Text>
            </View>
            <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        )}

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: bottomPad + 8,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.muted,
                color: colors.foreground,
                borderColor: colors.border,
                fontFamily: "Inter_400Regular",
              },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Gasté 8 lucas en sushi..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !isLoading ? colors.primary : colors.muted,
              },
            ]}
          >
            <Feather
              name="arrow-up"
              size={20}
              color={input.trim() && !isLoading ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
        </View>
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 18 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  bubbleRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  bubbleRowUser: { justifyContent: "flex-end" },
  bubbleRowBot: { justifyContent: "flex-start" },
  bubbleContent: { flex: 1, gap: 6 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 13 },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "85%" },
  bubbleUser: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleBot: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  timestamp: { fontSize: 11, paddingHorizontal: 4 },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  typingBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  inputBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    maxWidth: "90%",
  },
  pendingTitle: { fontSize: 13, marginBottom: 4 },
  pendingRow: { flexDirection: "row", justifyContent: "space-between" },
  pendingLabel: { fontSize: 13 },
  pendingValue: { fontSize: 13 },
  pendingActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  pendingBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  pendingBtnText: { fontSize: 14 },
});
