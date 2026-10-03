import React from 'react';

export type BadgeVariant = 
  | 'success' // green/teal (approved, completed, sellable)
  | 'info'    // blue (ai, active, proposed)
  | 'warning' // amber (pending, review, awaiting)
  | 'danger'  // red (rejected, exception, quarantined)
  | 'neutral' // slate/gray
  | 'purple'; // special / model

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[11px] font-medium leading-none',
    md: 'px-2.5 py-1 text-xs font-medium leading-tight',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toLowerCase();
  
  if (['approved_resale', 'approved', 'fulfilled', 'received', 'active', 'sellable', 'complete'].includes(normalized)) {
    return (
      <Badge variant="success">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  }

  if (['in_transit', 'dispatched', 'prepared', 'ready_for_pickup'].includes(normalized)) {
    return (
      <Badge variant="info">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  }

  if (['assessment_pending', 'registered', 'inspected', 'awaiting_approval', 'pending', 'reserved', 'proposed'].includes(normalized)) {
    return (
      <Badge variant="warning">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  }

  if (['rejected', 'exception', 'quarantined', 'refurbishment_required', 'not_suitable', 'cancelled', 'inactive'].includes(normalized)) {
    return (
      <Badge variant="danger">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  }

  return <Badge variant="neutral">{status.replace(/_/g, ' ')}</Badge>;
};
