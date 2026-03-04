import * as React from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function SliderRoot({
  className,
  defaultValue,
  ...props
}: React.ComponentProps<typeof BaseSlider.Root>) {
  return (
    <BaseSlider.Root
      data-slot="slider"
      defaultValue={defaultValue}
      className={cn(
        "astw:relative astw:flex astw:w-full astw:touch-none astw:items-center astw:select-none",
        "astw:data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderTrack>
        <SliderThumb />
      </SliderTrack>
    </BaseSlider.Root>
  );
}

function SliderTrack({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseSlider.Track>) {
  return (
    <BaseSlider.Track
      data-slot="slider-track"
      className={cn(
        "astw:bg-primary/20 astw:relative astw:h-1.5 astw:w-full astw:grow astw:overflow-hidden astw:rounded-full",
        className,
      )}
      {...props}
    >
      <BaseSlider.Indicator
        data-slot="slider-range"
        className="astw:bg-primary astw:absolute astw:h-full"
      />
      {children}
    </BaseSlider.Track>
  );
}

function SliderThumb({
  className,
  ...props
}: React.ComponentProps<typeof BaseSlider.Thumb>) {
  return (
    <BaseSlider.Thumb
      data-slot="slider-thumb"
      className={cn(
        "astw:bg-background astw:border-primary/50 astw:block astw:size-4 astw:rounded-full astw:border astw:shadow-sm astw:outline-none astw:transition-colors",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}

const Slider = {
  Root: SliderRoot,
  Track: SliderTrack,
  Thumb: SliderThumb,
};

export { Slider };
