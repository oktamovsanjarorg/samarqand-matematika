import type { AdminStudentCard } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  OfflineSection,
  SchoolSection,
  StatusSection,
  StudySection,
} from "../components/students/CardSections";
import { StudentCard } from "../components/students/StudentCard";
import { ErrorState, SkeletonList } from "../components/ui";
import { api } from "../lib/api";

/** O'quvchi kartasi: hamma ma'lumot bitta sahifada (T-068) */
export function StudentPage() {
  const { id = "" } = useParams();
  const card = useQuery({
    queryKey: ["student", id],
    queryFn: () => api.get<AdminStudentCard>(`/admin/students/${id}`),
  });
  return (
    <div className="space-y-4">
      <Link to="/students" className="flex items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft size={16} /> Oʻquvchilar
      </Link>
      {card.isPending && <SkeletonList rows={3} />}
      {card.isError && <ErrorState message={card.error.message} onRetry={() => card.refetch()} />}
      {card.data && (
        <>
          <ul>
            <StudentCard s={card.data.student} />
          </ul>
          <div className="grid gap-4 lg:grid-cols-2">
            <StatusSection c={card.data} />
            <SchoolSection c={card.data} />
            <StudySection c={card.data} />
            <OfflineSection c={card.data} />
          </div>
        </>
      )}
    </div>
  );
}
