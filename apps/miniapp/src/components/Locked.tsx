import { Lock } from "lucide-react";
import { useProfile } from "../lib/me";
import { useAuth } from "../store/auth";
import { AccessCard } from "./home/AccessCard";

/** O'quvchiga: aynan qaysi qadam qolgani (BR-A04, T-088). Profil kelmaguncha umumiy matn */
function StudentSteps() {
  const access = useProfile().data?.access;
  return access && !access.full ? <AccessCard access={access} /> : null;
}

export function Locked({ title }: { title: string }) {
  const isStudent = useAuth((s) => s.user?.role === "STUDENT");
  return (
    <div className="space-y-3">
      <div className="card flex flex-col items-center gap-3 py-8 text-center" data-testid="locked">
        <Lock size={32} className="text-hint" />
        <p className="font-bold">{title}</p>
        <p className="text-sm text-hint">
          {isStudent
            ? "Quyidagi qadamlar bajarilgach barcha darslar va testlar ochiladi."
            : "Toʻlov va ota-ona tasdigʻidan keyin barcha darslar ochiladi. Savol boʻlsa, ustozga yozing."}
        </p>
      </div>
      {isStudent && <StudentSteps />}
    </div>
  );
}
