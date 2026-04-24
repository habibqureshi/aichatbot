"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import {
  getOrdersList,
  Order,
  ORDER_STATUS_OPTIONS,
  OrderStatus,
  updateOrderStatus,
} from "@/app/actions/orders";
import { toast } from "react-toastify";
import { StatusBadge } from "@/lib/statusUtils";
import { formatDate } from "@/lib/utils";
import { getInitials, getAvatarColors } from "@/lib/avatarUtils";

export default function OrdersBookings() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, OrderStatus>>({});
  const [statusSavingId, setStatusSavingId] = useState<number | null>(null);
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchOrders = useCallback(
    async (page: number = 1, limit: number = 10, name: string = "") => {
      try {
        setLoading(true);
        const response = await getOrdersList(page, limit, user_timezone, undefined, name);
        setOrders(response.data);
        setTotalPages(response.metadata.total_pages);
        setCurrentPage(response.metadata.page);
      } catch (error: unknown) {
        console.error("Error fetching orders:", error);
        if (error instanceof Error && error.message) {
          toast.error(error.message);
        } else {
          toast.error("Failed to load orders from server");
        }
        setOrders([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [user_timezone],
  );

  useEffect(() => {
    fetchOrders(currentPage, pageSize, debouncedSearchQuery);
  }, [fetchOrders, currentPage, pageSize, debouncedSearchQuery]);

  const handleStatusSave = async (orderId: number) => {
    const selected = statusDrafts[orderId];
    if (!selected) return;
    try {
      setStatusSavingId(orderId);
      const updated = await updateOrderStatus(orderId, selected, user_timezone);
      setOrders((prev) => prev.map((ord) => (ord.id === orderId ? updated : ord)));
      toast.success(`Order #${orderId} status updated`);
    } catch (error: unknown) {
      console.error("Error updating order status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update order status");
    } finally {
      setStatusSavingId(null);
    }
  };

  const columns: ExtendedColumnDef<Order>[] = [
    {
      accessorKey: "id",
      header: "ID",
      width: "100px",
      cell: ({ row }) => (
        <div className="font-medium text-sm leading-[1.32] tracking-[0%] text-brand-dark1">
          ORD-{String(row.original.id).padStart(3, "0")}
        </div>
      ),
    },
    {
      accessorKey: "customer.name",
      header: "CUSTOMER",
      width: "220px",
      cell: ({ row }) => {
        const customerName = row.original.customer?.name || `Customer ${row.original.customer_id}`;
        const phoneNumber = row.original.customer?.phone_number || "N/A";
        const initials = getInitials(customerName);
        const avatarColors = getAvatarColors(row.original.customer_id);

        return (
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: avatarColors.bg }}
            >
              <span className="text-sm font-semibold" style={{ color: avatarColors.text }}>
                {initials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{customerName}</p>
              <p className="text-sm text-gray-600 truncate">{phoneNumber}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "delivery_address",
      header: "DELIVERY ADDRESS",
      width: "260px",
      cell: ({ row }) => (
        <p className="text-sm text-gray-700 line-clamp-2">{row.original.delivery_address || "N/A"}</p>
      ),
    },
    {
      accessorKey: "items",
      header: "ITEMS",
      width: "220px",
      cell: ({ row }) => {
        const items = row.original.items || [];
        const qty = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
        return (
          <div>
            <p className="text-sm font-medium text-gray-900">{items.length} lines</p>
            <p className="text-sm text-gray-600">{qty} qty total</p>
          </div>
        );
      },
    },
    {
      accessorKey: "total_amount",
      header: "TOTAL",
      width: "120px",
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">{Number(row.original.total_amount || 0).toFixed(2)}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "CREATED",
      width: "170px",
      cell: ({ row }) => (
        <p className="flex items-center gap-1 text-sm text-gray-700">
          <Image src="/assets/CalendarBlank.svg" alt="calendar" width={16} height={16} />
          {formatDate(row.original.created_at)}
        </p>
      ),
    },
    {
      accessorKey: "status",
      header: "STATUS",
      width: "140px",
      cell: ({ row }) => <StatusBadge status={row.original.status || "N/A"} />,
    },
    {
      id: "actions",
      header: "UPDATE STATUS",
      width: "220px",
      cell: ({ row }) => {
        const current = (row.original.status || "draft") as OrderStatus;
        const selected = statusDrafts[row.original.id] ?? current;
        return (
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) =>
                setStatusDrafts((prev) => ({
                  ...prev,
                  [row.original.id]: e.target.value as OrderStatus,
                }))
              }
              className="h-9 rounded-md border border-[#E8E3FF] px-2 text-sm bg-white"
            >
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleStatusSave(row.original.id)}
              disabled={statusSavingId === row.original.id || selected === current}
              className="h-9 px-3 rounded-md bg-[#6325A9] text-white text-sm disabled:opacity-50"
            >
              {statusSavingId === row.original.id ? "Saving..." : "Save"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-2xl font-semibold text-[#000000]">Orders</h1>
          <p className="text-md font-inter font-normal sm:text-base text-[#787878] mt-1">
            Manage all food orders handled by the AI system.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        title="All Orders"
        showSearch={true}
        loading={loading}
        initialLoading={loading && orders.length === 0}
        externalSearchValue={searchQuery}
        onExternalSearchChange={setSearchQuery}
        enablePagination={true}
        externalPageIndex={currentPage - 1}
        totalPages={totalPages}
        onExternalPageChange={(pageIndex) => setCurrentPage(pageIndex + 1)}
        onExternalPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setCurrentPage(1);
        }}
        onRowClick={(row) => router.push(`/orders/manage?id=${row.id}`)}
        rowTooltipText="Click to view order details"
      />
    </div>
  );
}
