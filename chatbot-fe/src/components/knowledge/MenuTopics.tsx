"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";

interface MenuTopicsProps {
  menuTabs: string[];
  newTabName: string;
  setNewTabName: (name: string) => void;
  isAddingTab: boolean;
  handleAddNewTab: () => void;
  handleRemoveTab: (index: number) => void;
  defaultTabs: string[];
}

export default function MenuTopics({
  menuTabs,
  newTabName,
  setNewTabName,
  isAddingTab,
  handleAddNewTab,
  handleRemoveTab,
  defaultTabs,
}: MenuTopicsProps) {
  return (
    <div
      className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[430px] flex flex-col"
      style={{
        background: "#FFFFFF",
        borderColor: "#F0EEFF",
      }}
    >
      <div className="flex items-start gap-3 mb-8">
        <div className="flex-shrink-0 w-14 h-14 bg-[#6325A9] rounded-lg flex items-center justify-center">
          <Image src="/assets/doc.svg" alt="AI Chatbot Logo" width={25} height={31} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-black">Menu Topics</h2>
          <p className="text-sm text-[#64748B] mt-1">Configure available conversation topics</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Existing Menu Topics */}
        <ul className="flex flex-col gap-2 list-none p-0 m-0 w-full h-[238px] overflow-auto">
          {menuTabs.map((tab, index) => {
            const isDefault = defaultTabs.includes(tab);
            // icon selection for defaults and generic icon for new tabs
            const getIconSrc = () => {
              // map tab names to public asset paths
              const key = tab.toLowerCase();
              if (!isDefault) {
                return "/assets/menuicons/appointment.svg"; // generic icon for new menus
              }

              if (key.includes("appointment")) {
                return "/assets/menuicons/appointment.svg";
              }
              if (key.includes("reschedule") || key.includes("schedule") || key.includes("resched")) {
                return "/assets/menuicons/clock.svg";
              }
              if (key.includes("inquiry") || key.includes("general")) {
                return "/assets/menuicons/inquiry.svg";
              }
              if (key.includes("cancel")) {
                return "/assets/menuicons/XCircle.svg";
              }

              return "/assets/menuicons/appointment.svg";
            };

            return (
              <li
                key={index}
                className="group w-full flex justify-between items-center gap-4 px-4 py-3 rounded-[15px] text-[12px] font-medium font-figtree leading-[1.32] bg-[#F4F0F9] text-[#6325A9] transition-all border border-transparent h-9"
              >
                <div className="flex items-center justify-start gap-2">
                  <Image src={getIconSrc()} alt={`${tab} icon`} width={18} height={18} />
                  {tab}
                </div>

                {!isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTab(index);
                    }}
                    className="relative w-5 h-5 opacity-100 flex items-center justify-center hover:opacity-100 cursor-pointer"
                    aria-label={`Remove ${tab}`}
                    role="button"
                    title="Remove topic"
                  >
                    <Image src="/assets/menuicons/X.svg" alt="remove icon" width={20} height={20} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* Add New Topic */}
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && newTabName.trim()) {
                handleAddNewTab();
              }
            }}
            className="flex-1 px-3 py-3 border border-[#D2D5DB] rounded-lg shadow-sm bg-[#F9FAFB] h-9 text-black placeholder:text-[#9DA3AE] focus:outline-none max-w-[530px]"
            placeholder="Add a new topic..."
          />
          <Button
            onClick={handleAddNewTab}
            disabled={isAddingTab || !newTabName.trim()}
            className="btn-primary-gradient whitespace-nowrap mt-1 w-32 flex items-center justify-between gap-2"
          >
            <span className="text-[20px]">+</span>
            <span>Add</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
