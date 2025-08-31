import { cn } from '../../lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
