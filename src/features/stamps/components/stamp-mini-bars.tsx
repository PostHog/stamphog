import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import type { LeaderboardRow } from "../types";

export function StampMiniBars({
  title,
  rows,
  scoreKey,
  tone,
}: {
  title: string;
  rows: LeaderboardRow[];
  scoreKey: "stampsGiven" | "stampsRequested";
  tone: "amber" | "teal";
}) {
  const topRows = rows.slice(0, 6);
  const color = tone === "amber" ? "#f59e0b" : "#14b8a6";

  const chartConfig = {
    stamps: { label: "Stamps", color },
  } satisfies ChartConfig;

  const chartData = topRows.map((row) => ({
    name: row.displayName,
    stamps: row[scoreKey] ?? 0,
  }));

  return (
    <div className="space-y-2">
      <p className="font-medium text-sm text-zinc-200">{title}</p>
      {topRows.length === 0 && (
        <p className="text-xs text-zinc-500">No data yet.</p>
      )}
      {topRows.length > 0 && (
        <ChartContainer className="h-56 w-full" config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 0, right: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="name"
              minTickGap={12}
              tickFormatter={(value) => String(value).slice(0, 8)}
              tickLine={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: "rgba(63,63,70,0.25)" }}
            />
            <Bar
              dataKey="stamps"
              fill="var(--color-stamps)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
