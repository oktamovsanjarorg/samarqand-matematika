import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "./ui";

/** Mavzudagi barcha qoralamalarni bitta tugma bilan nashr qilish (T-103) */
export function PublishDrafts({ topicId, drafts }: { topicId: string; drafts: number }) {
  const qc = useQueryClient();
  const publish = useMutation({
    mutationFn: () => api.post<{ published: number }>(`/admin/topics/${topicId}/questions/publish`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["questions"] }),
  });
  if (drafts === 0) return null;
  return (
    <div className="space-y-1">
      <Button variant="secondary" busy={publish.isPending} onClick={() => publish.mutate()}>
        <Send size={16} /> {drafts} ta qoralamani nashr qilish
      </Button>
      {publish.error && <p className="text-sm text-danger">{publish.error.message}</p>}
    </div>
  );
}
