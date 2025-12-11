"use client";

import React from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;

  /** optional icon URL */
  icon?: string;

  /** parent div class */
  className?: string;

  /** input class override */
  inputClassName?: string;

  /** icon class override */
  iconClassName?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search...",
  value,
  onChange,
  icon = "/assets/images/search_icon.svg",
  className = "",
  inputClassName = "",
  iconClassName = "",
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      <Image
        height={22}
        width={22}
        src={icon}
        alt="search"
        className={`
      absolute left-3 top-1/2 -translate-y-1/2 
      h-4 w-4 opacity-70 z-10 
      ${iconClassName}
    `}
      />

      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
      h-[50px] w-full rounded-[8px] pl-10 pr-3
      
      font-Figtree font-medium text-[14px] leading-[1.32] tracking-[0%]
      text-[#818282] placeholder:text-[#818282]
      
      ring-0 outline-none
      focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0
      
      hover:border-2 hover:border-gray-300
      
      transition-none
      ${inputClassName}
    `}
        style={{ fontFamily: "Figtree" }}
      />
    </div>
  );
};

export default SearchInput;
