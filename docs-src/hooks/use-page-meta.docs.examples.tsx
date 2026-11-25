import { useState } from "react";
import { Field, Select, Text, usePageMeta } from "@tailor-platform/app-shell";

export function MetadataLookup() {
  const [path, setPath] = useState("/components/button");
  const meta = usePageMeta(path);

  return (
    <div className="flex flex-col gap-3">
      <Field.Root name="metadataPath">
        <Field.Label>Route path</Field.Label>
        <Select
          items={[
            "/components/button",
            "/components/select",
            "/components",
            "/not-a-doc-page",
            "https://example.com",
          ]}
          value={path}
          onValueChange={(value) => {
            if (value) setPath(value);
          }}
        />
        <Field.Description>Reads the surrounding docs app without navigating.</Field.Description>
      </Field.Root>
      <div aria-live="polite" className="space-y-2">
        {meta ? (
          <>
            <Text.p>Title: {meta.title}</Text.p>
            <div className="flex items-center gap-2">
              <Text.span>Icon: {meta.icon ? "Available" : "None"}</Text.span>
              <span aria-hidden="true" className="[&>svg]:size-5">
                {meta.icon}
              </span>
            </div>
          </>
        ) : (
          <Text.p>No metadata (null).</Text.p>
        )}
      </div>
    </div>
  );
}
