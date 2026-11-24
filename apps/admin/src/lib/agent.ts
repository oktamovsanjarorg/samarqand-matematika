import type { AgentItem, AgentPending, AgentReply, AgentTranscript } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "./api";

export const useAgentStatus = () =>
  useQuery({ queryKey: ["agent"], queryFn: () => api.get<{ enabled: boolean }>("/admin/agent") });

interface State {
  transcript: AgentTranscript;
  items: AgentItem[];
  pending: AgentPending | null;
}
/** Panel Markdown chizmaydi: model baribir yozib yuborsa, qalin va sarlavha belgilari olib tashlanadi */
export const plainText = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "");

const EMPTY: State = { transcript: [], items: [], pending: null };

/**
 * Agent suhbati (T-156): suhbat brauzerda turadi, har so'rovda serverga qaytariladi.
 * Amal bajarilgach panel ma'lumotlari yangilanadi (masalan, yangi kurs ro'yxatda ko'rinsin).
 */
export function useAgentChat() {
  const qc = useQueryClient();
  const [state, setState] = useState<State>(EMPTY);
  const [draft, setDraft] = useState<string | null>(null);
  const [text, setText] = useState("");
  const done = (r: AgentReply) => {
    setState(r);
    setDraft(null);
    setText("");
    void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "agent" });
  };
  const chat = useMutation({
    mutationFn: (message: string) => {
      setDraft(message);
      return api.post<AgentReply>("/admin/agent/chat", { transcript: state.transcript, message });
    },
    onSuccess: done,
    onError: () => setDraft(null),
  });
  const confirm = useMutation({
    mutationFn: (approve: boolean) =>
      api.post<AgentReply>("/admin/agent/confirm", {
        transcript: state.transcript,
        token: state.pending?.token,
        approve,
      }),
    onSuccess: done,
  });
  const items: AgentItem[] = draft ? [...state.items, { kind: "user", text: draft }] : state.items;
  const busy = chat.isPending || confirm.isPending;
  return {
    items,
    text,
    setText,
    send: (message: string) => {
      if (message.trim() && !busy && !state.pending) chat.mutate(message.trim());
    },
    pending: state.pending,
    chat,
    confirm,
    busy,
    error: chat.error ?? confirm.error,
    reset: () => {
      setState(EMPTY);
      chat.reset();
      confirm.reset();
    },
  };
}

/** T-177: suhbat AI bo'limi karkasida turadi, ichki sahifaga o'tib qaytilsa yo'qolmaydi */
export interface AiContext {
  status: ReturnType<typeof useAgentStatus>;
  agent: ReturnType<typeof useAgentChat>;
}
export const useAi = () => useOutletContext<AiContext>();
