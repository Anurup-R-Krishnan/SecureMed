"use client";

import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

interface BreadcrumbItemType {
  href?: string;
  label: string;
}

interface ResponsiveBreadcrumbProps {
  items: BreadcrumbItemType[];
  maxItems?: number;
  className?: string;
}

export function ResponsiveBreadcrumb({
  items,
  maxItems = 3,
  className,
}: ResponsiveBreadcrumbProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Logic to determine which items to show
  const visibleItems = React.useMemo(() => {
    if (isExpanded || items.length <= maxItems) {
      return items.map((item, index) => ({
        type: "item" as const,
        href: item.href,
        label: item.label,
        index,
      }));
    }

    const firstItem = {
      type: "item" as const,
      href: items[0].href,
      label: items[0].label,
      index: 0,
    };

    const lastItems = items.slice(-(maxItems - 1)).map((item, i) => ({
      type: "item" as const,
      href: item.href,
      label: item.label,
      index: items.length - (maxItems - 1) + i,
    }));

    return [firstItem, { type: "ellipsis" as const }, ...lastItems];
  }, [items, isExpanded, maxItems]);

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {visibleItems.map((item, i) => {
          if (item.type === "ellipsis") {
            return (
              <React.Fragment key="ellipsis">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbEllipsis
                    className="h-4 w-4 cursor-pointer hover:text-foreground"
                    onClick={() => setIsExpanded(true)}
                  />
                  <span className="sr-only">Show more</span>
                </BreadcrumbItem>
              </React.Fragment>
            );
          }

          const isLast = item.index === items.length - 1;
          const isFirst = item.index === 0;

          return (
            <React.Fragment key={item.index}>
              {!isFirst && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="max-w-[20ch] truncate font-semibold">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={item.href}
                    className="max-w-[20ch] truncate"
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
