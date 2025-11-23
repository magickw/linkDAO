import { ChartTheme } from './types';

// Admin dashboard color palette
export const adminColors = {
  primary: [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
  ],
  secondary: [
    '#93C5FD', // Light Blue
    '#6EE7B7', // Light Emerald
    '#FCD34D', // Light Amber
    '#FCA5A5', // Light Red
    '#C4B5FD', // Light Violet
    '#67E8F9', // Light Cyan
    '#BEF264', // Light Lime
    '#FDBA74', // Light Orange
  ],
  gradients: {
    blue: ['#3B82F6', '#1E40AF'],
    emerald: ['#10B981', '#047857'],
    amber: ['#F59E0B', '#D97706'],
    red: ['#EF4444', '#DC2626'],
    violet: ['#8B5CF6', '#7C3AED'],
    cyan: ['#06B6D4', '#0891B2'],
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

// Default admin chart theme
export const defaultAdminTheme: ChartTheme = {
  colors: {
    primary: adminColors.primary,
    secondary: adminColors.secondary,
    background: '#FFFFFF',
    text: adminColors.neutral[700],
    grid: adminColors.neutral[200],
    axis: adminColors.neutral[400],
  },
  fonts: {
    family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: {
      small: 12,
      medium: 14,
      large: 16,
    },
  },
  spacing: {
    padding: 16,
    margin: 8,
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart',
  },
};

// Dark theme variant
export const darkAdminTheme: ChartTheme = {
  ...defaultAdminTheme,
  colors: {
    ...defaultAdminTheme.colors,
    background: adminColors.neutral[900],
    text: adminColors.neutral[100],
    grid: adminColors.neutral[700],
    axis: adminColors.neutral[500],
  },
};

// Chart.js theme configuration generator
export const generateChartJsTheme = (theme: ChartTheme = defaultAdminTheme) => {
  // Ensure theme is defined, fallback to defaultAdminTheme if undefined
  const validTheme = theme || defaultAdminTheme;
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: validTheme.colors.text,
          font: {
            family: validTheme.fonts.family,
            size: validTheme.fonts.size.medium,
          },
          padding: validTheme.spacing.padding,
        },
      },
      tooltip: {
        backgroundColor: validTheme.colors.background,
        titleColor: validTheme.colors.text,
        bodyColor: validTheme.colors.text,
        borderColor: validTheme.colors.grid,
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          family: validTheme.fonts.family,
          size: validTheme.fonts.size.medium,
          weight: 'bold',
        },
        bodyFont: {
          family: validTheme.fonts.family,
          size: validTheme.fonts.size.small,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: validTheme.colors.grid,
          borderColor: validTheme.colors.axis,
        },
        ticks: {
          color: validTheme.colors.text,
          font: {
            family: validTheme.fonts.family,
            size: validTheme.fonts.size.small,
          },
        },
      },
      y: {
        grid: {
          color: validTheme.colors.grid,
          borderColor: validTheme.colors.axis,
        },
        ticks: {
          color: validTheme.colors.text,
          font: {
            family: validTheme.fonts.family,
            size: validTheme.fonts.size.small,
          },
        },
      },
    },
    animation: {
      duration: validTheme.animation.duration,
      easing: validTheme.animation.easing,
    },
  };
};

// D3.js color scales
export const d3ColorScales = {
  sequential: {
    blue: ['#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'],
    emerald: ['#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46'],
    amber: ['#FFFBEB', '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E'],
  },
  diverging: {
    redBlue: ['#B91C1C', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FEE2E2', '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8', '#1E40AF'],
    greenRed: ['#065F46', '#047857', '#059669', '#10B981', '#34D399', '#FEE2E2', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C'],
  },
  categorical: adminColors.primary,
};

// Preset chart configurations
export const chartPresets = {
  dashboard: {
    name: 'Dashboard',
    description: 'Standard dashboard charts with clean styling',
    config: {
      options: generateChartJsTheme(),
    },
  },
  presentation: {
    name: 'Presentation',
    description: 'High-contrast charts suitable for presentations',
    config: {
      options: {
        ...generateChartJsTheme(),
        plugins: {
          ...generateChartJsTheme().plugins,
          legend: {
            ...generateChartJsTheme().plugins.legend,
            labels: {
              ...generateChartJsTheme().plugins.legend.labels,
              font: {
                ...generateChartJsTheme().plugins.legend.labels.font,
                size: 16,
              },
            },
          },
        },
      },
    },
  },
  minimal: {
    name: 'Minimal',
    description: 'Clean, minimal styling with reduced visual elements',
    config: {
      options: {
        ...generateChartJsTheme(),
        plugins: {
          ...generateChartJsTheme().plugins,
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            ...generateChartJsTheme().scales.x,
            grid: {
              display: false,
            },
          },
          y: {
            ...generateChartJsTheme().scales.y,
            grid: {
              ...generateChartJsTheme().scales.y.grid,
              drawBorder: false,
            },
          },
        },
      },
    },
  },
};

// Utility functions for theme management
export const getColorByIndex = (index: number, palette: string[] = adminColors.primary): string => {
  return palette[index % palette.length];
};

export const generateGradient = (ctx: CanvasRenderingContext2D, colorStart: string, colorEnd: string, vertical = true): CanvasGradient => {
  const gradient = vertical 
    ? ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
    : ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
  
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
};

export const applyThemeToChart = (chartConfig: any, theme: ChartTheme | undefined = defaultAdminTheme): any => {
  // Ensure theme is defined, fallback to defaultAdminTheme if undefined
  const validTheme = theme || defaultAdminTheme;
  return {
    ...chartConfig,
    options: {
      ...chartConfig.options,
      ...generateChartJsTheme(validTheme),
    },
  };
};