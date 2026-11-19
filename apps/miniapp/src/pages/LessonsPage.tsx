import { EmptyState } from "../components/states";

export function LessonsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Darslar</h1>
      <EmptyState
        title="Hozircha darslar yoʻq"
        hint="Kurslar qoʻshilgach, mavzular boʻyicha shu yerda chiqadi."
      />
    </div>
  );
}
