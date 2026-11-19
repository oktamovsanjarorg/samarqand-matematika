/** Admin panel skeleti. Kirish oqimi (bot /admin → bir martalik havola): docs/09-tasks.md T-008 */
export function App() {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="card w-full max-w-sm space-y-4 text-center">
        <img src="/admin/logo.jpg" alt="Samarqand matematika maktabi" className="mx-auto h-32 w-32" />
        <h1 className="text-xl font-extrabold text-brand">Boshqaruv paneli</h1>
        <p className="text-sm text-hint">
          Kirish uchun botga <b className="text-text">/admin</b> deb yozing: bot 5 daqiqalik havola yuboradi.
        </p>
      </div>
    </div>
  );
}
