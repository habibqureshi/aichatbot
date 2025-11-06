"use client";

import { useState } from "react";
import { uploadTrainingFile } from "@/app/actions/chat";

export default function TrainPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setMessage("Please select a file.");
      return;
    }
    setIsUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await uploadTrainingFile(formData);
      setMessage("Uploaded successfully");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Train Knowledge Base</h1>
        <p className="text-gray-600 mt-1">
          Upload documents to train the AI system with healthcare knowledge
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Select Document
            </label>
            <input
              type="file"
              id="file-upload"
              accept=".txt,.pdf,.csv,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">Supported formats: TXT, PDF, CSV, DOC, DOCX</p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading || !file}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload & Train"}
            </button>
          </div>
        </form>

        {message && (
          <div
            className={`mt-4 p-4 rounded-md ${
              message.includes("successfully") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
