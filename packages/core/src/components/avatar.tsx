import * as React from "react";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";

import { cn } from "@/lib/utils";

function AvatarRoot({ className, ...props }: React.ComponentProps<typeof BaseAvatar.Root>) {
  return (
    <BaseAvatar.Root
      data-slot="avatar"
      className={cn(
        "astw:relative astw:flex astw:size-8 astw:shrink-0 astw:overflow-hidden astw:rounded-full",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof BaseAvatar.Image>) {
  return (
    <BaseAvatar.Image
      data-slot="avatar-image"
      className={cn("astw:aspect-square astw:size-full astw:object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof BaseAvatar.Fallback>) {
  return (
    <BaseAvatar.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "astw:bg-muted astw:flex astw:size-full astw:items-center astw:justify-center astw:rounded-full astw:text-xs astw:font-medium",
        className,
      )}
      {...props}
    />
  );
}

const Avatar = {
  Root: AvatarRoot,
  Image: AvatarImage,
  Fallback: AvatarFallback,
};

export { Avatar };
