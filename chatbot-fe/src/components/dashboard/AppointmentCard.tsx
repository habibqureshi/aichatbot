import Image from "next/image";

interface AppointmentCardProps {
  title: string;
  count: number;
  icon: string;
  gradient: string;
  iconColor?: string;
}
export default function AppointmentCard({
  title,
  count,
  icon,
  gradient,
  iconColor,
}: AppointmentCardProps) {
  return (
    <div
      className="relative rounded-2xl p-5 flex items-start justify-between h-[120px] w-full overflow-hidden shadow-lg"
      style={{
        background: gradient,
      }}
    >
      <div>
        <p className="text-sm font-inter font-normal text-white/100">{title}</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mt-1">{count.toLocaleString()}</h2>
      </div>

      {/* ICON with Figma Color Overlay */}
      <div className="absolute right-2 -bottom-3 w-20 h-20 opacity-80">
        <Image
          src={icon}
          alt={title}
          width={80}
          height={80}
          style={{ filter: `drop-shadow(0 0 4px ${iconColor})` }}
          className="object-contain"
        />
      </div>
    </div>
  );
}
