import OrderTrackingWrapper from "./OrderTrackingWrapper";

// This is a server component - it won't have hydration issues
export default function OrderTrackingPage() {
  // We delegate the actual rendering to a client component
  return <OrderTrackingWrapper />;
}
