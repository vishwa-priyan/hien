import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300/80 transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}> = ({ title, subtitle, action, className = '', children }) => {
  if (children) {
    return <div className={`p-4 sm:p-5 border-b border-slate-100 ${className}`}>{children}</div>;
  }
  return (
    <div className={`flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 gap-4 ${className}`}>
      <div>
        {title && <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 rounded-b-xl ${className}`} {...props}>
      {children}
    </div>
  );
};
