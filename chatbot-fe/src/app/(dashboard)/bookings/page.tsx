"use client";

// import { useInstallation } from "@/app/contexts/InstallationContext";
import DoctorBookings from "@/components/dashboard/Bookings/DoctorsBookings";
import ResturantBookings from "@/components/dashboard/Bookings/ResturantBookings";

export default function BookingsPage() {
  // const { installationType } = useInstallation();
  return <ResturantBookings />;
  // return installationType === "clinic" ? <DoctorBookings /> : <ResturantBookings />;
}
