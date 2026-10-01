import { useState } from "react";

import { Button, Card, Checkbox, Field, Form, Textarea } from "@tailor-platform/app-shell";

export function FormComposer() {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    window.alert(`Sending ${internal ? "internal note" : "reply"}: ${body}`);
    setErrors({});
    setBody("");
  };

  return (
    <Card.Root>
      <Card.Content>
        <Form noValidate errors={errors} onFormSubmit={handleSubmit} className="space-y-3">
          <Field.Root name="body">
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
            <div className="flex min-w-0 items-center gap-2">
              <Checkbox
                label="Internal note (not sent to customer)"
                checked={internal}
                onCheckedChange={setInternal}
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setBody("");
                  setErrors({});
                }}
                disabled={body.length === 0}
              >
                Discard
              </Button>
              <Button type="submit" disabled={body.trim().length === 0}>
                Send
              </Button>
            </div>
          </div>
        </Form>
      </Card.Content>
    </Card.Root>
  );
}
