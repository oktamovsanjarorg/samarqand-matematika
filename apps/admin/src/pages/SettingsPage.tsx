import { CardForm } from "../components/settings/CardForm";
import { PlansSection } from "../components/settings/PlansSection";
import { PageTitle } from "../components/ui";

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageTitle title="Sozlamalar" />
      <PlansSection />
      <CardForm />
    </div>
  );
}
