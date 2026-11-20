import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

/** Chek rasmi token bilan olinadi va blob URL qilib ko'rsatiladi; bosilsa to'liq hajmda */
export function ReceiptImage({ paymentId }: { paymentId: string }) {
  const blob = useQuery({
    queryKey: ["receipt", paymentId],
    queryFn: () => api.blob(`/admin/payments/${paymentId}/receipt`),
    staleTime: Infinity,
  });
  const [url, setUrl] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!blob.data) return;
    const u = URL.createObjectURL(blob.data);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob.data]);

  if (blob.isError) return <p className="text-sm text-danger">Chekni yuklab boʻlmadi</p>;
  if (!url) return <div className="skeleton h-40 w-32" aria-busy="true" />;
  return (
    <button
      type="button"
      onClick={() => setFull((v) => !v)}
      aria-label="Chekni kattalashtirish"
      className="block"
    >
      <img
        src={url}
        alt="Toʻlov cheki"
        className={
          full
            ? "max-h-[80vh] w-full rounded-xl border border-hint/25 object-contain"
            : "h-40 w-32 rounded-xl border border-hint/25 bg-hint/5 object-cover"
        }
      />
    </button>
  );
}
