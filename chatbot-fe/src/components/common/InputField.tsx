import React from "react";
import Image from "next/image";

interface InputFieldProps {
  title: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  min?: number;
  max?: number;
}

const InputField: React.FC<InputFieldProps> = ({
  title,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  className = "w-full h-[42px] pt-1 pr-[19px] pb-1 pl-[19px] rounded-[8px] bg-white text-black font-normal text-[16px] leading-[132%] focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-[#00000059]",
  min,
  max,
}) => {
  return (
    <div>
      <label
        htmlFor={name}
        className="flex items-baseline gap-1 mb-2 font-semibold text-[16px] leading-[132%] text-black"
      >
        <span>{title}</span>
        {required && (
          <Image
            src="/assets/starIcon.svg"
            alt="Required"
            width={8}
            height={8}
            className="self-start"
          />
        )}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={className}
        placeholder={placeholder}
        min={min}
        max={max}
      />
    </div>
  );
};

export default InputField;
