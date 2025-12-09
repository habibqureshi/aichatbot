"use client";

import { useState, useEffect, useCallback, useRef } from "react";
// DataTable unused since cards were implemented; kept imports minimal
import CallDetails from "@/components/dashboard/CallDetails";
import { getConversationsList, Conversation } from "@/app/actions/conversations";
import { toast } from "react-toastify";
import CallFilterDropdown from "@/components/dashboard/CallFilterDropdown";
import Image from "next/image";
import SearchInput from "@/components/common/SearchInput";
import CallCard from "@/components/dashboard/CallCard";

// StatusBadge and calculateDuration moved to CallCard and CallDetails; removed from page

export default function CallsPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [totalCount, setTotalCount] = useState<number>(0);
  const [showList, setShowList] = useState<boolean>(true);

  // Status options passed from parent
  const statusOptions = [
    { id: "all", label: "All Status", value: "all" },
    { id: "active", label: "Active", value: "active" },
    { id: "ended", label: "Ended", value: "ended" },
    { id: "follow_up_needed", label: "Follow Up Needed", value: "follow_up_needed" },
  ];

  // Debounced search value
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Define columns inside the component
  // Replaced the DataTable columns definition with a list view (CallCard components)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchConversations = useCallback(
    async (page: number = 1, limit: number = 10, name: string = "", append: boolean = false) => {
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        const response = await getConversationsList(
          page,
          limit,
          user_timezone,
          statusFilter === "all" ? undefined : statusFilter || undefined,
          name
        );
        if (append) {
          setConversations((prev) => [...prev, ...(response.data || [])]);
        } else {
          if (append) {
            setConversations((prev) => [...prev, ...(response.data || [])]);
          } else {
            setConversations(response.data);
          }
          setTotalCount(response.metadata.total);
        }
        setTotalPages(response.metadata.total_pages);
        if (!append) {
          const firstConversation = response.data?.[0];
          setSelectedConversation(firstConversation || null);
        }
        setHasMore(response.metadata.page < response.metadata.total_pages);
      } catch (error: unknown) {
        console.error("Error fetching conversations:", error);

        // The error message is already formatted by axios interceptor
        if (error instanceof Error && error.message) {
          toast.error(error.message);
        } else {
          toast.error("Failed to load conversations from server");
        }

        setConversations([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user_timezone, statusFilter]
  );

  // Reset to first page when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    // Reset and fetch the first page when search or status changes
    setConversations([]);
    setCurrentPage(1);
    fetchConversations(1, pageSize, debouncedSearchQuery, false);
  }, [fetchConversations, pageSize, debouncedSearchQuery]);

  // Attach scroll listener for infinite scroll
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    const onScroll = () => {
      if (loadingMore || loading || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 120) {
        // close to bottom, load next page
        if (currentPage < totalPages) {
          fetchConversations(currentPage + 1, pageSize, debouncedSearchQuery, true);
          setCurrentPage((p) => p + 1);
        }
      }
    };

    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [
    currentPage,
    pageSize,
    debouncedSearchQuery,
    hasMore,
    loadingMore,
    loading,
    totalPages,
    fetchConversations,
  ]);

  // loadNextPage handled inside scroll handler

  // handlePageSizeChange removed in favor of infinite scroll; pageSize can be set via a future UI

  const handleRowClick = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div
          className={`relative transition-all duration-300 ease-in-out ${
            showList ? "lg:w-3/12" : "lg:w-0"
          } overflow-hidden`}
        >
          <div className="h-full overflow-auto border border-[#D5D9E2] shadow-[0_2px_2px_0_#23272E14] rounded-[8px] p-4">
            <div className="w-full flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <h3 className="font-semibold text-brand-dark text-lg md:text-[32px] leading-[1.32]">
                  Recent Calls
                </h3>
                <p className="font-medium text-brand-light text-[12px] md:text-[16px] leading-[1.32]">
                  {totalCount.toLocaleString()} total calls
                </p>
              </div>
              <CallFilterDropdown
                options={statusOptions}
                selectedValue={statusFilter}
                onChange={(v: string | number | null) => setStatusFilter(String(v))}
                trigger={
                  <div className="border border-[#D5D9E2] p-2 rounded-md flex items-center gap-2 cursor-pointer">
                    <Image src="/assets/Funnel.svg" alt="search" width={20} height={20} />
                    <p className="font-medium text-brand-dark text-[12px] md:text-[14px] leading-[1.32]">
                      Filter
                    </p>
                  </div>
                }
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{conversations.length}</span> calls
              </div>
              {/* <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{conversations.length}</span> calls
              </div>

              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border rounded-md text-sm px-2 py-1"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}/page
                  </option>
                ))}
              </select>
            </div> */}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <SearchInput
                    placeholder="Search calls by name, phone, or email"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="bg-[#F9FAFB] border border-[#E6E7EB] rounded-[8px]"
                  />
                </div>
                {/* Filter dropdown moved to header; no inline select here */}
              </div>
            </div>

            <div ref={listRef} className="mt-4 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {loading && conversations.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="p-3 rounded-lg animate-pulse bg-[#F5F3FF] h-24" />
                ))
              ) : conversations?.length > 0 ? (
                conversations.map((conv) => (
                  <CallCard
                    key={conv.id}
                    conversation={conv}
                    onClick={() => handleRowClick(conv)}
                    isSelected={selectedConversation?.id === conv.id}
                  />
                ))
              ) : (
                <div className="p-3 text-sm text-gray-500">No calls found.</div>
              )}
            </div>
            {/* <DataTable
            title="Recent Calls"
            columns={columns}
            data={conversations}
            // searchKey="patient.name"
            // searchPlaceholder="Search by patient name..."
            showSearch={true}
            loading={loading}
            initialLoading={loading && conversations.length === 0}
            externalSearchValue={searchQuery}
            onExternalSearchChange={handleSearchChange}
            externalStatusValue={statusFilter}
            onExternalStatusChange={setStatusFilter}
            statusOptions={statusOptions}
            statusPlaceholder="All Status"
            enablePagination={true}
            externalPageIndex={currentPage - 1}
            externalPageSize={pageSize}
            totalPages={totalPages}
            onExternalPageChange={handlePageChange}
            onExternalPageSizeChange={handlePageSizeChange}
            onRowClick={handleRowClick}
            rowTooltipText="Click to view conversation details"
            selectedRowId={selectedConversation?.id}
          /> */}
          </div>
        </div>

        <div
          className={`transition-all duration-300 ease-in-out ${showList ? "lg:w-9/12" : "lg:w-full"}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <button
                onClick={() => setShowList(!showList)}
                className="bg-white border rounded-md px-3 py-3 font-normal  text-brand-button text-lg leading-[1.32]   flex items-center gap-2"
              >
                <Image
                  src="/assets/CaretLeft.svg"
                  alt="Calls"
                  width={16}
                  height={16}
                  className={`transition-transform duration-300 ${showList ? "" : "rotate-180"}`}
                />
                {showList ? "Hide Calls List" : "Show Calls List"}
              </button>
            </div>
          </div>
          <CallDetails conversation={selectedConversation} />
        </div>
      </div>
    </div>
  );
}
