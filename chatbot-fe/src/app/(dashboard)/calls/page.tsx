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
import CallCardSkeleton from "@/components/loading-skeletons/CallCardSkeleton";

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
  const isFetchingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [totalCount, setTotalCount] = useState<number>(0);
  const [showList, setShowList] = useState<boolean>(true);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

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
          setConversations(response.data);
          const firstConversation = response.data?.[0];
          setSelectedConversation(firstConversation || null);
        }
        setTotalCount(response.metadata.total);
        setTotalPages(response.metadata.total_pages);
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
        setSelectedConversation(null);
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
      if (isFetchingRef.current || loadingMore || loading || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 120) {
        // close to bottom, load next page
        if (currentPage < totalPages) {
          isFetchingRef.current = true;
          fetchConversations(currentPage + 1, pageSize, debouncedSearchQuery, true).finally(() => {
            isFetchingRef.current = false;
          });
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
    <div className="relative">
      {/* Drawer for small screens */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setDrawerOpen(false)} />
        <div
          className={`absolute left-0 top-20 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-brand-dark text-lg">Recent Calls</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <p className="font-medium text-brand-light text-sm">
              {totalCount.toLocaleString()} total calls
            </p>
          </div>
          <div className="p-4">
            <SearchInput
              placeholder="Search calls by name, phone, or email"
              value={searchQuery}
              onChange={handleSearchChange}
              className="mb-4"
            />
            <div className="relative z-40">
              <CallFilterDropdown
                options={statusOptions}
                selectedValue={statusFilter}
                onChange={(v: string | number | null) => setStatusFilter(String(v))}
                trigger={
                  <div className="border border-[#D5D9E2] p-2 rounded-md flex items-center gap-2 cursor-pointer mb-4">
                    <Image src="/assets/Funnel.svg" alt="filter" width={20} height={20} />
                    <p className="font-medium text-brand-dark text-sm">Filter</p>
                  </div>
                }
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-200px)] space-y-1 px-4">
            {loading && conversations.length === 0 ? (
              Array.from({ length: 4 }).map((_, idx) => <CallCardSkeleton key={idx} />)
            ) : conversations?.length > 0 ? (
              conversations.map((conv) => (
                <CallCard
                  key={conv.id}
                  conversation={conv}
                  onClick={() => {
                    handleRowClick(conv);
                    setDrawerOpen(false); // Close drawer after selection
                  }}
                  isSelected={selectedConversation?.id === conv.id}
                />
              ))
            ) : (
              <div className="p-3 text-sm text-gray-500">No calls found.</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calls List - Hidden on small screens, shown on large */}
        <div
          className={`hidden lg:block relative transition-all duration-300 ease-in-out ${
            showList ? "lg:w-4/12" : "lg:w-0"
          } overflow-hidden`}
        >
          <div className="h-full overflow-auto border border-[#D5D9E2] shadow-[0_2px_2px_0_#23272E14] rounded-[8px] py-4">
            <div
              className="w-full flex flex-col xl2:flex-row 
                xl2:justify-between justify-start 
                xl2:items-start items-start mb-4 px-4"
            >
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
                  <div className="border border-[#D5D9E2] p-2 rounded-md flex items-center gap-2 cursor-pointer xl2:items-start mt-4 xl2:mt-0 relative z-40">
                    <Image src="/assets/Funnel.svg" alt="search" width={20} height={20} />
                    <p className="font-medium text-brand-dark text-[12px] md:text-[14px] leading-[1.32]">
                      Filter
                    </p>
                  </div>
                }
              />
            </div>

            <div className="mt-3 flex items-center justify-between px-4 py-2">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{conversations.length}</span> calls
              </div>
            </div>
            <div className="flex flex-col gap-3 px-4">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <SearchInput
                    placeholder="Search calls by name, phone, or email"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="bg-[#F9FAFB] border border-[#E6E7EB] rounded-[8px]"
                  />
                </div>
              </div>
            </div>

            <div ref={listRef} className="mt-4 space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
              {loading && conversations.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => <CallCardSkeleton key={idx} />)
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
          </div>
        </div>

        {/* Call Details */}
        <div
          className={`transition-all duration-300 ease-in-out ${showList ? "lg:w-8/12" : "lg:w-full"}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Drawer toggle button for small screens */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden bg-white border rounded-md px-3 py-3 font-normal text-brand-button text-lg leading-[1.32] flex items-center gap-2"
              >
                <Image src="/assets/CaretLeft.svg" alt="Calls" width={16} height={16} />
                Recent Calls
              </button>
              {/* Toggle button for large screens */}
              <button
                onClick={() => setShowList(!showList)}
                className="hidden lg:flex bg-white border rounded-md px-3 py-3 font-normal text-brand-button text-lg leading-[1.32] items-center gap-2"
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
          <CallDetails conversation={selectedConversation} loading={loading} />
        </div>
      </div>
    </div>
  );
}
