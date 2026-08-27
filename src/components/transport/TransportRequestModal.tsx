"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createTransportRequestAction } from "@/lib/transport/transport-actions";
import { TRANSPORT_SENDING_REQUESTS_PATH } from "@/lib/transport/transport-request-lifecycle";
import { useI18n } from "@/i18n/provider";
import type { TransportListItem } from "@/types/transport";

export interface TransportRequestModalProps {
  transport: TransportListItem;
  onClose: () => void;
}

export function TransportRequestModal({ transport, onClose }: TransportRequestModalProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { dict } = useI18n();
  const copy = dict.transportRequests;
  const [message, setMessage] = useState("");
  const [originNotes, setOriginNotes] = useState("");
  const [destinationNotes, setDestinationNotes] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || submitted) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (!message.trim()) {
      setFeedback(copy.messageRequired);
      setSuccess(false);
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const result = await createTransportRequestAction({
      transportServiceId: transport.id,
      message: message.trim(),
      originNotes: originNotes.trim() || undefined,
      destinationNotes: destinationNotes.trim() || undefined,
      requestedDate: requestedDate || undefined,
    });
    setSubmitting(false);
    setFeedback(result.message);
    setSuccess(result.success);
    if (result.success) {
      setSubmitted(true);
      router.push(TRANSPORT_SENDING_REQUESTS_PATH);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface-card rounded-3xl border border-border shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">{copy.modalTitle}</h3>
          <p className="text-xs text-muted-foreground mt-1">{transport.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground">{copy.messageLabel}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={copy.messagePlaceholder}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">{copy.originNotesLabel}</label>
            <input
              value={originNotes}
              onChange={(e) => setOriginNotes(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={transport.origin_label || copy.pickupPlaceholder}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">{copy.destinationNotesLabel}</label>
            <input
              value={destinationNotes}
              onChange={(e) => setDestinationNotes(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={transport.destination_label || copy.deliveryPlaceholder}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">{copy.requestedDateLabel}</label>
            <input
              type="datetime-local"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          {feedback ? (
            <p className={`text-xs font-semibold ${success ? "text-primary" : "text-destructive"}`}>
              {feedback}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {dict.common.cancel}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting || submitted}>
              {submitting ? copy.submitting : copy.submit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
