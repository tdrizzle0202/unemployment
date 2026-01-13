import { cn } from '@/lib/utils/cn';

interface LikelihoodBadgeProps {
  likelihood: 'high' | 'medium' | 'low' | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

export function LikelihoodBadge({ likelihood, size = 'md' }: LikelihoodBadgeProps) {
  if (!likelihood) return null;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const colorClasses = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-red-100 text-red-800 border-red-200',
  };

  const labels = {
    high: 'High Likelihood',
    medium: 'Medium Likelihood',
    low: 'Low Likelihood',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        sizeClasses[size],
        colorClasses[likelihood]
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full mr-2',
          likelihood === 'high' && 'bg-green-500',
          likelihood === 'medium' && 'bg-yellow-500',
          likelihood === 'low' && 'bg-red-500'
        )}
      />
      {labels[likelihood]}
    </span>
  );
}
