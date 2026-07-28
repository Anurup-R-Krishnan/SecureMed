"use client";

import { Card } from "@/components/ui/card";
import {
  Heart,
  AlertTriangle,
  Lightbulb,
  Droplet,
  Apple,
  Dumbbell,
  Moon,
  Brain,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HealthInsights {
  chronic_conditions: string[];
  allergies: string[];
  wellness_tip: {
    title: string;
    description: string;
    category: string;
  } | null;
}

interface HealthInsightsCardProps {
  insights: HealthInsights | null;
}

export default function HealthInsightsCard({
  insights,
}: HealthInsightsCardProps) {
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "hydration":
        return Droplet;
      case "nutrition":
        return Apple;
      case "exercise":
        return Dumbbell;
      case "sleep":
        return Moon;
      case "mental":
        return Brain;
      default:
        return Lightbulb;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "hydration":
        return "text-blue-500 bg-blue-500/10";
      case "nutrition":
        return "text-green-500 bg-green-500/10";
      case "exercise":
        return "text-orange-500 bg-orange-500/10";
      case "sleep":
        return "text-purple-500 bg-purple-500/10";
      case "mental":
        return "text-pink-500 bg-pink-500/10";
      default:
        return "text-amber-500 bg-amber-500/10";
    }
  };

  const hasConditions =
    insights?.chronic_conditions && insights.chronic_conditions.length > 0;
  const hasAllergies = insights?.allergies && insights.allergies.length > 0;
  const hasTip = insights?.wellness_tip;

  if (!hasConditions && !hasAllergies && !hasTip) {
    return (
      <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-rose-500" />
          <h3 className="font-semibold text-lg">Health Insights</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No health insights available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white/5 backdrop-blur-md border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="h-5 w-5 text-rose-500" />
        <h3 className="font-semibold text-lg">Health Insights</h3>
      </div>

      <div className="space-y-4">
        {/* Chronic Conditions */}
        {hasConditions && (
          <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-rose-500" />
              <h4 className="font-semibold text-sm text-foreground">
                Chronic Conditions
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.chronic_conditions.map((condition, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-rose-50 text-rose-700 border-rose-200"
                >
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Allergies */}
        {hasAllergies && (
          <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h4 className="font-semibold text-sm text-foreground">
                Allergies
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.allergies.map((allergy, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Wellness Tip */}
        {hasTip && insights.wellness_tip && (
          <div
            className={`p-4 rounded-xl border ${getCategoryColor(insights.wellness_tip.category).replace("text-", "border-").replace("bg-", "bg-").replace("/10", "/20")}`}
          >
            <div className="flex items-start gap-3">
              {(() => {
                const Icon = getCategoryIcon(insights.wellness_tip.category);
                return (
                  <div
                    className={`h-10 w-10 shrink-0 rounded-lg ${getCategoryColor(insights.wellness_tip.category)} flex items-center justify-center`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                );
              })()}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground">
                    {insights.wellness_tip.title}
                  </h4>
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {insights.wellness_tip.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insights.wellness_tip.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
