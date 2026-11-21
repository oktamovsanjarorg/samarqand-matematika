import type { AdminLessonDetail, LessonAnnounceResult } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatDate } from "../lib/labels";
import { Button } from "./ui";

/**
 * Yangi dars haqida o'quvchilarga xabar (T-091): faqat saqlangan va nashr qilingan darsda, bir marta.
 * Ikki bosqichli: birinchi bosish tasdiq so'raydi, 4 soniyadan keyin bekor bo'ladi
 */
export function LessonAnnounce({ lesson }: { lesson: AdminLessonDetail }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);
  const send = useMutation({
    mutationFn: () => api.post<LessonAnnounceResult>(`/admin/lessons/${lesson.id}/announce`),
    onSuccess: (r) => qc.setQueryData(["lesson", lesson.id], { ...lesson, announcedAt: r.announcedAt }),
  });

  return (
    <section className="card space-y-2" data-testid="announce">
      <h2 className="flex items-center gap-2 font-bold">
        <Megaphone size={18} className="text-brand" /> Oʻquvchilarga xabar
      </h2>
      {lesson.announcedAt ? (
        <p className="text-sm text-hint">
          Botda xabar yuborilgan: {formatDate(lesson.announcedAt)}
          {send.data ? ` · ${send.data.sent} ta oʻquvchiga` : ""}
        </p>
      ) : !lesson.isPublished ? (
        <p className="text-sm text-hint">
          Dars nashr qilinib saqlangach, oʻquvchilarga bot orqali xabar berish mumkin.
        </p>
      ) : (
        <>
          <p className="text-sm text-hint">
            {lesson.isFree
              ? "Bepul dars: barcha oʻquvchilarga boradi."
              : "Pullik dars: toʻliq kirishi bor oʻquvchilarga boradi."}{" "}
            Xabar bir marta yuboriladi.
          </p>
          <Button
            variant={confirm ? "primary" : "secondary"}
            onClick={() => (confirm ? send.mutate() : setConfirm(true))}
            busy={send.isPending}
          >
            {confirm ? "Yuborilsinmi?" : "Xabar yuborish"}
          </Button>
        </>
      )}
      {send.error && <p className="text-sm text-danger">{send.error.message}</p>}
    </section>
  );
}
