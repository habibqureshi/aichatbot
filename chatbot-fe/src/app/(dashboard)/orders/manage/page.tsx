"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { getOrderById, Order } from "@/app/actions/orders";
import { formatDate, formatTime } from "@/lib/utils";
import { StatusBadge } from "@/lib/statusUtils";

function OrderDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    const loadOrder = async () => {
      try {
        setLoading(true);
        const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const data = await getOrderById(Number(orderId), user_timezone);
        setOrder(data);
      } catch (error: unknown) {
        console.error("Error loading order details:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load order details");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [orderId]);

  const totalQty = useMemo(
    () => (order?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [order?.items],
  );

  if (loading) {
    return (
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-64 bg-gray-200 rounded" />
          <div className="h-24 w-full bg-gray-100 rounded-xl" />
          <div className="h-64 w-full bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-2 sm:p-4 lg:p-6">
        <button onClick={() => router.push("/orders")} className="mb-4 text-sm text-[#6325A9] hover:underline">
          {"< Back to Orders"}
        </button>
        <div className="rounded-xl bg-white border border-[#E8E3FF] p-6 text-gray-600">
          Order not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push("/orders")} className="text-sm text-[#6325A9] hover:underline">
            {"< Back to Orders"}
          </button>
          <h1 className="text-2xl font-semibold text-[#000000] mt-2">
            Order ORD-{String(order.id).padStart(3, "0")}
          </h1>
          <p className="text-sm text-[#787878] mt-1">View order metadata and item lines.</p>
        </div>
        <StatusBadge status={order.status || "N/A"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-[#E8E3FF] p-4">
          <p className="text-xs text-[#8695AA] uppercase tracking-widest">Customer</p>
          <p className="text-base font-medium text-[#23272E] mt-2">{order.customer?.name || "N/A"}</p>
          <p className="text-sm text-[#64748B]">{order.customer?.phone_number || "N/A"}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#E8E3FF] p-4">
          <p className="text-xs text-[#8695AA] uppercase tracking-widest">Created</p>
          <p className="text-base font-medium text-[#23272E] mt-2">{formatDate(order.created_at)}</p>
          <p className="text-sm text-[#64748B]">{formatTime(order.created_at)}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#E8E3FF] p-4">
          <p className="text-xs text-[#8695AA] uppercase tracking-widest">Total</p>
          <p className="text-base font-medium text-[#23272E] mt-2">{Number(order.total_amount || 0).toFixed(2)}</p>
          <p className="text-sm text-[#64748B]">{totalQty} qty</p>
        </div>
        <div className="rounded-xl bg-white border border-[#E8E3FF] p-4">
          <p className="text-xs text-[#8695AA] uppercase tracking-widest">Delivery Address</p>
          <p className="text-sm font-medium text-[#23272E] mt-2 break-words">
            {order.delivery_address || "N/A"}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#E8E3FF] p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#23272E] mb-4">Order Items</h2>
        <div className="overflow-auto">
          <table className="min-w-[700px] w-full">
            <thead>
              <tr className="border-b border-[#E8E3FF]">
                <th className="text-left py-2 text-xs text-[#8695AA] uppercase tracking-widest">Line</th>
                <th className="text-left py-2 text-xs text-[#8695AA] uppercase tracking-widest">Item</th>
                <th className="text-left py-2 text-xs text-[#8695AA] uppercase tracking-widest">Qty</th>
                <th className="text-left py-2 text-xs text-[#8695AA] uppercase tracking-widest">Unit Price</th>
                <th className="text-left py-2 text-xs text-[#8695AA] uppercase tracking-widest">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.length > 0 ? (
                order.items.map((item) => (
                  <tr key={item.id} className="border-b border-[#F2F4F7]">
                    <td className="py-3 text-sm text-[#23272E]">{item.id}</td>
                    <td className="py-3 text-sm text-[#23272E]">{item.item_name}</td>
                    <td className="py-3 text-sm text-[#23272E]">{item.quantity}</td>
                    <td className="py-3 text-sm text-[#23272E]">{Number(item.unit_price || 0).toFixed(2)}</td>
                    <td className="py-3 text-sm font-medium text-[#23272E]">
                      {Number(item.line_total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-[#64748B]">
                    No items found for this order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6325A9]" />
        </div>
      }
    >
      <OrderDetailsContent />
    </Suspense>
  );
}
