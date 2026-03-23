import * as React from "react";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "astw:relative astw:flex astw:shrink-0 astw:items-center astw:justify-center astw:overflow-hidden astw:rounded-full astw:bg-muted astw:text-muted-foreground astw:font-medium",
  {
    variants: {
      size: {
        sm: "astw:size-6 astw:text-[10px]",
        default: "astw:size-7 astw:text-xs",
        lg: "astw:size-10 astw:text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type AvatarProps = React.ComponentProps<typeof BaseAvatar.Root> &
  VariantProps<typeof avatarVariants>;

/**
 * Root container for an avatar (image with optional fallback).
 *
 * @example
 * ```tsx
 * import { Avatar } from "@tailor-platform/app-shell";
 *
 * <Avatar.Root>
 *   <Avatar.Image src="/user.png" alt="User" />
 *   <Avatar.Fallback>AB</Avatar.Fallback>
 * </Avatar.Root>
 * ```
 */
function Root({ className, size, ...props }: AvatarProps) {
  return (
    <BaseAvatar.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  );
}
Root.displayName = "Avatar.Root";

/** Profile image; hidden when missing or failed to load. */
function Image({ className, ...props }: React.ComponentProps<typeof BaseAvatar.Image>) {
  return (
    <BaseAvatar.Image
      data-slot="avatar-image"
      className={cn("astw:size-full astw:object-cover", className)}
      {...props}
    />
  );
}
Image.displayName = "Avatar.Image";

/** Shown when there is no image or the image failed to load. */
function Fallback({ className, ...props }: React.ComponentProps<typeof BaseAvatar.Fallback>) {
  return (
    <BaseAvatar.Fallback
      data-slot="avatar-fallback"
      className={cn("astw:flex astw:size-full astw:items-center astw:justify-center", className)}
      {...props}
    />
  );
}
Fallback.displayName = "Avatar.Fallback";

export const Avatar = {
  Root,
  Image,
  Fallback,
};

export { avatarVariants, type AvatarProps };
