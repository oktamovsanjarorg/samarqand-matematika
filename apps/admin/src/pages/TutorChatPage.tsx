import { ArrowLeft, Sparkles } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MathText } from "../components/MathText";
import { ProtectedImage } from "../components/ProtectedImage";
import { Badge, Button, ErrorState, SkeletonList } from "../components/ui";
import { useAi } from "../lib/agent";
import { MODE_LABELS, useTutorChat } from "../lib/tutor";

/** Bitta suhbat: savol va xabarlar (faqat o'qish, BR-T04) */
export function TutorChatPage() {
  const { id = "" } = useParams();
  const q = useTutorChat(id);
  return (
    <div className="space-y-4">
      <Link to="/ai/chats" className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <ArrowLeft size={16} /> Suhbatlar
      </Link>
      {q.isPending && <SkeletonList />}
      {q.isError && <ErrorState message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 flex-1 text-lg font-extrabold">{q.data.student.name}</h2>
            <Badge tone="brand">{MODE_LABELS[q.data.mode]}</Badge>
            <AskAi name={q.data.student.name} />
          </div>
          {q.data.question && (
            <section className="card">
              <p className="text-xs font-semibold text-hint">Savol</p>
              <MathText text={q.data.question} />
            </section>
          )}
          <ul className="flex flex-col gap-2" data-testid="tutor-messages">
            {q.data.messages.map((m) =>
              m.role === "USER" ? (
                <li key={m.id} className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
                  {m.photoId && (
                    <div className="w-48" data-testid="tutor-photo">
                      <ProtectedImage
                        path={`/admin/tutor/photos/${m.photoId}`}
                        alt="Oʻquvchi yuborgan rasm"
                      />
                    </div>
                  )}
                  {m.text && (
                    <span className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-3 py-2 text-white">
                      {m.text}
                    </span>
                  )}
                </li>
              ) : (
                <li key={m.id} className="max-w-[92%] rounded-2xl rounded-bl-md bg-section px-3 py-2">
                  <MathText text={m.text} />
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </div>
  );
}

/** T-177: shu o'quvchi haqida savolni agentga tayyorlab beradi; yuborishni ustoz o'zi bosadi */
function AskAi({ name }: { name: string }) {
  const { status, agent } = useAi();
  const navigate = useNavigate();
  // Amal tasdiq kutayotgan bo'lsa, yangi savol yozib bo'lmaydi
  if (!status.data?.enabled || agent.pending || agent.busy) return null;
  return (
    <Button
      variant="secondary"
      onClick={() => {
        agent.setText(`${name} AI yordamchidan nimalarni soʻragan? Qaysi mavzu qiyin?`);
        void navigate("/ai");
      }}
    >
      <Sparkles size={16} /> AI bilan tahlil
    </Button>
  );
}
