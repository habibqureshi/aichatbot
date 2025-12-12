"use client";

import ResturantBookings from "@/components/dashboard/Bookings/ResturantBookings";

export default function BookingsPage() {
  return <ResturantBookings />;
}

//reservations API response sample
// {
//     "data": [
//         {
//             "customer_id": 1,
//             "table_id": 1,
//             "reservation_date": "2025-12-11T10:30:00Z",
//             "party_size": 3,
//             "status": "confirmed",
//             "special_request": null,
//             "id": 1,
//             "created_at": "2025-12-10T10:30:00Z",
//             "cancelled_at": null,
//             "customer": null,
//             "table": null
//         }
//     ],
//     "metadata": {
//         "total": 1,
//         "page": 1,
//         "limit": 10,
//         "total_pages": 1
//     }
// }
