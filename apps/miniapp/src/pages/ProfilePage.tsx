import { ROLE_LABELS, type MyProfile } from "@samarqand/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export function ProfilePage() {
  const user = useAuth((s) => s.user);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => api<MyProfile>("/me/profile") });
  if (!user) return null;
  const name = profile.data?.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(" ");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Profil</h1>
      <div className="card">
        <p className="font-bold">{name}</p>
        <p className="text-sm text-hint">{ROLE_LABELS[user.role]}</p>
      </div>
    </div>
  );
}
