import { Feather } from "@expo/vector-icons";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { File } from "expo-file-system";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
        <Pressable onPress={onReject} style={[styles.pendingBtn, { backgroundColor: colors.muted }]}>
          <Text style={[styles.pendingBtnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            No
          </Text>
        </Pressable>
        <Pressable onPress={onConfirm} style={[styles.pendingBtn, { backgroundColor: colors.primary }]}>
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
      <View style={[styles.bubbleContent, isUser && styles.bubbleContentUser]}>
        {message.isVoice && isUser && (
          <View style={styles.voiceBadge}>
            <Feather name="mic" size={10} color={colors.primaryForeground} />
          </View>
        )}
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
              {
                color: isUser ? colors.chatBubbleUserText : colors.chatBubbleBotText,
                fontFamily: "Inter_400Regular",
              },
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
          {new Date(message.timestamp).toLocaleTimeString("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}

const SYSTEM_CONTEXT_NOTE = `Responde en chileno coloquial conciso. Detecta transacciones con el bloque [TRANSACTION]...[/TRANSACTION] si el mensaje describe un gasto o ingreso.`;

function parseTransactionFromResponse(text: string): {
  cleanText: string;
  transaction: Partial<Transaction> | null;
} {
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
  return {
    cleanText,
    transaction: transaction.amount && transaction.amount > 0 ? transaction : null,
  };
}

function RecordingIndicator() {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.35, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={styles.recordingRow}>
      <Animated.View
        style={[
          styles.recordingDot,
          { backgroundColor: colors.destructive, transform: [{ scale: pulse }] },
        ]}
      />
      <Text style={[styles.recordingText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        Grabando...
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    messages,
    addMessage,
    updateMessage,
    addTransaction,
    wallets,
    totalBalance,
    monthlyExpenses,
    budgetStatus,
  } = useGastito();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const flatListRef = useRef<FlatList>(null);

  const buildContext = useCallback(() => {
    const balance = `$${totalBalance.toLocaleString("es-CL")}`;
    const expenses = `$${monthlyExpenses.toLocaleString("es-CL")}`;
    return `Contexto del usuario: Balance total: ${balance}, Gastos este mes: ${expenses}, Cuentas: ${wallets
      .map((w) => `${w.name} (${w.type}): $${w.balance.toLocaleString("es-CL")}`)
      .join(", ")}`;
  }, [totalBalance, monthlyExpenses, wallets]);

  const streamResponse = useCallback(
    async (userText: string, botId: string, extraHistory?: Array<{ role: "user" | "assistant"; content: string }>) => {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const baseUrl = domain ? `https://${domain}` : "";

      const history = extraHistory ?? messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`${baseUrl}/api/gastito/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          context: buildContext(),
          history,
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
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
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
    },
    [messages, buildContext, updateMessage]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");
    setIsLoading(true);

    addMessage({ role: "user", content: text });
    const botMsg = addMessage({ role: "assistant", content: "" });

    try {
      await streamResponse(text, botMsg.id);
    } catch {
      updateMessage(botMsg.id, { content: "Hubo un problema al conectar. Intenta de nuevo." });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, addMessage, updateMessage, streamResponse]);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      setMicPermission(granted ? "granted" : "denied");
      return granted;
    } catch {
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isLoading || isRecording) return;

    let hasPermission = micPermission === "granted";
    if (!hasPermission) {
      hasPermission = await requestMicPermission();
      if (!hasPermission) return;
    }

    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.warn("Recording failed", err);
    }
  }, [isLoading, isRecording, micPermission, requestMicPermission, recorder]);

  const stopRecordingAndSend = useCallback(async () => {
    if (!isRecording) return;

    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) return;

      setIsLoading(true);

      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const baseUrl = domain ? `https://${domain}` : "";

      const formData = new FormData();

      if (Platform.OS === "web") {
        const blob = await (await globalThis.fetch(uri)).blob();
        formData.append("audio", blob, "audio.webm");
      } else {
        const file = new File(uri);
        formData.append("audio", file as any);
      }

      formData.append("context", buildContext());
      formData.append(
        "history",
        JSON.stringify(messages.slice(-10).map((m) => ({ role: m.role, content: m.content })))
      );

      const botMsg = addMessage({ role: "assistant", content: "" });
      const botId = botMsg.id;

      const response = await fetch(`${baseUrl}/api/gastito/voice`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Server error");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullText = "";
      let userMsgAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.transcript) {
              if (!userMsgAdded) {
                addMessage({ role: "user", content: data.transcript, isVoice: true });
                userMsgAdded = true;
              }
            }

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

            if (data.error) {
              updateMessage(botId, { content: data.error });
            }
          } catch {}
        }
      }
    } catch {
      addMessage({ role: "assistant", content: "No pude procesar el audio. Intenta de nuevo." });
    } finally {
      setIsLoading(false);
    }
  }, [isRecording, recorder, messages, buildContext, addMessage, updateMessage]);

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

      if (tx.type === "expense" && tx.category && tx.amount) {
        const budget = budgetStatus.find((b) => b.category === tx.category);
        if (budget) {
          const newSpent = budget.spent + tx.amount;
          const newPct = (newSpent / budget.limit) * 100;
          let warning: string | null = null;
          if (newPct >= 100) {
            warning = `Excediste el presupuesto de ${tx.category} este mes. Llevabas $${budget.limit.toLocaleString("es-CL")} de limite y ahora vas en $${newSpent.toLocaleString("es-CL")}.`;
          } else if (newPct >= 80) {
            const remaining = budget.limit - newSpent;
            warning = `Llevas el ${newPct.toFixed(0)}% del presupuesto de ${tx.category}. Te quedan $${remaining.toLocaleString("es-CL")} para el resto del mes.`;
          }
          if (warning) {
            setTimeout(() => addMessage({ role: "assistant", content: warning! }), 400);
          }
        }
      }
    },
    [addTransaction, updateMessage, budgetStatus, addMessage]
  );

  const handleRejectTransaction = useCallback(
    (msgId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateMessage(msgId, {
        pendingTransaction: undefined,
        content: "Entendido, no registro nada.",
      });
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
        <View style={[styles.headerDot, { backgroundColor: colors.positive }]} />
        <Text
          style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
        >
          Gastito
        </Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
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

        {isLoading && !isRecording && (
          <View style={[styles.typingRow, { paddingHorizontal: 16 }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>G</Text>
            </View>
            <View
              style={[
                styles.typingBubble,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        )}

        {isRecording && (
          <View style={[styles.recordingBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <RecordingIndicator />
            <Text style={[styles.recordingHint, { color: colors.mutedForeground }]}>
              Suelta para enviar
            </Text>
          </View>
        )}

        {!isRecording && (
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
            {Platform.OS !== "web" && (
              <Pressable
                onPressIn={startRecording}
                onPressOut={stopRecordingAndSend}
                disabled={isLoading}
                style={[
                  styles.micBtn,
                  {
                    backgroundColor:
                      micPermission === "denied" ? colors.muted : colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather
                  name="mic"
                  size={19}
                  color={
                    micPermission === "denied"
                      ? colors.mutedForeground
                      : colors.primary
                  }
                />
              </Pressable>
            )}

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
                color={
                  input.trim() && !isLoading
                    ? colors.primaryForeground
                    : colors.mutedForeground
                }
              />
            </Pressable>
          </View>
        )}
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
  bubbleContentUser: { alignItems: "flex-end" },
  voiceBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(26,86,219,0.7)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: -4,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 13 },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "85%",
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleBot: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  timestamp: { fontSize: 11, paddingHorizontal: 4 },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
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
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
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
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  recordingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  recordingDot: { width: 10, height: 10, borderRadius: 5 },
  recordingText: { fontSize: 14 },
  recordingHint: { fontSize: 13 },
});
