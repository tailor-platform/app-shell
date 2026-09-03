/* pattern: form/composer */
import { useState } from "react";
import { Button, Card, Checkbox, Field, Form, Textarea } from "@tailor-platform/app-shell";

type Props = {
  onSubmit: (body: string, internal: boolean) => Promise<{ error?: string } | void>;
  submitting?: boolean;
};

export default function Composer({ onSubmit, submitting = false }: Props) {
  // Controlled: the body is read during render to gate Send and to swap the
  // placeholder, which a submit-time handler cannot do.
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  // Server-side rejections (moderation, rate limit) keyed by field name.
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const result = await onSubmit(body, internal);
    if (result?.error) {
      setErrors({ body: result.error });
      return;
    }
    setErrors({});
    setBody("");
  };

  return (
    <Card.Root>
      <Card.Content>
        {/*
         * The composer is a form, not a bare widget: `Form` gates Send on
         * validation, and `errors` gives a server rejection somewhere to land
         * instead of a toast.
         */}
        <Form noValidate errors={errors} onFormSubmit={handleSubmit} className="space-y-3">
          <Field.Root name="body">
            {/* Visually hidden — the Card and placeholder carry the visible
                context, but the control still needs a real label. */}
            <Field.Label className="sr-only">Reply</Field.Label>
            <Textarea
              required
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={internal ? "Internal context for teammates…" : "Reply to customer…"}
            />
            <Field.Error />
          </Field.Root>

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
                type="button"
                variant="ghost"
                onClick={() => {
                  setBody("");
                  setErrors({});
                }}
                disabled={body.length === 0 || submitting}
              >
                Discard
              </Button>
              <Button type="submit" disabled={body.trim().length === 0 || submitting}>
                {submitting ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </Form>
      </Card.Content>
    </Card.Root>
  );
}
