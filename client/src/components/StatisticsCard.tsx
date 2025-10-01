import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatisticsCardProps {
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
}

export const StatisticsCard = ({
  icon: Icon,
  iconBgColor,
  iconColor,
  title,
  value,
  change,
  changeLabel,
}: StatisticsCardProps): JSX.Element => {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", iconBgColor)}>
                <Icon className={cn("w-6 h-6", iconColor)} />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <ArrowUpIcon className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownIcon className="w-4 h-4 text-red-600" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-green-600" : "text-red-600"
              )}>
                {Math.abs(change)}%
              </span>
              <span className="text-sm text-gray-500">{changeLabel}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
