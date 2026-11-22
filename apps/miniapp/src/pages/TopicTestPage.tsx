import { ERROR_CODES, type AttemptResult, type AttemptView } from "@samarqand/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Locked } from "../components/Locked";
import { ErrorState, TestSkeleton } from "../components/states";
import { Runner } from "../components/test/Runner";
import { TutorPanel } from "../components/tutor/TutorPanel";
import { useBackButton } from "../hooks/useBackButton";
import { ApiError, post } from "../lib/api";

/** Topshirish: natija keshga yoziladi, statistika yangilanadi, natija sahifasiga o'tiladi */
function useTopicSubmit() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return (attemptId: string) => async (flush: () => Promise<void>) => {
    await flush();
    const r = await post<AttemptResult>(`/attempts/${attemptId}/submit`);
    qc.setQueryData(["attempt", r.id], r);
    void qc.invalidateQueries({ queryKey: ["stats"] });
    void qc.invalidateQueries({ queryKey: ["mistakes"] });
    navigate(`/attempts/${r.id}`, { replace: true });
  };
}

export function TopicTestPage() {
  const { id = "" } = useParams();
  // T-104: Xatolarimdan kelinsa faqat xato qilingan savollar
  const mistakes = useSearchParams()[0].get("mistakes") === "1";
  useBackButton(mistakes ? "/mistakes" : "/lessons");
  const submit = useTopicSubmit();
  // Ochiq urinish bo'lsa server shuni qaytaradi: test qayta ochilganda javoblar saqlanib qoladi
  const attempt = useQuery({
    queryKey: ["topic-test", id, mistakes],
    queryFn: () => post<AttemptView>(`/topics/${id}/attempts`, mistakes ? { mistakes: true } : undefined),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const err = attempt.error;
  if (err instanceof ApiError && err.code === ERROR_CODES.LOCKED)
    return <Locked title="Mavzu testi obuna bilan ochiladi" />;
  if (err) return <ErrorState message={err.message} onRetry={() => attempt.refetch()} />;
  if (!attempt.data) return <TestSkeleton />;
  const a = attempt.data;
  return (
    <Runner
      attempt={a}
      base="/attempts"
      kicker={a.mistakesOnly ? "Xatolar ustida ishlash" : "Mavzu testi"}
      title={a.topicTitle}
      onSubmit={submit(a.id)}
      extra={(questionId, flush) => (
        <TutorPanel
          key={questionId}
          label="Yordamchi"
          input={{ mode: "PRACTICE", attemptId: a.id, questionId }}
          flush={flush}
        />
      )}
    />
  );
}
