import { Avatar } from "../avatar";
import { Root, Items, Item, formatTimestamp, getInitials } from "./ActivityCard";

import type { ActivityCardProps, ActivityCardItem } from "./types";

// ============================================================================
// STANDALONE (pre-assembled) — backwards-compatible with the original API
// ============================================================================

/**
 * Pre-assembled ActivityCard that renders activities with avatars, descriptions,
 * and timestamps. For custom item rendering, use ActivityCard.Root / .Items / .Item.
 */
function ActivityCardStandalone({
  items,
  title,
  maxVisible = 6,
  overflowLabel = "more",
  groupBy = "none",
  className,
}: ActivityCardProps) {
  return (
    <Root
      items={items}
      title={title}
      maxVisible={maxVisible}
      overflowLabel={overflowLabel}
      groupBy={groupBy}
      className={className}
    >
      <Items<ActivityCardItem>>
        {(item) => {
          const actorName = item.actor?.name;
          return (
            <Item
              key={item.id}
              indicator={
                actorName ? (
                  <Avatar.Root aria-hidden>
                    {item.actor?.avatarUrl ? (
                      <Avatar.Image src={item.actor.avatarUrl} alt="" />
                    ) : null}
                    <Avatar.Fallback>{getInitials(actorName)}</Avatar.Fallback>
                  </Avatar.Root>
                ) : undefined
              }
            >
              <p className="astw:text-sm astw:font-medium astw:leading-normal astw:text-foreground">
                {actorName ? <span>{actorName}</span> : null}
                {actorName ? " " : null}
                <span className="astw:text-muted-foreground">{item.description}</span>
              </p>
              <p className="astw:text-xs astw:leading-none astw:text-muted-foreground">
                {formatTimestamp(item.timestamp)}
              </p>
            </Item>
          );
        }}
      </Items>
    </Root>
  );
}

// ============================================================================
// COMBINED EXPORT
// ============================================================================

const ActivityCard = Object.assign(ActivityCardStandalone, {
  Root,
  Items,
  Item,
});

export { ActivityCard };
