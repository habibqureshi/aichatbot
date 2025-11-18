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
    <div className="w-full m-h-[317px] bg-[#FFFFFF66] rounded-xl flex flex-col justify-between shadow-md">
      {/* Top Section: Avatar + Name + Specialty + Active */}
      <div className="flex items-start justify-between px-8 pt-8">
        <div className="flex flex-col gap-3">
          {/* Avatar */}
          <div className="w-23 h-23 rounded-full bg-[#D9D9D9] overflow-hidden">
            <Image src={avatar} alt={name} width={93} height={93} className="object-cover" />
          </div>

          <p className="text-[20px] font-inter font-normal text-[#2A2A2A] leading-[100%] -tracking-[0.04em]">
            {name}
          </p>
          <p className="text-[14px] font-inter font-normal text-[#666666] leading-[100%] -tracking-[0.04em]">
            {specialty}
          </p>
        </div>
        {/* Active Badge */}
        {isActive && (
          <div className="bg-[#06A35A] text-white text-[12px] font-inter font-normal px-2 py-1 rounded-[8px] w-14 h-6 flex items-center justify-center">
            Active
          </div>
        )}
      </div>

      {/* Middle Section: Experience & Timings */}
      <div className="flex flex-col gap-1 text-[14px] text-[#666666] font-inter font-normal px-8">
        <p className="flex items-center gap-2">
          <span>⏱</span> {experience}
        </p>
        <p className="flex items-center gap-2">
          <span>📅</span> {timings}
        </p>
      </div>
      <div className="h-[1px] w-full bg-[#D1C8FE] my-3" />
      {/* Bottom Section: Treatments */}
      <div className="text-[16px] font-inter font-normal text-[#666666] px-8 pb-4">{treatments}</div>
    </div>
  );
}
