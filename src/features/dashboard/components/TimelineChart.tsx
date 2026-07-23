import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '../../../components/ui/chart';
import type { DailyAcquisitionPoint } from '../../candidates/types/candidate.types';

interface TimelineChartProps {
  data: DailyAcquisitionPoint[];
  loading: boolean;
}

const chartConfig = {
  received: {
    label: 'Profiles Received',
    color: 'var(--hf-info)',
  },
  shortlisted: {
    label: 'Shortlisted',
    color: 'var(--hf-success)',
  },
} satisfies ChartConfig;

export function TimelineChart({ data, loading }: TimelineChartProps) {
  if (loading) {
    return (
      <div className="dash-chart-placeholder skeleton-animation">
        <div className="chart-skeleton-bar"></div>
        <div className="chart-skeleton-text">Loading Acquisition Graph...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="dash-chart-placeholder dash-chart-empty">
        <p>No acquisition data available yet.</p>
        <span>Get started by adding or processing new candidate resumes.</span>
      </div>
    );
  }

  // Format date strings for the XAxis tick marks (e.g., "July 12")
  function formatDateLabel(dateStr: string) {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Calculate suitable tick intervals based on range sizes
  const interval = data.length > 30 ? 10 : data.length > 7 ? 4 : 0;

  return (
    <div className="dash-timeline-chart-container">
      <ChartContainer config={chartConfig} className="w-full h-full min-h-[280px]">
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 10,
            left: -20, // Negative margin pulls chart layout flush to clear grid boundaries
            bottom: 5,
          }}
        >
          <defs>
            {/* SVG neomorphic line glows */}
            <filter id="blueLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="greenLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid
            vertical={false}
            strokeDasharray="4 4"
            stroke="var(--hf-border)"
            opacity={0.35}
          />
          
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            interval={interval}
            tickFormatter={formatDateLabel}
            className="chart-axis-label"
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            allowDecimals={false}
            className="chart-axis-label"
          />

          <Tooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => {
                  const parts = String(value).split('-');
                  if (parts.length < 3) return value;
                  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  return dateObj.toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                }}
              />
            }
            cursor={{
              stroke: 'var(--hf-accent)',
              strokeWidth: 1.5,
              strokeDasharray: '3 3',
              strokeOpacity: 0.6,
            }}
          />

          <Line
            type="monotone"
            dataKey="received"
            stroke="var(--color-received)"
            strokeWidth={2.5}
            dot={data.length <= 15 ? { r: 4, strokeWidth: 1, fill: 'var(--hf-card-bg)' } : false}
            activeDot={{ r: 6, strokeWidth: 0 }}
            filter="url(#blueLineGlow)"
            animationDuration={600}
          />

          <Line
            type="monotone"
            dataKey="shortlisted"
            stroke="var(--color-shortlisted)"
            strokeWidth={2.5}
            dot={data.length <= 15 ? { r: 4, strokeWidth: 1, fill: 'var(--hf-card-bg)' } : false}
            activeDot={{ r: 6, strokeWidth: 0 }}
            filter="url(#greenLineGlow)"
            animationDuration={600}
          />

          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
