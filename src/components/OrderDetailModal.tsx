import { useState } from 'react';
import { X, Package, CheckCircle, Calendar, User, Mail, DollarSign } from 'lucide-react';

type OrderEntry = {
  number: string;
  allocationGB: number;
  status?: string;
};

type Order = {
  id: string;
  timestamp: number;
  date: string;
  time: string;
  userName: string;
  userEmail: string;
  totalData: number;
  totalCount: number;
  orderCost?: number;
  entries: OrderEntry[];
};

type OrderDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onProcess?: (orderId: string) => void;
  processLabel?: string;
  showProcessButton?: boolean;
  actionInProgress?: boolean;
};

export function OrderDetailModal({
  isOpen,
  onClose,
  order,
  onProcess,
  processLabel = "Process Order",
  showProcessButton = true,
  actionInProgress = false
}: OrderDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen) {
    return null;
  }
  
  // Filter entries based on search term
  const filteredEntries = searchTerm 
    ? order.entries.filter(entry => 
        entry.number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : order.entries;
    
  // Get the date as a string
  const orderDate = new Date(`${order.date}T${order.time}`);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(orderDate);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-blue-100 rounded-full">
                <Package className="w-5 h-5 text-blue-700" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Order #{order.id.substring(0, 8)}</h2>
            </div>
            <p className="text-sm text-gray-600">{formattedDate}</p>
          </div>
          
          <button 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Order Info */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                <User className="w-4 h-4" /> From
              </p>
              <p className="font-medium">{order.userName}</p>
              <p className="text-sm text-gray-600">{order.userEmail}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Submitted
              </p>
              <p className="font-medium">{order.date}</p>
              <p className="text-sm text-gray-600">{order.time}</p>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium text-sm">
              {order.totalCount} {order.totalCount === 1 ? 'number' : 'numbers'}
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium text-sm">
              {order.totalData.toFixed(2)} GB
            </div>
            {order.orderCost !== undefined && (
              <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium text-sm flex items-center">
                <DollarSign className="w-4 h-4 mr-0.5" />
                {order.orderCost.toFixed(2)}
              </div>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by number..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="mt-2 text-sm text-gray-600">
            Showing {filteredEntries.length} of {order.entries.length} numbers
            {searchTerm && (
              <button
                className="ml-2 text-blue-600 hover:text-blue-800"
                onClick={() => setSearchTerm('')}
              >
                Clear search
              </button>
            )}
          </div>
        </div>
        
        {/* Numbers List */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredEntries.map((entry, idx) => (
              <div 
                key={idx} 
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{entry.number}</p>
                  <p className="text-sm text-gray-600">{entry.allocationGB.toFixed(2)} GB</p>
                </div>
                {entry.status === 'sent' && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Sent</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {filteredEntries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No matching numbers found
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
          
          {showProcessButton && onProcess && (
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              onClick={() => onProcess(order.id)}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {processLabel}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
