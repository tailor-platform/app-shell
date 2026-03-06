import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("astw:bg-accent astw:animate-pulse astw:rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
