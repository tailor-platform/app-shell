import * as React from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function AccordionRoot({ className, ...props }: React.ComponentProps<typeof BaseAccordion.Root>) {
  return (
    <BaseAccordion.Root
      data-slot="accordion"
      className={cn("astw:flex astw:flex-col", className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof BaseAccordion.Item>) {
  return (
    <BaseAccordion.Item
      data-slot="accordion-item"
      className={cn("astw:border-b", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Trigger>) {
  return (
    <BaseAccordion.Header data-slot="accordion-header">
      <BaseAccordion.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "astw:flex astw:flex-1 astw:w-full astw:items-center astw:justify-between astw:py-4 astw:text-left astw:text-sm astw:font-medium astw:outline-none astw:transition-all",
          "astw:hover:underline",
          "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
          "astw:disabled:pointer-events-none astw:disabled:opacity-50",
          "astw:[&[data-panel-open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="astw:size-4 astw:shrink-0 astw:text-muted-foreground astw:transition-transform astw:duration-200" />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Panel>) {
  return (
    <BaseAccordion.Panel
      data-slot="accordion-content"
      className={cn("astw:overflow-hidden astw:text-sm", className)}
      {...props}
    >
      <div className="astw:pb-4 astw:pt-0">{children}</div>
    </BaseAccordion.Panel>
  );
}

const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
};

export { Accordion };
