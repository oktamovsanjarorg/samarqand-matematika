import type { AdminTutorChat, AdminTutorChatRow, TutorMode } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export const MODE_LABELS: Record<TutorMode, string> = {
  PRACTICE: "Mashq",
  REVIEW: "Xato tahlili",
  FREE: "Erkin savol",
};

export const useTutorChats = (mode: TutorMode | null) =>
  useQuery({
    queryKey: ["tutor-chats", mode],
    queryFn: () => api.get<AdminTutorChatRow[]>(`/admin/tutor/chats${mode ? `?mode=${mode}` : ""}`),
  });

export const useTutorChat = (id: string) =>
  useQuery({
    queryKey: ["tutor-chat", id],
    queryFn: () => api.get<AdminTutorChat>(`/admin/tutor/chats/${id}`),
  });
