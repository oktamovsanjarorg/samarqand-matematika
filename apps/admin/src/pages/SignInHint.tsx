import { CenteredCard } from "./CenteredCard";

export function SignInHint() {
  return (
    <CenteredCard title="Boshqaruv paneli">
      <p className="text-sm text-hint">
        Kirish uchun botga <b className="text-text">/admin</b> deb yozing: bot 5 daqiqalik havola yuboradi.
      </p>
    </CenteredCard>
  );
}
