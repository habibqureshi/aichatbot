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
import { Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { LoadingSpinner } from "./loading-spinner";
import { TableSkeleton } from "./table-skeleton";

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
  const [firstWord, ...rest] = (title ?? "").split(" ");
  const restTitle = rest.join(" ");
  return (
    <div className="border rounded-lg p-4 px-6" style={{ backgroundColor: "#F3F0FD" }}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 sm:px-4 gap-3 py-4">
        <div className="flex items-center space-x-2 px-2">
          <h2 className="text-lg sm:text-[18px] font-semibold tracking-tight text-[#2A2A2A]">{title}</h2>
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
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={
                  onExternalSearchChange
                    ? externalSearchValue ?? ""
                    : (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
                }
                onChange={(event) => {
                  if (onExternalSearchChange) {
                    onExternalSearchChange(event.target.value);
                  } else {
                    table.getColumn(searchKey)?.setFilterValue(event.target.value);
                  }
                }}
                className="pl-10 border-[#E3C5FF] bg-white rounded-md h-10 text-sm"
              />
            </div>
          )}

          {/* Status Filter */}
          {onExternalStatusChange && statusOptions && (
            <Select
              value={externalStatusValue ?? ""}
              onValueChange={(value) => onExternalStatusChange(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px] border-[#E3C5FF] bg-white rounded-md h-10">
                <SelectValue placeholder={statusPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Department Filter */}
          {onExternalDepartmentChange && departmentOptions && (
            <Select
              value={externalDepartmentValue ?? ""}
              onValueChange={(value) => onExternalDepartmentChange(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px] border-[#E3C5FF] bg-white rounded-md h-10">
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
              <SelectTrigger className="w-full sm:w-[180px] border-[#E3C5FF] bg-white rounded-md h-10">
                <SelectValue placeholder="Sort by: Newest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#F3F0FD] border rounded-sm relative" style={{ borderColor: "#D5BAF6" }}>
        <div
          className="overflow-y-auto overflow-x-auto relative"
          style={{ maxHeight: "650px", position: "relative" }}
        >
          <Table className="min-w-[950px] table-auto w-full border-collapse">
            <TableHeader
              className="sticky top-0 z-20 shadow-sm"
      style={{
        background: "linear-gradient(to right, #F1E7FE 0%, #F3F0FD 100%)",
      }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} style={{ background: "transparent" }}>
                  {headerGroup.headers.map((header) => {
                    const columnDef = header.column.columnDef as ExtendedColumnDef<TData, TValue>;
                    const widthStyle = columnDef.width ? { width: columnDef.width } : {};
                    const minWidthStyle = columnDef.minWidth ? { minWidth: columnDef.minWidth } : {};
                    const maxWidthStyle = columnDef.maxWidth ? { maxWidth: columnDef.maxWidth } : {};
                    return (
                      <TableHead
                        key={header.id}
                        className="font-medium text-xs sm:text-sm text-[#2A2A2A] py-3 px-4 first:pl-6 last:pr-6 border-0"
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
            </TableHeader>
            <TableBody>
              {initialLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-4">
                    <TableSkeleton columns={columns.length} rows={5} />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`hover:bg-[#F9F6FD] border-b ${onRowClick ? "cursor-pointer" : ""}`}
                    style={{ borderColor: "#E2DAFB" }}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
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
                          className={`text-xs sm:text-sm text-muted-foreground py-3 sm:py-4 px-2 sm:px-3 first:pl-3 sm:first:pl-6 last:pr-2 sm:last:pr-6 border-0 ${
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
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-12 text-center font-medium text-[14px] text-muted-foreground border-0"
                  >
                    <div className="flex items-center justify-center">No results found.</div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Pagination */}
      {enablePagination && (
        <div className="flex flex-row sm:flex-row items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-2 py-2 px-4 sm:px-6 border-t">
          <div className="flex items-center space-x-1 sm:space-x-2 mt-3 sm:mt-0">
            <p className="text-sm font-medium text-muted-foreground">Rows per page</p>
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
              <SelectTrigger className="h-8 w-[70px] border-gray-200">
                <SelectValue placeholder={currentPageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-row sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 lg:space-x-8">
            <div className="flex w-full sm:w-[100px] items-center justify-center text-sm font-medium text-muted-foreground mt-3">
              Page {currentPageIndex + 1} of {totalPages || table.getPageCount()}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                className="hidden lg:flex h-8 w-8 p-0 border-gray-200 hover:bg-gray-50"
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
                className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-50"
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
                            ? "bg-primary text-white hover:bg-primary/90"
                            : "border-gray-200 text-muted-foreground hover:bg-gray-50"
                        }`}
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
                className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-50"
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
                className="hidden lg:flex h-8 w-8 p-0 border-gray-200 hover:bg-gray-50"
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
