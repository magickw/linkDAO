export interface Flair {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  textColor: string;
  description?: string;
  moderatorOnly: boolean;
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  LINK = 'link',
  POLL = 'poll',
  PROPOSAL = 'proposal'
}

export interface FilterState {
  flair: string[];
  author: string[];
  timeRange: DateRange;
  contentType: ContentType[];
}

export interface FilterPanelProps {
  availableFlairs: Flair[];
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  color?: string;
}

export interface AuthorSuggestion {
  id: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  postCount: number;
}