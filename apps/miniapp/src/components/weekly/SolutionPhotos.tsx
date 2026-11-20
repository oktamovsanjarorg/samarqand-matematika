import { MAX_SOLUTION_PHOTOS } from "@samarqand/shared";
import { Camera, X } from "lucide-react";
import { usePhotoUrl, type Photos } from "../../lib/photos";

export function PhotoThumb({ id, n, onRemove }: { id: string; n: number; onRemove?: () => void }) {
  const url = usePhotoUrl(id);
  return (
    <div
      className="relative h-20 w-20 overflow-hidden rounded-xl border border-hint/25 bg-hint/5"
      data-testid="photo"
    >
      {url ? (
        <img src={url} alt={`Yechim rasmi ${n}`} className="h-full w-full object-cover" />
      ) : (
        <div className="skeleton h-full w-full" />
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${n}-rasmni oʻchirish`}
          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/** Savol ostida: daftardagi yechim rasmi (1–3 ta). Rasmsiz to'g'ri javob 0 ball (BR-W04) */
export function SolutionPhotos({ qid, photos }: { qid: string; photos: Photos }) {
  const ids = photos.map[qid] ?? [];
  const busy = photos.add.isPending && photos.add.variables.qid === qid;
  const error = (photos.add.variables?.qid === qid ? photos.add.error : null) ?? photos.remove.error;
  return (
    <div className="space-y-2 border-t border-hint/15 pt-3" data-testid="solution-photos">
      <p className="text-sm font-semibold">
        Yechim rasmi ({ids.length}/{MAX_SOLUTION_PHOTOS})
      </p>
      {ids.length === 0 && (
        <p className="text-xs text-hint">
          Daftardagi yechimni suratga oling. Rasmsiz toʻgʻri javob ham 0 ball boʻladi.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {ids.map((id, i) => (
          <PhotoThumb key={id} id={id} n={i + 1} onRemove={() => photos.remove.mutate({ qid, id })} />
        ))}
        {ids.length < MAX_SOLUTION_PHOTOS && (
          <label className="tap flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/40 text-xs font-semibold text-brand">
            {busy ? <span className="skeleton h-5 w-10" /> : <Camera size={22} />}
            Rasm
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Yechim rasmini qoʻshish"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) photos.add.mutate({ qid, file });
              }}
            />
          </label>
        )}
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
