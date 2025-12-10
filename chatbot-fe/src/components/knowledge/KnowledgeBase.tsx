"use client";

import { Knowledge } from "@/app/types/knowledge";
import Image from "next/image";

interface KnowledgeBaseProps {
  existingFiles: Knowledge[];
  handleDeleteFile: (file: Knowledge) => void;
}

export default function KnowledgeBase({ existingFiles, handleDeleteFile }: KnowledgeBaseProps) {
  return (
    <div
      className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[400px] flex flex-col"
      style={{
        background: "#FFFFFF",
        borderColor: "#F0EEFF",
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-14 h-14 bg-[#6325A9] rounded-lg flex items-center justify-center">
          <Image src="/assets/knowledge.svg" alt="AI Chatbot Logo" width={37} height={35} />
        </div>
        <div className="">
          <h2 className="text-xl font-semibold text-black">Knowledge Base</h2>
          <p className="text-sm text-[#64748B] mt-1">Upload documents to train your AI agent</p>
        </div>
      </div>

      {/* Existing Files with Training Status */}
      {existingFiles.length > 0 ? (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
          {existingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#dbdde7] hover:border-[#cacdda] transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 bg-[#FFFFFF] rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-normal text-base leading[1.32] text-brand-dark truncate">
                    {file.name || file.blob_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {/* {file.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✓ Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        In-active
                      </span>
                    )} */}
                    <span className="text-xs text-gray-500">
                      {new Date(file.updatedAt || file.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteFile(file)}
                className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center py-12 text-gray-500">
          <div>
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700 mb-1">No documents uploaded yet</p>
            <p className="text-xs text-gray-500">Upload files below to train your AI agent</p>
          </div>
        </div>
      )}
    </div>
  );
}
