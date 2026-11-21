import { ChevronRight, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useMistakes } from "../../lib/me";

/** Asosiy sahifada: xato ishlangan savollar bo'lsa "Xatolarim"ga turtki (T-083) */
export function MistakesCard() {
  const list = useMistakes().data ?? [];
  if (!list.length) return null;
  const topics = new Set(list.map((m) => m.topicId)).size;
  return (
    <Link to="/mistakes" className="tap card flex items-center gap-3" data-testid="mistakes-home">
      <RotateCcw size={24} className="shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">Xatolar ustida ishlang</p>
        <p className="text-sm text-hint">
          {list.length} ta savol, {topics} ta mavzu: toʻgʻri javobi va yechimi bilan
        </p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-hint" />
    </Link>
  );
}
