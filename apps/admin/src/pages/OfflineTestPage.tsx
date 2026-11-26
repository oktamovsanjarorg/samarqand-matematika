import type { AdminOfflineTestDetail } from "@samarqand/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RaschTable } from "../components/offline/RaschTable";
import { ResultsList } from "../components/offline/ResultsList";
import { SectionsEditor } from "../components/offline/SectionsEditor";
import { Bars, Card, Hardest, QuestionGrid, SectionAverages, Tiles } from "../components/offline/TestStats";
import { Button, ErrorState, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { fmtDay, useOfflineTest } from "../lib/offline";

function Actions({ t }: { t: AdminOfflineTestDetail }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const waiting = t.rows.filter((r) => r.userId && !r.notifiedAt).length;
  const notify = useMutation({
    mutationFn: () => api.post<{ students: number; parents: number }>(`/admin/offline-tests/${t.id}/notify`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["offline"] }),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/admin/offline-tests/${t.id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["offline"] });
      navigate("/offline");
    },
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => notify.mutate()} busy={notify.isPending} disabled={!waiting}>
        <Send size={16} /> Xabar yuborish{waiting ? ` (${waiting})` : ""}
      </Button>
      <Button variant="danger" onClick={() => remove.mutate()} busy={remove.isPending}>
        Testni oʻchirish
      </Button>
      {notify.data && (
        <p className="text-sm text-success">
          Yuborildi: {notify.data.students} oʻquvchi, {notify.data.parents} ota-ona
        </p>
      )}
      {(notify.error ?? remove.error) && (
        <p className="text-sm text-danger">{(notify.error ?? remove.error)?.message}</p>
      )}
    </div>
  );
}

function Sections({ t }: { t: AdminOfflineTestDetail }) {
  const [edit, setEdit] = useState(false);
  return (
    <Card title="Fan boʻlimlari boʻyicha oʻrtacha" hint="Boʻlimdagi savollarni toʻgʻri yechganlar ulushi">
      {edit ? (
        <SectionsEditor t={t} onDone={() => setEdit(false)} />
      ) : (
        <>
          {t.sections.length ? (
            <SectionAverages t={t} />
          ) : (
            <p className="text-sm text-hint">Fan boʻlimlari yozilmagan.</p>
          )}
          <button type="button" className="text-sm font-semibold text-link" onClick={() => setEdit(true)}>
            {t.sections.length ? "Boʻlimlarni oʻzgartirish" : "Boʻlimlarni yozish"}
          </button>
        </>
      )}
    </Card>
  );
}

function Analysis({ t }: { t: AdminOfflineTestDetail }) {
  return (
    <>
      <Tiles t={t} />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Darajalar" hint={`Ball ${t.scaleMax} dan, faol imtihon shabloni chegaralari`}>
          <Bars items={t.stats.grades.map((g) => ({ label: g.label, value: g.count }))} />
        </Card>
        <Sections t={t} />
        <Card title="Foiz taqsimoti">
          <Bars items={t.stats.buckets.map((b) => ({ label: b.label, value: b.count }))} />
        </Card>
        <Card title="Eng koʻp xato qilingan savollar">
          <Hardest t={t} />
        </Card>
      </div>
      <Card title="Har savol: toʻgʻri javob ulushi" hint="Qizil: yarmidan kami toʻgʻri yechgan">
        <QuestionGrid t={t} />
      </Card>
      <Card title="Rasch tahlili">
        <RaschTable t={t} />
      </Card>
      <Card title="Natijalar" hint="Qatorni bosing: natija kartasi, fan boʻlimlari va har savol">
        <ResultsList t={t} />
      </Card>
    </>
  );
}

/** Bitta offline test: tahlil, fan bo'limlari, Rasch, natijalar, biriktirish va xabar (T-183) */
export function OfflineTestPage() {
  const { id = "" } = useParams();
  const t = useOfflineTest(id);
  return (
    <div className="space-y-4">
      <Link to="/offline" className="flex w-fit items-center gap-1 text-sm font-semibold text-link">
        <ArrowLeft size={16} /> Offline testlar
      </Link>
      {t.isPending && <SkeletonList rows={4} />}
      {t.isError && <ErrorState message={t.error.message} onRetry={() => t.refetch()} />}
      {t.data && (
        <>
          <div>
            <h1 className="text-xl font-extrabold">{t.data.title}</h1>
            <p className="text-sm text-hint">
              {fmtDay(t.data.date)}
              {t.data.groupName ? ` · ${t.data.groupName}` : ""} · {t.data.questionCount} savol ·{" "}
              {t.data.matched}/{t.data.count} moslangan
            </p>
          </div>
          <Actions t={t.data} />
          <Analysis t={t.data} />
        </>
      )}
    </div>
  );
}
