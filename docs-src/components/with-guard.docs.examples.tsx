import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Select,
  Spinner,
  Text,
  WithGuard,
  hidden,
  pass,
  type Guard,
} from "@tailor-platform/app-shell";

export function BasicUsage() {
  const [role, setRole] = useState("Viewer");
  const guards = useMemo<Guard[]>(() => [() => (role === "Admin" ? pass() : hidden())], [role]);

  return (
    <div className="max-w-sm space-y-3">
      <Select
        aria-label="Demo role"
        items={["Viewer", "Admin"]}
        value={role}
        onValueChange={(value) => {
          if (value) setRole(value);
        }}
      />
      <Text.p>Current role: {role}</Text.p>
      <WithGuard guards={guards}>
        <Text.p role="status">Admin settings are available.</Text.p>
      </WithGuard>
    </div>
  );
}

export function WithFallback() {
  const [premium, setPremium] = useState(false);
  const guards = useMemo<Guard[]>(() => [() => (premium ? pass() : hidden())], [premium]);

  return (
    <div className="space-y-3">
      <Checkbox label="Premium subscription" checked={premium} onCheckedChange={setPremium} />
      <WithGuard
        guards={guards}
        fallback={<Text.p role="status">Upgrade to view analytics.</Text.p>}
      >
        <Text.p role="status">Premium analytics are available.</Text.p>
      </WithGuard>
    </div>
  );
}

export function WithLoadingState() {
  const [request, setRequest] = useState({ allowed: false });
  const guards = useMemo<Guard[]>(
    () => [
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        return request.allowed ? pass() : hidden();
      },
    ],
    [request],
  );

  return (
    <div className="space-y-3">
      <Checkbox
        label="Allow permission check"
        checked={request.allowed}
        onCheckedChange={(allowed) => setRequest({ allowed })}
      />
      <Button variant="outline" onClick={() => setRequest((current) => ({ ...current }))}>
        Check permission again
      </Button>
      <WithGuard
        guards={guards}
        loading={
          <div role="status" className="flex items-center gap-2">
            <Spinner />
            <Text.span>Checking permission…</Text.span>
          </div>
        }
        fallback={<Text.p role="status">Permission denied.</Text.p>}
      >
        <Text.p role="status">Permission granted.</Text.p>
      </WithGuard>
    </div>
  );
}

export function MultipleGuards() {
  const [admin, setAdmin] = useState(false);
  const [betaEnabled, setBetaEnabled] = useState(false);
  const guards = useMemo<Guard[]>(
    () => [() => (admin ? pass() : hidden()), () => (betaEnabled ? pass() : hidden())],
    [admin, betaEnabled],
  );

  return (
    <div className="space-y-3">
      <Checkbox label="Admin access" checked={admin} onCheckedChange={setAdmin} />
      <Checkbox
        label="Beta feature enabled"
        checked={betaEnabled}
        onCheckedChange={setBetaEnabled}
      />
      <WithGuard
        guards={guards}
        fallback={
          <Text.p role="status">Both admin access and the beta feature are required.</Text.p>
        }
      >
        <Text.p role="status">Beta admin feature is available.</Text.p>
      </WithGuard>
    </div>
  );
}

export function ParameterizedGuards() {
  const currentUserId = "alex";
  const [ownerId, setOwnerId] = useState("alex");
  const guards = useMemo<Guard[]>(() => {
    const isOwner =
      (resourceOwnerId: string): Guard =>
      () =>
        resourceOwnerId === currentUserId ? pass() : hidden();
    return [isOwner(ownerId)];
  }, [currentUserId, ownerId]);

  return (
    <div className="max-w-sm space-y-3">
      <Text.p>Signed in as: {currentUserId}</Text.p>
      <Select
        aria-label="Record owner"
        items={["alex", "sam"]}
        value={ownerId}
        onValueChange={(value) => {
          if (value) setOwnerId(value);
        }}
      />
      <WithGuard
        guards={guards}
        fallback={<Text.p role="status">Only the record owner can edit.</Text.p>}
      >
        <Text.p role="status">You can edit this record.</Text.p>
      </WithGuard>
    </div>
  );
}
