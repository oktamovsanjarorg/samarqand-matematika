import type { AdminStudentRow } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { ExportButton } from "../components/ExportButton";
import { StudentCard } from "../components/students/StudentCard";
import { EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { exportStudents } from "../lib/students-export";

type Filter = "new" | "all";

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-hint/25 bg-section px-3">
      <Search size={16} className="text-hint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ism, username yoki telefon"
        className="w-full bg-transparent text-sm outline-none"
      />
    </label>
  );
}

export function StudentsPage() {
  const [filter, setFilter] = useState<Filter>("new");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const list = useQuery({
    queryKey: ["students", filter, query],
    queryFn: () =>
      api.get<AdminStudentRow[]>(`/admin/students?filter=${filter}&q=${encodeURIComponent(query)}`),
  });

  return (
    <div className="space-y-4">
      <PageTitle title="Oʻquvchilar">
        <div className="flex rounded-xl bg-section p-1" role="tablist">
          {(["new", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${filter === f ? "bg-brand text-white" : "text-hint"}`}
            >
              {f === "new" ? "Yangilar" : "Hammasi"}
            </button>
          ))}
        </div>
      </PageTitle>
      <div className="flex items-center gap-2">
        <SearchBox value={q} onChange={setQ} />
        {!!list.data?.length && <ExportButton onClick={() => exportStudents(list.data, filter === "all")} />}
      </div>
      {list.isPending && <SkeletonList />}
      {list.isError && <ErrorState message={list.error.message} onRetry={() => list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState
          title={filter === "new" ? "Yangi oʻquvchi yoʻq" : "Oʻquvchi topilmadi"}
          hint="Oʻquvchilar botdan ilovani ochganda shu yerda paydo boʻladi"
        />
      )}
      {list.data && list.data.length > 0 && (
        <ul className="space-y-2">
          {list.data.map((s) => (
            <StudentCard key={s.id} s={s} link />
          ))}
        </ul>
      )}
    </div>
  );
}
