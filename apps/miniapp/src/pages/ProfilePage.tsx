import { ROLE_LABELS } from "@samarqand/shared";
import { useAuth } from "../store/auth";

export function ProfilePage() {
  const user = useAuth((s) => s.user);
  if (!user) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Profil</h1>
      <div className="card">
        <p className="font-bold">
          {user.firstName} {user.lastName ?? ""}
        </p>
        <p className="text-sm text-hint">{ROLE_LABELS[user.role]}</p>
      </div>
    </div>
  );
}
