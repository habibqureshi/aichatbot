"use client";

import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";

interface CallData {
  id: string;
  userName: string;
  userEmail: string;
  callDuration: string;
  status: "completed" | "in-progress" | "failed" | "missed";
  summary: string;
  callDate: string;
}

const dummyCallData: CallData[] = [
  {
    id: "1",
    userName: "John Doe",
    userEmail: "john.doe@example.com",
    callDuration: "15:32",
    status: "completed",
    summary: "Discussed product features and pricing options. Customer interested in premium plan.",
    callDate: "2025-11-06",
  },
  {
    id: "2",
    userName: "Jane Smith",
    userEmail: "jane.smith@example.com",
    callDuration: "08:45",
    status: "completed",
    summary: "Technical support call regarding login issues. Resolved by resetting password.",
    callDate: "2025-11-06",
  },
  {
    id: "3",
    userName: "Mike Johnson",
    userEmail: "mike.johnson@example.com",
    callDuration: "22:18",
    status: "in-progress",
    summary: "Ongoing discussion about enterprise contract terms and conditions.",
    callDate: "2025-11-06",
  },
  {
    id: "4",
    userName: "Sarah Wilson",
    userEmail: "sarah.wilson@example.com",
    callDuration: "00:00",
    status: "missed",
    summary: "Missed call - customer called during off hours.",
    callDate: "2025-11-05",
  },
  {
    id: "5",
    userName: "David Brown",
    userEmail: "david.brown@example.com",
    callDuration: "12:55",
    status: "completed",
    summary: "Billing inquiry resolved. Customer had questions about recent charges.",
    callDate: "2025-11-05",
  },
  {
    id: "6",
    userName: "Lisa Davis",
    userEmail: "lisa.davis@example.com",
    callDuration: "05:23",
    status: "failed",
    summary: "Call failed due to poor connection. Will follow up tomorrow.",
    callDate: "2025-11-05",
  },
  {
    id: "7",
    userName: "Robert Miller",
    userEmail: "robert.miller@example.com",
    callDuration: "18:42",
    status: "completed",
    summary: "Product demo completed successfully. Customer ready to proceed with purchase.",
    callDate: "2025-11-04",
  },
  {
    id: "8",
    userName: "Emily Garcia",
    userEmail: "emily.garcia@example.com",
    callDuration: "09:17",
    status: "completed",
    summary: "Follow-up call regarding previous support ticket. Issue fully resolved.",
    callDate: "2025-11-04",
  },
];

const StatusBadge = ({ status }: { status: CallData["status"] }) => {
  const statusStyles = {
    completed: "bg-green-100 text-green-800",
    "in-progress": "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
    missed: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const columns: ExtendedColumnDef<CallData>[] = [
  {
    accessorKey: "userName",
    header: "User Information",
    width: "180px",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">{row.original.userName}</div>
        <div className="text-sm text-gray-500">{row.original.userEmail}</div>
      </div>
    ),
  },
  {
    accessorKey: "callDuration",
    header: "Call Duration",
    width: "110px",
  },
  {
    accessorKey: "status",
    header: "Status",
    width: "90px",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "summary",
    header: "Summary",
    width: "250px",
    // No custom cell - will use default text rendering with font-medium and text wrapping!
  },
  {
    accessorKey: "callDate",
    header: "Date",
    width: "100px",
    cell: ({ row }) => <div>{new Date(row.original.callDate).toLocaleDateString()}</div>,
  },
];

export default function CallsPage() {
  // const [tableBodyData, setTableBodyData] = useState([]);
  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Call History</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage all call records</p>
      </div>

      <DataTable
        columns={columns}
        data={dummyCallData}
        title="Call Records"
        searchKey="userName"
        searchPlaceholder="Search calls by user name..."
        enableSorting={true}
        enableFiltering={true}
        enableColumnVisibility={true}
        enablePagination={true}
        pageSize={5}
        showSearch={true}
        showSorting={false}
      />
    </div>
  );
}
