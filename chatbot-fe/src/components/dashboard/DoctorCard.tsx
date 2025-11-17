import Image from "next/image";

interface DoctorCardProps {
  name: string;
  specialty: string;
  experience: string;
  timings: string;
  treatments: string;
  avatar?: string;
  isActive?: boolean;
}

export default function DoctorCard({
  name,
  specialty,
  experience,
  timings,
  treatments,
  avatar = "/assets/default_avatar.png", // fallback avatar
  isActive = true,
}: DoctorCardProps) {
  return (
    <div className="w-full h-[317px] p-8 bg-white/50 rounded-2xl flex flex-col justify-between shadow-md">
      {/* Top Section: Avatar + Name + Specialty + Active */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[#D9D9D9] overflow-hidden">
            <Image src={avatar} alt={name} width={64} height={64} className="object-cover" />
          </div>
          {/* Name & Specialty */}
          <div className="flex flex-col">
            <p className="text-[20px] font-inter font-normal text-black leading-[100%] -tracking-[0.04em]">
              {name}
            </p>
            <p className="text-[14px] font-inter font-normal text-[#666666] leading-[100%] -tracking-[0.04em]">
              {specialty}
            </p>
          </div>
        </div>
        {/* Active Badge */}
        {isActive && (
          <div className="bg-[#06A35A] text-white text-[12px] font-inter font-normal px-2 py-1 rounded-[8px]">
            Active
          </div>
        )}
      </div>

      {/* Middle Section: Experience & Timings */}
      <div className="flex flex-col gap-1 text-[14px] text-[#666666] font-inter font-normal">
        <p className="flex items-center gap-2">
          <span>⏱</span> {experience}
        </p>
        <p className="flex items-center gap-2">
          <span>📅</span> {timings}
        </p>
      </div>

      {/* Bottom Section: Treatments */}
      <div className="text-[16px] font-inter font-normal text-black">{treatments}</div>
    </div>
  );
}
