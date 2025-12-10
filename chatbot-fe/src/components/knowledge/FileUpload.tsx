"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { RefObject } from "react";

interface FileUploadProps {
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  isUploading: boolean;
  handleFileSelection: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: () => void;
  uploadButtonRef: RefObject<HTMLButtonElement | null>;
}

export default function FileUpload({
  uploadedFiles,
  setUploadedFiles,
  isUploading,
  handleFileSelection,
  handleFileUpload,
  uploadButtonRef,
}: FileUploadProps) {
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
        <div className="">
          <h2 className="text-xl font-semibold text-black">Upload Documents</h2>
          <p className="text-sm text-[#64748B] mt-1">Add new knowledge to your AI agent</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Drag & Drop Area */}
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".txt"
            onChange={handleFileSelection}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-52 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <Image src="/assets/upload.svg" alt="AI Chatbot Logo" width={72} height={68} />
            <p className="text-sm font-medium text-black mt-6">
              Drag & drop files here, or <span className="text-brand-purple">browse</span>
            </p>
            <p className="text-xs text-gray-500">Supports TXT files up to 5MB</p>
          </label>
        </div>

        {/* Selected Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">
                Selected Files ({uploadedFiles.length})
              </h4>
              <button
                onClick={() => setUploadedFiles([])}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
            <ul className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
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
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            ref={uploadButtonRef}
            onClick={handleFileUpload}
            disabled={isUploading || uploadedFiles.length === 0}
            className="btn-primary-gradient w-full sm:w-auto"
          >
            {isUploading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Uploading...
              </>
            ) : (
              "Upload Files"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
