import { ProtectedImage } from "./ProtectedImage";

export function ReceiptImage({ paymentId }: { paymentId: string }) {
  return <ProtectedImage path={`/admin/payments/${paymentId}/receipt`} alt="Toʻlov cheki" />;
}
