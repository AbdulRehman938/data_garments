import { cn } from '../../utils/cn'

interface SkeletonProps {
  className?: string
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
        className
      )}
    />
  )
}

export const SkeletonCard = ({ className }: SkeletonProps) => {
  return (
    <div className={cn('bg-white rounded-2xl border border-logo-rose/20 p-6', className)}>
      <Skeleton className="h-4 w-24 rounded mb-4" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  )
}

export const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number, columns?: number }) => {
  return (
    <div className="bg-white rounded-2xl border border-logo-rose/20 overflow-hidden">
      <div className="p-4 border-b border-logo-rose/10 bg-bg-silk-glow/30 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20 rounded" />
        ))}
      </div>
      <div className="divide-y divide-logo-rose/8">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-3 w-20 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}