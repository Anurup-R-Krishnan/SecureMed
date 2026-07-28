import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface WidgetCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  onClick?: () => void;
}

export function WidgetCard({
  title,
  description,
  icon: Icon,
  children,
  action,
  footer,
  className,
  contentClassName,
  onClick,
}: WidgetCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden",
        onClick && "cursor-pointer hover:border-primary/50 transition-colors",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary" />}
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </CardHeader>
      <CardContent className={cn("pt-4", contentClassName)}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className="bg-muted/30 pt-4 pb-4 border-t">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

export interface MetricCardProps extends Omit<WidgetCardProps, "children"> {
  value: string | number;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  icon,
  trend,
  loading,
  className,
  onClick,
}: MetricCardProps) {
  return (
    <WidgetCard
      title={title}
      icon={icon}
      className={className}
      onClick={onClick}
    >
      {loading ? (
        <div className="h-8 w-1/2 bg-muted animate-pulse rounded" />
      ) : (
        <>
          <div className="text-3xl font-bold">{value}</div>
          {trend && (
            <p className="text-xs mt-2 flex items-center gap-1">
              <span
                className={
                  trend.isPositive ? "text-emerald-500" : "text-rose-500"
                }
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground">{trend.label}</span>
            </p>
          )}
        </>
      )}
    </WidgetCard>
  );
}
