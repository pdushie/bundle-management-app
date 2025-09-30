/**
 * Type definitions for the accounting module
 */

export interface OrderSummary {
  id: string;
  timestamp: number;
  date: string;
  time: string;
  totalData: number;
  totalCount: number;
  estimatedCost: number;
}

export interface UserBillData {
  userId: number;
  userName: string;
  userEmail: string;
  date: string;
  orders: OrderSummary[];
  totalData: number;
  totalAmount: number;
}
