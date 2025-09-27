import OrderTrackingApp from "@/components/OrderTrackingApp";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Tracking | Bundle Management",
  description: "Track order status by date and phone number",
};

export default function OrderTrackingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Order Status Tracking</h1>
      <OrderTrackingApp />
    </div>
  );
}
