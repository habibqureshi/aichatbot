"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";

import { LoadingSpinner } from "./loading-spinner";
import { TableSkeleton } from "./table-skeleton";
import Image from "next/image";

// Extended ColumnDef with width properties
export type ExtendedColumnDef<TData, TValue = unknown> = ColumnDef<TData, TValue> & {
  minWidth?: string;
  maxWidth?: string;
  width?: string;
};

interface DataTableProps<TData, TValue> {
  columns: ExtendedColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  searchKey?: string;
  searchPlaceholder?: string;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  showSearch?: boolean;
  showSorting?: boolean;
  loading?: boolean;
  initialLoading?: boolean;
  // External search control (for server-side search with debouncing)
  externalSearchValue?: string;
  onExternalSearchChange?: (value: string) => void;
  // External status filter control
  externalStatusValue?: string;
  onExternalStatusChange?: (value: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  statusPlaceholder?: string;
  // External department filter control
  externalDepartmentValue?: string;
  onExternalDepartmentChange?: (value: string) => void;
  departmentOptions?: Array<{ value: string; label: string }>;
  departmentPlaceholder?: string;
  // External pagination control (for server-side pagination)
  externalPageIndex?: number;
  externalPageSize?: number;
  totalPages?: number;
  onExternalPageChange?: (pageIndex: number) => void;
  onExternalPageSizeChange?: (pageSize: number) => void;
  // Row click handler
  onRowClick?: (row: TData) => void;
  // Row tooltip text
  rowTooltipText?: string;
  // Selected row ID for highlighting
  selectedRowId?: string | number;
  totalCount?: number;
  actionButton?: React.ReactNode;
  tableMinHeight?: string;
  tableMaxHeight?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title = "",
  searchKey,
  searchPlaceholder = "Search...",
  enableSorting = true,
  enableFiltering = true,
  enableColumnVisibility = true,
  enablePagination = true,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 30, 40, 50],
  showSearch = true,
  showSorting = false,
  loading = false,
  initialLoading = false,
  externalSearchValue,
  onExternalSearchChange,
  externalStatusValue,
  onExternalStatusChange,
  statusOptions,
  statusPlaceholder = "All Status",
  externalDepartmentValue,
  onExternalDepartmentChange,
  departmentOptions,
  departmentPlaceholder = "All Department",
  externalPageIndex,
  externalPageSize,
  totalPages,
  onExternalPageChange,
  onExternalPageSizeChange,
  onRowClick,
  rowTooltipText,
  selectedRowId,
  totalCount,
  actionButton,
  tableMinHeight,
  tableMaxHeight,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // External pagination state
  const [internalPageSize, setInternalPageSize] = useState(pageSize);

  const currentPageIndex = onExternalPageChange ? externalPageIndex ?? 0 : 0;
  const currentPageSize = onExternalPageSizeChange ? externalPageSize ?? pageSize : internalPageSize;

  const table = useReactTable({
    data,
    columns,
    onSortingChange: enableSorting ? setSorting : undefined,
    onColumnFiltersChange: enableFiltering ? setColumnFilters : undefined,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel:
      enablePagination && !onExternalPageChange ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? columnFilters : undefined,
      columnVisibility: enableColumnVisibility ? columnVisibility : undefined,
      rowSelection,
      ...(enablePagination &&
        !onExternalPageChange && {
          pagination: {
            pageIndex: currentPageIndex,
            pageSize: currentPageSize,
          },
        }),
    },
    initialState: {
      pagination: {
        pageSize: currentPageSize,
      },
    },
    pageCount: totalPages,
    manualPagination: !!onExternalPageChange,
  });
  // const [firstWord, ...rest] = (title ?? "").split(" ");
  // const restTitle = rest.join(" ");
  return (
    <div className="bg-brand-light2  rounded-xl p-4 px-6 ">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 mt-1">
        <div className="flex items-center space-x-2 px-2">
          <h2 className="font-figtree text-[24px] font-semibold tracking-tight text-brand-dark leading-[1.32] ">
            {title}
          </h2>
          {totalCount !== undefined && totalCount > 0 && (
            <span className="h-7 w-12 bg-white flex items-center justify-center text-[16px] font-inter font-semibold text-black rounded-[8px] p-4">
              {totalCount !== undefined ? totalCount : ""}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto px-2 sm:px-0">
          {/* Loading Spinner */}
          {loading && (
            <div className="flex items-center">
              <LoadingSpinner size="medium" />
            </div>
          )}

          {/* Search Input */}
          {showSearch && searchKey && (enableFiltering || onExternalSearchChange) && (
            <div className="relative w-full sm:max-w-sm">
              <Image
                height={16}
                width={16}
                src="/assets/images/search_icon.svg"
                alt="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70 z-10"
              />

              <Input
                placeholder={searchPlaceholder}
                value={
                  onExternalSearchChange
                    ? externalSearchValue ?? ""
                    : (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
                }
                onChange={(event) => {
                  if (onExternalSearchChange) onExternalSearchChange(event.target.value);
                  else table.getColumn(searchKey)?.setFilterValue(event.target.value);
                }}
                className="h-[42px] w-full rounded-[8px] pl-10 pr-3 border ring-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-muted-foreground placeholder:text-muted-foreground text-[14px] font-normal leading-none tracking-[-0.04em] transition-colors hover:bg-brand-card/20"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#E8E3FF" }}
              />
            </div>
          )}

          {/* Status Filter */}
          {onExternalStatusChange && statusOptions && (
            <div className="relative w-full sm:max-w-sm min-w-[180px]">
              <Image
                height={16}
                width={16}
                src="/assets/images/filter_icon.svg"
                alt="filter"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70 z-10"
              />
              <Select value={externalStatusValue ?? ""} onValueChange={onExternalStatusChange}>
                <SelectTrigger
                  className="h-[42px] w-full rounded-[8px] pl-10 pr-6 border shadow-none ring-0 focus:ring-0 focus:ring-offset-0 text-muted-foreground placeholder:text-muted-foreground text-[14px] font-normal leading-none tracking-[-0.04em] transition-colors"
                  style={{
                    borderColor: "#E8E3FF",
                  }}
                >
                  <SelectValue placeholder={statusPlaceholder} />
                </SelectTrigger>

                <SelectContent
                  className="border"
                  style={{ borderColor: "#E8E3FF", backgroundColor: "#FFFFFF" }}
                >
                  {statusOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="hover:bg-[#F7F5FF] focus:bg-brand-card/60 cursor-pointer"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {actionButton && actionButton}
          {/* Department Filter */}
          {onExternalDepartmentChange && departmentOptions && (
            <Select
              value={externalDepartmentValue ?? ""}
              onValueChange={(value) => onExternalDepartmentChange(value)}
            >
              <SelectTrigger className="select-component">
                <SelectValue placeholder={departmentPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort By Dropdown */}
          {showSorting && enableSorting && (
            <Select
              value={`${table.getState().sorting[0]?.id ?? ""}-${
                table.getState().sorting[0]?.desc ? "desc" : "asc"
              }`}
              onValueChange={(value) => {
                const [column, direction] = value.split("-");
                if (column) {
                  table.setSorting([{ id: column, desc: direction === "desc" }]);
                }
              }}
            >
              <SelectTrigger
                className="w-full sm:w-[180px] bg-brand-white rounded-md h-10 hover:bg-brand-card/40 border"
                style={{ borderColor: "#E8E3FF" }}
              >
                <SelectValue placeholder="Sort by: Newest" />
              </SelectTrigger>
              <SelectContent
                className="border"
                style={{ borderColor: "#E8E3FF", backgroundColor: "#FFFFFF" }}
              >
                <SelectItem
                  value="newest"
                  className="hover:bg-brand-card/40 focus:bg-brand-card/60 cursor-pointer"
                >
                  Newest
                </SelectItem>
                <SelectItem
                  value="oldest"
                  className="hover:bg-brand-card/40 focus:bg-brand-card/60 cursor-pointer"
                >
                  Oldest
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-sm overflow-hidden">
        <div
          className="overflow-auto table-scroll"
          style={{
            minHeight: tableMinHeight || "calc(100vh - 400px)",
            maxHeight: tableMaxHeight || "calc(100vh - 350px)",
            // scrollbarWidth: "thin",
            // scrollbarColor: "#E8E3FF #F5F3FF",
          }}
        >
          <table className="min-w-[950px] table-auto w-full">
            <thead className="sticky top-0 z-20">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-0">
                  {headerGroup.headers.map((header) => {
                    const columnDef = header.column.columnDef as ExtendedColumnDef<TData, TValue>;
                    const widthStyle = columnDef.width ? { width: columnDef.width } : {};
                    const minWidthStyle = columnDef.minWidth ? { minWidth: columnDef.minWidth } : {};
                    const maxWidthStyle = columnDef.maxWidth ? { maxWidth: columnDef.maxWidth } : {};
                    return (
                      <TableHead
                        key={header.id}
                        className="font-medium text-xs  text-[#8695AA] leading-[1.32] tracking-[0.24em] uppercase py-3 px-4 first:pl-6 last:pr-6"
                        style={{ ...widthStyle, ...minWidthStyle, ...maxWidthStyle }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </thead>
            <TableBody>
              {initialLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-4">
                    <TableSkeleton columns={columns.length} rows={5} />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const isSelected =
                    selectedRowId !== undefined &&
                    (row.original as { id: string | number }).id === selectedRowId;
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={`${row.index % 2 === 0 ? "bg-white rounded-lg border-0" : "border-0"} ${
                        onRowClick ? "cursor-pointer" : ""
                      }`}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      title={onRowClick && rowTooltipText ? rowTooltipText : undefined}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const columnDef = cell.column.columnDef as ExtendedColumnDef<TData, TValue>;
                        const widthStyle = columnDef.width ? { width: columnDef.width } : {};
                        const minWidthStyle = columnDef.minWidth ? { minWidth: columnDef.minWidth } : {};
                        const maxWidthStyle = columnDef.maxWidth ? { maxWidth: columnDef.maxWidth } : {};

                        // Check if this is a simple text cell (has accessorKey and no custom cell renderer)
                        const isSimpleTextCell = "accessorKey" in columnDef && !columnDef.cell;

                        // Check if this is an actions column
                        const isActionsColumn = cell.column.id === "actions";

                        return (
                          <TableCell
                            key={cell.id}
                            className={`text-xs sm:text-sm ${
                              isSelected ? "text-brand-dark" : "text-muted-foreground"
                            } py-3 sm:py-4 px-2 sm:px-3 first:pl-3 sm:first:pl-6 last:pr-2 sm:last:pr-6 ${
                              isSimpleTextCell ? "font-medium break-words whitespace-pre-wrap" : ""
                            }`}
                            style={{ ...widthStyle, ...minWidthStyle, ...maxWidthStyle }}
                            onClick={(e) => {
                              // Prevent row selection when clicking on actions column
                              if (isActionsColumn) {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {isSimpleTextCell
                              ? flexRender(
                                  cell.column.columnDef.cell || (({ getValue }) => getValue()),
                                  cell.getContext()
                                )
                              : flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-12 text-center font-medium text-[18px] text-muted-foreground border-0 "
                  >
                    <div className="flex items-center justify-center min-h-[220px]">
                      No results found.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
      {/* Pagination */}
      {enablePagination && (
        <div
          className="flex flex-row sm:flex-row items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-2 py-2 px-4 sm:px-6 border-t"
          style={{ borderColor: "#E8E3FF" }}
        >
          <div className="flex items-center space-x-1 sm:space-x-2 mt-3 sm:mt-0">
            <p className="text-sm font-medium text-brand-light">Rows per page</p>
            <Select
              value={`${currentPageSize}`}
              onValueChange={(value) => {
                const newPageSize = Number(value);
                if (onExternalPageSizeChange) {
                  onExternalPageSizeChange(newPageSize);
                } else {
                  setInternalPageSize(newPageSize);
                  table.setPageSize(newPageSize);
                }
              }}
            >
              <SelectTrigger
                className="h-8 w-[70px] bg-brand-white hover:bg-brand-card/40"
                style={{ borderColor: "#E8E3FF" }}
              >
                <SelectValue placeholder={currentPageSize} />
              </SelectTrigger>
              <SelectContent
                side="top"
                className="border"
                style={{ borderColor: "#E8E3FF", backgroundColor: "#FFFFFF" }}
              >
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem
                    key={pageSize}
                    value={`${pageSize}`}
                    className="hover:bg-brand-card/40 focus:bg-brand-card/60 cursor-pointer"
                  >
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-row sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 lg:space-x-8">
            <div className="flex w-full sm:w-[100px] items-center justify-center text-sm font-medium text-brand-light mt-3 sm:mt-0">
              Page {currentPageIndex + 1} of {totalPages || table.getPageCount()}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                className="hidden lg:flex h-8 w-8 p-0 bg-brand-white hover:bg-brand-card/40 text-brand-gray"
                style={{ borderColor: "#E8E3FF" }}
                onClick={() => {
                  if (onExternalPageChange) {
                    onExternalPageChange(0);
                  } else {
                    table.setPageIndex(0);
                  }
                }}
                disabled={currentPageIndex === 0}
              >
                <span className="sr-only">Go to first page</span>
                {"<<"}
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 bg-brand-white hover:bg-brand-card/40 text-brand-gray"
                style={{ borderColor: "#E8E3FF" }}
                onClick={() => {
                  if (onExternalPageChange) {
                    onExternalPageChange(currentPageIndex - 1);
                  } else {
                    table.previousPage();
                  }
                }}
                disabled={currentPageIndex === 0}
              >
                <span className="sr-only">Go to previous page</span>
                {"<"}
              </Button>

              {/* Page Numbers - Hide on mobile, show on tablet+ */}
              <div className="hidden sm:flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages || table.getPageCount()) }, (_, i) => {
                  const pageIndex = currentPageIndex;
                  const totalPagesCount = totalPages || table.getPageCount();
                  let startPage = Math.max(0, pageIndex - 2);
                  const endPage = Math.min(totalPagesCount - 1, startPage + 4);

                  if (endPage - startPage < 4) {
                    startPage = Math.max(0, endPage - 4);
                  }

                  const page = startPage + i;
                  if (page <= endPage) {
                    return (
                      <Button
                        key={page}
                        variant={page === pageIndex ? "default" : "outline"}
                        className={`h-8 w-8 p-0 font-medium text-[14px] ${
                          page === pageIndex
                            ? "bg-gradient-to-r from-brand-purple to-brand-blue text-brand-white hover:from-brand-purple/90 hover:to-brand-blue/90"
                            : "bg-brand-white hover:bg-brand-card/40 text-brand-gray"
                        }`}
                        style={page !== pageIndex ? { borderColor: "#E8E3FF" } : {}}
                        onClick={() => {
                          if (onExternalPageChange) {
                            onExternalPageChange(page);
                          } else {
                            table.setPageIndex(page);
                          }
                        }}
                      >
                        {page + 1}
                      </Button>
                    );
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                className="h-8 w-8 p-0 bg-brand-white hover:bg-brand-card/40 text-brand-gray"
                style={{ borderColor: "#E8E3FF" }}
                onClick={() => {
                  if (onExternalPageChange) {
                    onExternalPageChange(currentPageIndex + 1);
                  } else {
                    table.nextPage();
                  }
                }}
                disabled={currentPageIndex >= (totalPages || table.getPageCount()) - 1}
              >
                <span className="sr-only">Go to next page</span>
                {">"}
              </Button>
              <Button
                variant="outline"
                className="hidden lg:flex h-8 w-8 p-0 bg-brand-white hover:bg-brand-card/40 text-brand-gray"
                style={{ borderColor: "#F0EEFF" }}
                onClick={() => {
                  if (onExternalPageChange) {
                    onExternalPageChange((totalPages || table.getPageCount()) - 1);
                  } else {
                    table.setPageIndex(table.getPageCount() - 1);
                  }
                }}
                disabled={currentPageIndex >= (totalPages || table.getPageCount()) - 1}
              >
                <span className="sr-only">Go to last page</span>
                {">>"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
