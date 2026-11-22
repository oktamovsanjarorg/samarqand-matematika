import type { AgentItem, AgentPending, AgentReply, AgentTranscript } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  const done = (r: AgentReply) => {
    setState(r);
    setDraft(null);
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
  return {
    items,
    pending: state.pending,
    chat,
    confirm,
    busy: chat.isPending || confirm.isPending,
    error: chat.error ?? confirm.error,
    reset: () => {
      setState(EMPTY);
      chat.reset();
      confirm.reset();
    },
  };
}
