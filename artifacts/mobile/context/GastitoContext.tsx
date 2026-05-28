import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface Wallet {
  id: string;
  name: string;
  type: "bank" | "cash" | "digital" | "credit" | "savings";
  balance: number;
  currency: string;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  walletId: string;
  date: string;
  type: "expense" | "income";
  merchant?: string;
  confirmed: boolean;
}

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  description: string;
  direction: "owed_to_me" | "i_owe";
  date: string;
  settled: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isVoice?: boolean;
  pendingTransaction?: Partial<Transaction>;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface BudgetStatus {
  category: string;
  limit: number;
  spent: number;
  percentage: number;
  status: "ok" | "warning" | "over";
}

export const EXPENSE_CATEGORIES = [
  "Comida",
  "Transporte",
  "Entretenimiento",
  "Compras",
  "Salud",
  "Educacion",
  "Servicios",
  "Otro",
] as const;

interface GastitoContextValue {
  wallets: Wallet[];
  transactions: Transaction[];
  debts: Debt[];
  messages: ChatMessage[];
  budgets: Budget[];
  addWallet: (w: Omit<Wallet, "id">) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  addDebt: (d: Omit<Debt, "id">) => void;
  settleDebt: (id: string) => void;
  addMessage: (m: Omit<ChatMessage, "id" | "timestamp">) => ChatMessage;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setBudget: (category: string, limit: number) => void;
  deleteBudget: (category: string) => void;
  clearAll: () => Promise<void>;
  totalBalance: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  budgetStatus: BudgetStatus[];
}

const GastitoContext = createContext<GastitoContextValue | null>(null);

const STORAGE_KEY = "gastito_data_v2";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hola. Soy Gastito, tu asistente financiero.\n\nCuéntame en qué gastaste, cuánto tienes, o qué quieres saber sobre tu plata. Sin formularios.",
  timestamp: new Date().toISOString(),
};

const DEFAULT_WALLETS: Wallet[] = [
  { id: "w1", name: "Cuenta Banco", type: "bank", balance: 0, currency: "CLP", color: "#1A56DB" },
  { id: "w2", name: "Efectivo", type: "cash", balance: 0, currency: "CLP", color: "#16A34A" },
];

export function GastitoProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>(DEFAULT_WALLETS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (data.wallets?.length) setWallets(data.wallets);
          if (data.transactions?.length) setTransactions(data.transactions);
          if (data.debts?.length) setDebts(data.debts);
          if (data.budgets?.length) setBudgets(data.budgets);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ wallets, transactions, debts, budgets }));
  }, [wallets, transactions, debts, budgets, loaded]);

  const addWallet = useCallback((w: Omit<Wallet, "id">) => {
    setWallets((prev) => [...prev, { ...w, id: generateId() }]);
  }, []);

  const updateWallet = useCallback((id: string, updates: Partial<Wallet>) => {
    setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, "id">) => {
    const tx: Transaction = { ...t, id: generateId() };
    setTransactions((prev) => [tx, ...prev]);
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id !== t.walletId) return w;
        const delta = t.type === "income" ? t.amount : -t.amount;
        return { ...w, balance: w.balance + delta };
      })
    );
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => {
      const tx = prev.find((t) => t.id === id);
      if (tx) {
        const delta = tx.type === "income" ? -tx.amount : tx.amount;
        setWallets((wList) =>
          wList.map((w) => (w.id === tx.walletId ? { ...w, balance: w.balance + delta } : w))
        );
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const addDebt = useCallback((d: Omit<Debt, "id">) => {
    setDebts((prev) => [...prev, { ...d, id: generateId() }]);
  }, []);

  const settleDebt = useCallback((id: string) => {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, settled: true } : d)));
  }, []);

  const addMessage = useCallback((m: Omit<ChatMessage, "id" | "timestamp">): ChatMessage => {
    const msg: ChatMessage = { ...m, id: generateId(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const setBudget = useCallback((category: string, limit: number) => {
    setBudgets((prev) => {
      const existing = prev.find((b) => b.category === category);
      if (existing) {
        return prev.map((b) => (b.category === category ? { ...b, limit } : b));
      }
      return [...prev, { category, limit }];
    });
  }, []);

  const deleteBudget = useCallback((category: string) => {
    setBudgets((prev) => prev.filter((b) => b.category !== category));
  }, []);

  const clearAll = useCallback(async () => {
    const freshWallets = DEFAULT_WALLETS.map((w) => ({ ...w, balance: 0 }));
    setWallets(freshWallets);
    setTransactions([]);
    setDebts([]);
    setBudgets([]);
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const monthlyTransactions = transactions.filter((t) => t.date >= startOfMonth && t.confirmed);
  const monthlyExpenses = monthlyTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthlyIncome = monthlyTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  const budgetStatus = useMemo((): BudgetStatus[] => {
    const spentByCategory: Record<string, number> = {};
    for (const t of monthlyTransactions) {
      if (t.type === "expense") {
        spentByCategory[t.category] = (spentByCategory[t.category] ?? 0) + t.amount;
      }
    }
    return budgets.map((b) => {
      const spent = spentByCategory[b.category] ?? 0;
      const percentage = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      const status: BudgetStatus["status"] =
        percentage >= 100 ? "over" : percentage >= 80 ? "warning" : "ok";
      return { category: b.category, limit: b.limit, spent, percentage, status };
    });
  }, [budgets, monthlyTransactions]);

  return (
    <GastitoContext.Provider
      value={{
        wallets, transactions, debts, messages, budgets,
        addWallet, updateWallet, addTransaction, deleteTransaction,
        addDebt, settleDebt, addMessage, updateMessage,
        setBudget, deleteBudget, clearAll,
        totalBalance, monthlyExpenses, monthlyIncome,
        budgetStatus,
      }}
    >
      {children}
    </GastitoContext.Provider>
  );
}

export function useGastito() {
  const ctx = useContext(GastitoContext);
  if (!ctx) throw new Error("useGastito must be used inside GastitoProvider");
  return ctx;
}
