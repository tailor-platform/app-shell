import { Button, Spinner } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return <Spinner aria-label="Loading" />;
}

export function AccessibleLoading() {
  return <Spinner size="sm" aria-label="Loading orders" />;
}

export function DecorativeLoading() {
  return (
    <Button disabled>
      <Spinner size="sm" aria-hidden />
      Saving
    </Button>
  );
}

export function SizingAndStyling() {
  return (
    <div className="flex items-center gap-3">
      <Spinner className="text-muted-foreground" />
      <Spinner size="lg" className="text-primary" aria-label="Generating report" />
      <Spinner width={24} height={24} aria-label="Loading" />
    </div>
  );
}
