import { ChartConfiguration, ChartOptions, ChartData } from 'chart.js';

// Base chart configuration interfaces
export interface BaseChartProps {
  data: ChartData<any>;
  options?: ChartOptions<any>;
  width?: number;
  height?: number;
  className?: string;
  onDataPointClick?: (dataPoint: any, index: number) => void;
  onHover?: (dataPoint: any, index: number) => void;
  realTime?: boolean;
  refreshInterval?: number;
}

// Interactive features configuration
export interface InteractionConfig {
  zoom: boolean;
  pan: boolean;
  drill: boolean;
  filter: boolean;
  crossFilter: boolean;
  tooltip: TooltipConfig;
}

export interface TooltipConfig {
  enabled: boolean;
  format?: (value: any, label: string) => string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}

// Chart-specific interfaces
export interface LineChartProps extends BaseChartProps {
  smooth?: boolean;
  showPoints?: boolean;
  fillArea?: boolean;
  multiAxis?: boolean;
}

export interface BarChartProps extends BaseChartProps {
  horizontal?: boolean;
  stacked?: boolean;
  grouped?: boolean;
  showValues?: boolean;
}

export interface PieChartProps extends BaseChartProps {
  showLegend?: boolean;
  showPercentages?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export interface DoughnutChartProps extends PieChartProps {
  centerText?: string;
  centerValue?: string | number;
}

// D3.js specific interfaces
export interface HeatmapProps {
  data: HeatmapData[];
  width?: number;
  height?: number;
  colorScale?: string[];
  showTooltip?: boolean;
  onCellClick?: (data: HeatmapData) => void;
  className?: string;
}

export interface HeatmapData {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
}

export interface TreemapProps {
  data: TreemapData;
  width?: number;
  height?: number;
  colorScale?: string[];
  showLabels?: boolean;
  onNodeClick?: (node: TreemapNode) => void;
  className?: string;
}

export interface TreemapData {
  name: string;
  value?: number;
  children?: TreemapNode[];
  color?: string;
}

export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
  color?: string;
}

export interface NetworkGraphProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: NetworkNode) => void;
  onLinkClick?: (link: NetworkLink) => void;
  className?: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  group?: string;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  value?: number;
  color?: string;
}

// Real-time chart interfaces
export interface RealTimeChartProps extends BaseChartProps {
  updateInterval?: number;
  maxDataPoints?: number;
  animationDuration?: number;
  bufferSize?: number;
  onDataUpdate?: (newData: any) => void;
}

// Chart theming
export interface ChartTheme {
  colors: {
    primary: string[];
    secondary: string[];
    background: string;
    text: string;
    grid: string;
    axis: string;
  };
  fonts: {
    family: string;
    size: {
      small: number;
      medium: number;
      large: number;
    };
  };
  spacing: {
    padding: number;
    margin: number;
  };
  animation: {
    duration: number;
    easing: string;
  };
}

// Data transformation utilities
export interface DataTransformer<T = any> {
  transform: (data: T[]) => ChartData<any>;
  validate: (data: T[]) => boolean;
  format: (value: any) => string;
}

// Chart configuration presets
export interface ChartPreset {
  name: string;
  description: string;
  config: Partial<ChartConfiguration>;
  theme?: Partial<ChartTheme>;
}

// Export utility types
export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'heatmap' | 'treemap' | 'network';
export type InteractionType = 'click' | 'hover' | 'zoom' | 'pan' | 'drill' | 'filter';
export type AnimationType = 'fade' | 'slide' | 'scale' | 'bounce' | 'elastic';