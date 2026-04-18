import { useEffect, useState } from "react";
import {
  approveOpdToken,
  getPendingTokenApprovals,
  type AdminBookingRow,
} from "../services/adminService";

export function AdminApprovalsPage() {
  const [items, setItems] = useState<AdminBookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = () => {
    setIsLoading(true);
    setError(null);

    getPendingTokenApprovals()
      .then(setItems)
      .catch((fetchError) => {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load pending OPD tokens.",
        );
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const approveToken = async (bookingId: string) => {
    setActionId(bookingId);
    setError(null);

    try {
      await approveOpdToken(bookingId);
      setItems((current) => current.filter((item) => item.id !== bookingId));
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Could not approve OPD token.",
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="app-card p-6 sm:p-8">
        <p className="app-eyebrow">Admin approvals</p>
        <h1 className="app-title mt-3">Approve OPD tokens.</h1>
        <p className="app-muted mt-4 max-w-2xl">
          New patient tokens stay here until the registration counter verifies
          them. Approved tokens move to the doctor's OPD queue.
        </p>
      </div>

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5 text-sm leading-6 text-brand-900">
        Approval simulates the reception counter: patient shows token, counter
        confirms the visit, then the case becomes visible to the assigned doctor.
      </div>

      {isLoading ? (
        <div className="app-state-info">Loading pending tokens...</div>
      ) : null}

      {error ? <div className="app-state-error">{error}</div> : null}

      {!isLoading && !error && items.length === 0 ? (
        <div className="app-state-success">No OPD tokens pending approval.</div>
      ) : null}

      <div className="grid gap-4">
        {items.map((item) => (
          <article key={item.id} className="app-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xl font-bold text-slate-950">
                  Token {item.token_number ?? "-"} - {item.patient_name}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {item.patient_code} - {item.booking_code} - {item.doctor_name} -{" "}
                  {item.slot_time}
                </p>
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  Waiting for admin approval
                </p>
              </div>
              <button
                type="button"
                onClick={() => approveToken(item.id)}
                disabled={actionId === item.id}
                className="app-primary-button"
              >
                {actionId === item.id ? "Approving..." : "Approve for OPD queue"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
