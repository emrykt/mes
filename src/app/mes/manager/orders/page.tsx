"use client";

import OrdersBoard from "@/components/mes/OrdersBoard";

/** Production Management sees orders read-only (tracking); entry is Sales. */
export default function MesOrdersPage() {
  return <OrdersBoard allowCreate={false} />;
}
