import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon: React.ElementType;
  iconColor: string;
  borderColor: string;
  footer?: {
    label: string;
    value: string;
    color?: string;
  };
  progress?: {
    value: number;
    max?: number;
    label?: string;
  };
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  borderColor,
  footer,
  progress
}) => {
  const isPositive = change ? change.value > 0 : false;
  
  return (
    <div className={`financial-card border-l-4 ${borderColor}`}>
      <div className="financial-card-header">
        <div className="flex items-center justify-between">
          <div className="metric-label">{title}</div>
          <div className={`p-2 rounded-lg ${iconColor.replace('text-', 'bg-').replace('-500', '-50').replace('-600', '-50')} ${iconColor.replace('text-', 'bg-').replace('-500', '-500/10').replace('-600', '-600/10')}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
      </div>
      
      <div className="financial-card-content">
        <div className="metric-value">{value}</div>
        
        {change && (
          <div className="flex items-center space-x-2 mb-3">
            <div className={`metric-change ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {isPositive ? '+' : ''}{change.value}%
            </div>
            <span className="text-xs text-gray-500">{change.label}</span>
          </div>
        )}
        
        {progress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{progress.label || 'Progress'}</span>
              <span>{progress.value}{progress.max ? `/${progress.max}` : '%'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${(progress.value / (progress.max || 100)) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {footer && (
          <div className="flex justify-between items-center mt-3 text-xs">
            <span className="text-gray-500">{footer.label}</span>
            <span className={`font-medium ${footer.color || 'text-gray-900'}`}>
              {footer.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsCard;