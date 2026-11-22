import type { StaffInvite } from "@samarqand/shared";
import { useMutation } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/labels";
import { ShareLink } from "../ShareLink";
import { Button } from "../ui";

const SHARE_TEXT = "Samarqand matematika: ustoz yordamchisi boʻlish uchun havolani oching";

/**
 * Yordamchini havola bilan taklif qilish (T-155): odam botga oldin kirgan bo'lishi shart emas.
 * Havola 24 soat va bir marta ishlaydi; yangisi eskisini bekor qiladi.
 */
export function StaffInviteCard() {
  const create = useMutation({ mutationFn: () => api.post<StaffInvite>("/admin/staff/invite") });
  const cancel = useMutation({
    mutationFn: () => api.del("/admin/staff/invite"),
    onSuccess: () => create.reset(),
  });
  const inv = create.data;
  const error = create.error ?? cancel.error;
  return (
    <div className="space-y-2 rounded-xl border border-hint/15 p-3" data-testid="staff-invite">
      <p className="font-semibold">Havola bilan taklif qilish</p>
      <p className="text-sm text-hint">
        Havolani yordamchiga yuboring: botda ochishi bilan yordamchi boʻladi. Havola 24 soat va bir marta
        ishlaydi.
      </p>
      {inv?.link && <ShareLink link={inv.link} text={SHARE_TEXT} testId="staff-invite-link" />}
      {inv && !inv.link && (
        <p className="text-sm">
          Bot nomi aniqlanmadi. Yordamchi botga quyidagini yozsin: <code>/start s_{inv.code}</code>
        </p>
      )}
      {inv && <p className="text-xs text-hint">Amal qiladi: {formatDate(inv.expiresAt)} gacha</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={inv ? "secondary" : "primary"}
          onClick={() => create.mutate()}
          busy={create.isPending}
        >
          <Link2 size={16} /> {inv ? "Yangi havola" : "Havola yaratish"}
        </Button>
        {inv && (
          <Button variant="secondary" onClick={() => cancel.mutate()} busy={cancel.isPending}>
            Bekor qilish
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </div>
  );
}
