import type { ReactNode } from "react";

export function CenteredCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="card w-full max-w-sm space-y-4 text-center">
        <img src="/admin/logo.jpg" alt="Samarqand matematika maktabi" className="mx-auto h-32 w-32" />
        <h1 className="text-xl font-extrabold text-brand">{title}</h1>
        {children}
      </div>
    </div>
  );
}
