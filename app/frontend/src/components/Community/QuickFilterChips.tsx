import React from 'react';
import { TrendingUp, Clock, Coins, Vote, Flame, Star } from 'lucide-react';

interface FilterChip {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

interface QuickFilterChipsProps {
  activeFilters: string[];
  onFilterToggle: (filterId: string) => void;
  className?: string;
}

const FILTER_CHIPS: FilterChip[] = [
  {
    id: 'new',
    label: 'New',
    icon: Clock,
    color: 'blue',
    description: 'Recently created communities'
  },
  {
    id: 'trending',
    label: 'Trending',
    icon: TrendingUp,
    color: 'orange',
    description: 'Communities with growing activity'
  },
  {
    id: 'high-apr',
    label: 'High APR',
    icon: Coins,
    color: 'green',
    description: 'Best staking rewards'
  },
  {
    id: 'active-governance',
    label: 'Active Governance',
    icon: Vote,
    color: 'purple',
    description: 'Communities with live proposals'
  },
  {
    id: 'hot',
    label: 'Hot',
    icon: Flame,
    color: 'red',
    description: 'Most active right now'
  },
  {
    id: 'top',
    label: 'Top',
    icon: Star,
    color: 'yellow',
    description: 'Highest rated communities'
  }
];

const QuickFilterChips: React.FC<QuickFilterChipsProps> = ({
  activeFilters,
  onFilterToggle,
  className = ''
}) => {
  const getChipStyles = (chip: FilterChip, isActive: boolean) => {
    const colorClasses = {
      blue: isActive 
        ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-blue-900/20',
      orange: isActive
        ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-orange-900/20',
      green: isActive
        ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-green-900/20',
      purple: isActive
        ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-purple-900/20',
      red: isActive
        ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-red-900/20',
      yellow: isActive
        ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-yellow-900/20'
    };
    
    return colorClasses[chip.color as keyof typeof colorClasses];
  };

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide ${className}`}>
      {FILTER_CHIPS.map(chip => {
        const isActive = activeFilters.includes(chip.id);
        const Icon = chip.icon;
        
        return (
          <button
            key={chip.id}
            onClick={() => onFilterToggle(chip.id)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border
              text-sm font-medium whitespace-nowrap transition-all duration-200
              hover:scale-105 active:scale-95
              ${getChipStyles(chip, isActive)}
              ${isActive ? 'shadow-sm' : ''}
            `}
            title={chip.description}
          >
            <Icon className="w-4 h-4" />
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickFilterChips;
