/* pattern: form/composer */
import { useState } from "react";
import { Button, Card, Checkbox, Textarea } from "@tailor-platform/app-shell";

type Props = {
  onSubmit: (body: string, internal: boolean) => void;
  submitting?: boolean;
};

export default function Composer({ onSubmit, submitting = false }: Props) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);

  return (
    <Card.Root>
      <Card.Content>
        <div className="space-y-3">
          <Textarea
            aria-label="Reply"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={internal ? "Internal context for teammates…" : "Reply to customer…"}
            rows={4}
          />
          <div className="flex items-center justify-between gap-2">
            {/* Options slot — 0..N controls that qualify the submission. An
                internal-note toggle here; swap for an attachment button, a
                visibility Select, a template picker, or drop it entirely. */}
            <div className="flex min-w-0 items-center gap-2">
              <Checkbox
                label="Internal note (not sent to customer)"
                checked={internal}
                onCheckedChange={setInternal}
              />
            </div>
            {/* Action slot — fixed shape: optional ghost Discard, then exactly
                one primary submit. Never more than one primary. */}
            <div className="flex shrink-0 gap-2">
              <Button
                variant="ghost"
                onClick={() => setBody("")}
                disabled={body.length === 0 || submitting}
              >
                Discard
              </Button>
              <Button
                onClick={() => onSubmit(body, internal)}
                disabled={body.trim().length === 0 || submitting}
              >
                {submitting ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  );
}
