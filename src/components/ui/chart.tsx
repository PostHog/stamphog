import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "~/lib/utils";

export interface ChartConfig {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
  };
}

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const chartId = React.useId();
  const resolvedId = `chart-${id ?? chartId.replaceAll(":", "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-zinc-500 [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-zinc-800 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-zinc-700 [&_.recharts-reference-line_[stroke='#ccc']]:stroke-zinc-700",
          className
        )}
        data-chart={resolvedId}
      >
        <ChartStyle config={config} id={resolvedId} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, value]) => value.color);
  if (colorConfig.length === 0) {
    return null;
  }
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig
  .map(([key, value]) => `  --color-${key}: ${value.color};`)
  .join("\n")}
}
`,
      }}
    />
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  indicator = "dot",
}: RechartsPrimitive.TooltipProps<number, string> & {
  indicator?: "dot" | "line";
}) {
  const { config } = useChart();
  if (!(active && payload) || payload.length === 0) {
    return null;
  }

  return (
    <div className="min-w-36 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 shadow-xl">
      {payload.map((item) => {
        const key = String(item.dataKey ?? "value");
        const itemConfig = config[key];
        return (
          <div className="flex items-center gap-2 text-xs" key={item.name}>
            <div
              className={cn(
                "shrink-0 rounded-[2px]",
                indicator === "dot" ? "h-2 w-2" : "h-0.5 w-3"
              )}
              style={{ backgroundColor: item.color }}
            />
            <span className="text-zinc-300">
              {itemConfig?.label ?? item.name}
            </span>
            <span className="ml-auto font-mono text-zinc-100">
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
