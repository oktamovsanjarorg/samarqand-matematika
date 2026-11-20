import { TutorChat } from "../components/tutor/TutorChat";
import { useBackButton } from "../hooks/useBackButton";

/** Erkin savol: mavzu bo'yicha tushuntirish (PLAN §7) */
export function TutorPage() {
  useBackButton("/");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">AI yordamchi</h1>
      <section className="card">
        <TutorChat input={{ mode: "FREE" }} />
      </section>
    </div>
  );
}
