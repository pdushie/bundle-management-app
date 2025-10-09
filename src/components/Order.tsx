import { formatDistanceToNow } from 'date-fns';
import { Package, Check, X, ArrowRight, FileText, Trash2, DollarSign } from 'lucide-react';

type OrderProps = {
  id: string;
  date: string;
  time: string;
  userName: string;
  userEmail: string;
  totalData: number;
  totalCount: number;
  orderCost?: number;
  estimatedCost?: number; // Add estimated cost
  status?: string; // Add status field
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onProcess?: (id: string) => void;
};

export function Order({
  id,
  date,
  time,
  userName,
  userEmail,
  totalData,
  totalCount,
  orderCost,
  estimatedCost,
  status,
  isSelected = false,
  onSelect,
  onProcess
}: OrderProps) {
  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', { 
      style: 'currency', 
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(amount);
  };
  // Parse the order date for relative time
  const orderDate = new Date(`${date}T${time}`);
  const timeAgo = formatDistanceToNow(orderDate, { addSuffix: true });

  return (
    <div 
      className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
      }`}
      onClick={() => onSelect && onSelect(id)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-full">
            <Package className="w-4 h-4 text-blue-700" />
          </div>
          <span className="font-medium text-sm md:text-base">Order #{id.substring(0, 8)}</span>
        </div>
        
        {onProcess && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onProcess(id);
            }}
            className="bg-green-100 hover:bg-green-200 text-green-700 text-xs px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
          >
            <ArrowRight className="w-3 h-3" />
            <span>Process</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
        <div>
          <p className="text-xs text-gray-700">From</p>
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-gray-700 truncate">{userEmail}</p>
        </div>
        <div>
          <p className="text-xs text-gray-700">Submitted</p>
          <p className="text-sm">{timeAgo}</p>
          <p className="text-xs text-gray-700">{date} at {time}</p>
        </div>
      </div>
      
      <div className="mt-3 flex items-center gap-4">
        <div>
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
            {totalCount} {totalCount === 1 ? 'number' : 'numbers'}
          </span>
        </div>
        <div>
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
            {totalData.toFixed(2)} GB
          </span>
        </div>
        {(orderCost !== undefined || estimatedCost !== undefined) && (
          <div>
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full flex items-center">
              <DollarSign className="w-3 h-3 mr-0.5" />
              {formatCurrency(estimatedCost || orderCost || 0)}
              {status === 'pending' && estimatedCost && (
                <span className="ml-1 text-xs opacity-75">(Est.)</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
