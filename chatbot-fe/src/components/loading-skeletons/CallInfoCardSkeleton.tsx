"use client";

export default function CallInfoCardSkeleton({ title }: { title: string }) {
  return (
    <div className="p-4 border border-[#D5D9E2] shadow-[0_2px_2px_0_#23272E14] rounded-[8px] animate-pulse">
      <p className="font-medium text-brand-dark text-[14px] md:text-[16px] leading-[1.32]">{title}</p>
      <div className="flex items-center gap-2 mb-4 mt-6">
        <div className="w-6 h-6 bg-gray-200 rounded"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-12"></div>
    </div>
  );
}
