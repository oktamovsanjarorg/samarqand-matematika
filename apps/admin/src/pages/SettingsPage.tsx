import { CardForm } from "../components/settings/CardForm";
import { ExamTemplatesSection } from "../components/settings/ExamTemplatesSection";
import { PlansSection } from "../components/settings/PlansSection";
import { StaffSection } from "../components/settings/StaffSection";
import { PageTitle } from "../components/ui";

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageTitle title="Sozlamalar" />
      <PlansSection />
      <CardForm />
      <ExamTemplatesSection />
      <StaffSection />
    </div>
  );
}
