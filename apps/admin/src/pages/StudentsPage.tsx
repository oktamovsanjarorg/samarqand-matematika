import type { AdminStudentRow, StudentFilter } from "@samarqand/shared";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ExportButton } from "../components/ExportButton";
import { Inbox } from "../components/students/Inbox";
import { StudentRow } from "../components/students/StudentRow";
import { EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { useGroups } from "../lib/groups";
import { exportStudents } from "../lib/students-export";

type ListFilter = Exclude<StudentFilter, "new">;
const TABS: Record<ListFilter, string> = { all: "Hammasi", unpaid: "Toʻlamagan", expiring: "Tugayotgan" };
const EMPTY: Record<ListFilter, string> = {
  all: "Oʻquvchi topilmadi",
  unpaid: "Hamma toʻlagan",
  expiring: "Yaqin kunlarda obunasi tugaydigan oʻquvchi yoʻq",
};

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-section text-hint"}`}
    >
      {children}
    </button>
  );
}

function GroupChips({ value, onChange }: { value: string; onChange: (g: string) => void }) {
  const groups = useGroups();
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Guruhlar">
      <Chip on={!value} onClick={() => onChange("")}>
        Hammasi
      </Chip>
      {groups.data
        ?.filter((g) => g.isActive)
        .map((g) => (
          <Chip key={g.id} on={value === g.id} onClick={() => onChange(g.id)}>
            {g.name} <span className="opacity-60">{g.studentCount}</span>
          </Chip>
        ))}
      <Chip on={value === "none"} onClick={() => onChange("none")}>
        Online (guruhsiz)
      </Chip>
    </div>
  );
}

function FilterTabs({ value, onChange }: { value: ListFilter; onChange: (f: ListFilter) => void }) {
  return (
    <div className="flex max-w-full overflow-x-auto rounded-xl bg-section p-1" role="tablist">
      {(["all", "unpaid", "expiring"] as const).map((f) => (
        <button
          key={f}
          type="button"
          role="tab"
          aria-selected={value === f}
          onClick={() => onChange(f)}
          className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${value === f ? "bg-brand text-white" : "text-hint"}`}
        >
          {TABS[f]}
        </button>
      ))}
    </div>
  );
}

function StudentList(p: { list: UseQueryResult<AdminStudentRow[]>; filter: ListFilter; showGroup: boolean }) {
  const { list } = p;
  if (list.isPending) return <SkeletonList />;
  if (list.isError) return <ErrorState message={list.error.message} onRetry={() => list.refetch()} />;
  if (!list.data.length)
    return (
      <EmptyState
        title={EMPTY[p.filter]}
        hint="Oʻquvchilar botdan ilovani ochganda shu yerda paydo boʻladi"
      />
    );
  return (
    <>
      <p className="text-xs text-hint">{list.data.length} ta oʻquvchi</p>
      <ul className="card divide-y divide-hint/10 py-0">
        {list.data.map((s) => (
          <StudentRow key={s.id} s={s} showGroup={p.showGroup} />
        ))}
      </ul>
    </>
  );
}

/** O'quvchilar (T-185): ko'rib chiqish kerak bo'lganlar, guruh bo'yicha ro'yxat, belgilar */
export function StudentsPage() {
  // T-127: bosh sahifadan ?filter=expiring yoki ?filter=new bilan kelinadi
  const [params, setParams] = useSearchParams();
  const asked = params.get("filter");
  const [filter, setFilter] = useState<ListFilter>(
    asked === "unpaid" || asked === "expiring" ? asked : "all",
  );
  const group = params.get("group") ?? "";
  const groups = useGroups();
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const list = useQuery({
    queryKey: ["students", filter, query, group],
    queryFn: () =>
      api.get<AdminStudentRow[]>(
        `/admin/students?filter=${filter}&q=${encodeURIComponent(query)}&group=${encodeURIComponent(group)}`,
      ),
  });
  return (
    <div className="space-y-4">
      <PageTitle title="Oʻquvchilar">
        <FilterTabs value={filter} onChange={setFilter} />
      </PageTitle>
      <Inbox groups={groups.data ?? []} open={asked === "new"} />
      <GroupChips value={group} onChange={(g) => setParams(g ? { group: g } : {}, { replace: true })} />
      <div className="flex items-center gap-2">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-hint/25 bg-section px-3">
          <Search size={16} className="text-hint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism, username yoki telefon"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        {!!list.data?.length && <ExportButton onClick={() => exportStudents(list.data, filter)} />}
      </div>
      <StudentList list={list} filter={filter} showGroup={group === "" || group === "none"} />
    </div>
  );
}
