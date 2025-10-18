export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: ReportSection[];
  parameters: ReportParameter[];
  scheduling: SchedulingConfig;
  permissions: ReportPermissions;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isPublic: boolean;
  tags: string[];
}

export interface ReportSection {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'image';
  title: string;
  description?: string;
  position: { x: number; y: number; width: number; height: number };
  config: SectionConfig;
  dataSource: DataSourceConfig;
  styling: SectionStyling;
}

export interface SectionConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'heatmap' | 'scatter';
  columns?: string[];
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  filters?: FilterConfig[];
  sorting?: SortConfig[];
  groupBy?: string[];
  timeRange?: TimeRangeConfig;
}

export interface DataSourceConfig {
  type: 'database' | 'api' | 'file' | 'realtime';
  connection: string;
  query: string;
  refreshInterval?: number;
  cacheTimeout?: number;
}

export interface ReportParameter {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  label: string;
  description?: string;
  defaultValue?: any;
  required: boolean;
  options?: ParameterOption[];
  validation?: ValidationRule[];
}

export interface ParameterOption {
  value: any;
  label: string;
  description?: string;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface SchedulingConfig {
  enabled: boolean;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'html';
}

export interface ReportPermissions {
  view: string[];
  edit: string[];
  delete: string[];
  schedule: string[];
  share: string[];
}

export interface SectionStyling {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
}

export interface FilterConfig {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  label?: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export interface TimeRangeConfig {
  type: 'relative' | 'absolute';
  start?: Date;
  end?: Date;
  period?: 'last_hour' | 'last_day' | 'last_week' | 'last_month' | 'last_quarter' | 'last_year';
  customPeriod?: number;
  customUnit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
}

export interface ReportExecution {
  id: string;
  templateId: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  resultUrl?: string;
  errorMessage?: string;
  executedBy: string;
  format: 'pdf' | 'excel' | 'csv' | 'html' | 'json';
  size?: number;
}

export interface ReportData {
  sections: SectionData[];
  metadata: ReportMetadata;
  parameters: Record<string, any>;
  generatedAt: Date;
}

export interface SectionData {
  sectionId: string;
  data: any[];
  columns?: ColumnDefinition[];
  summary?: SummaryData;
  error?: string;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  format?: string;
  sortable?: boolean;
  filterable?: boolean;
}

export interface SummaryData {
  totalRows: number;
  aggregations: Record<string, number>;
  trends: TrendData[];
}

export interface TrendData {
  metric: string;
  change: number;
  changePercent: number;
  period: string;
  direction: 'up' | 'down' | 'stable';
}

export interface ReportMetadata {
  title: string;
  description?: string;
  author: string;
  generatedAt: Date;
  parameters: Record<string, any>;
  dataSourcesUsed: string[];
  executionTime: number;
  recordCount: number;
  version: string;
}

export interface ReportBuilderState {
  template: Partial<ReportTemplate>;
  selectedSection?: string;
  draggedComponent?: ComponentDefinition;
  previewMode: boolean;
  validationErrors: ValidationError[];
  isDirty: boolean;
}

export interface ComponentDefinition {
  type: 'chart' | 'table' | 'metric' | 'text' | 'image';
  icon: string;
  label: string;
  description: string;
  defaultConfig: Partial<SectionConfig>;
  requiredFields: string[];
}

export interface ValidationError {
  sectionId?: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DataSourceConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'api' | 'file';
  config: ConnectionConfig;
  status: 'active' | 'inactive' | 'error';
  lastTested: Date;
  createdBy: string;
}

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
  ssl?: boolean;
}

export interface QueryResult {
  data: any[];
  columns: ColumnDefinition[];
  totalRows: number;
  executionTime: number;
  error?: string;
}

export interface ReportShare {
  id: string;
  reportId: string;
  shareType: 'public' | 'private' | 'organization';
  shareUrl: string;
  expiresAt?: Date;
  password?: string;
  allowedUsers?: string[];
  permissions: SharePermissions;
  createdBy: string;
  createdAt: Date;
}

export interface SharePermissions {
  view: boolean;
  download: boolean;
  comment: boolean;
  share: boolean;
}