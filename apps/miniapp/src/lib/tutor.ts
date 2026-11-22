import { ERROR_CODES, type StartTutorInput, type TutorChatView } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, post } from "./api";
import { compressImage, imageInit } from "./image";

/** O'quvchi xabari: matn va/yoki rasm (T-171) */
export interface TutorDraft {
  text: string;
  file: File | null;
}

/** Suhbatni ochadi (server mavjudini qaytaradi) va xabar yuboradi */
export function useTutor(input: StartTutorInput) {
  const qc = useQueryClient();
  const key = ["tutor", input];
  const chat = useQuery({
    queryKey: key,
    queryFn: () => post<TutorChatView>("/tutor/chats", input),
    retry: false,
    staleTime: Infinity,
  });
  const send = useMutation({
    mutationFn: async (d: TutorDraft) => {
      const id = chat.data?.id ?? "";
      // Rasm avval yuklanadi (siqilgan), keyin xabar uning id'si bilan
      const photoId = d.file
        ? (
            await api<{ id: string }>(
              `/tutor/chats/${id}/photos`,
              imageInit("POST", await compressImage(d.file)),
            )
          ).id
        : undefined;
      return post<TutorChatView>(`/tutor/chats/${id}/messages`, { text: d.text, photoId });
    },
    onSuccess: (v) => qc.setQueryData(key, v),
  });
  return { chat, send };
}

/** Server xatosi o'quvchiga tushunarli matn bilan; AI_BLOCKED bo'lsa yozish yopiladi */
export function tutorError(e: unknown): { text: string; closed: boolean } {
  if (e instanceof ApiError && (e.code === ERROR_CODES.AI_BLOCKED || e.code === ERROR_CODES.AI_LIMIT))
    return { text: e.message, closed: true };
  return { text: e instanceof Error ? e.message : "Xatolik yuz berdi", closed: false };
}
