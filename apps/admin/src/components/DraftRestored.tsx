import { History } from "lucide-react";
import { Button } from "./ui";

/** T-153: oldingi saqlanmagan o'zgarish tiklangani haqida; "Bekor qilish" serverdagi nusxaga qaytaradi */
export function DraftRestored({ onDiscard }: { onDiscard: () => void }) {
  return (
    <div className="card flex flex-wrap items-center gap-3" role="status" data-testid="draft-restored">
      <History size={20} className="shrink-0 text-brand" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">
        Saqlanmagan oʻzgarishlar tiklandi. Tekshirib, <b>Saqlash</b> ni bosing.
      </p>
      <Button variant="secondary" onClick={onDiscard}>
        Bekor qilish
      </Button>
    </div>
  );
}
