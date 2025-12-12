"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Knowledge } from "@/app/types/knowledge";

interface DeleteModalProps {
  showDeleteModal: boolean;
  fileToDelete: Knowledge | null;
  confirmDeleteFile: () => void;
  cancelDeleteFile: () => void;
}

export default function DeleteModal({
  showDeleteModal,
  fileToDelete,
  confirmDeleteFile,
  cancelDeleteFile,
}: DeleteModalProps) {
  if (!showDeleteModal || !fileToDelete) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      style={{ margin: 0 }}
    >
      <div
        className="backdrop-blur-sm border rounded-xl shadow-xl max-w-md w-full relative z-[10000]"
        style={{
          background: "#FFFFFF",
          borderColor: "#F0EEFF",
        }}
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete File</h3>
              <p className="text-sm text-gray-600 mt-1">
                Are you sure you want to delete this file? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <h4 className="font-medium text-sm text-gray-900 mb-1">
              {fileToDelete.name || fileToDelete.blob_name}
            </h4>
            <p className="text-xs text-gray-500">
              Updated: {new Date(fileToDelete.updatedAt || fileToDelete.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={cancelDeleteFile}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button onClick={confirmDeleteFile} className="bg-red-600 hover:bg-red-700 text-white">
              Delete File
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
