"use client";

import { useState, useEffect, useCallback } from "react";
import { getKnowledgeList, createKnowledge, deleteKnowledge } from "@/app/actions/knowledge";
import { Knowledge } from "@/app/types/knowledge";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

export default function KnowledgePage() {
  const [existingFiles, setExistingFiles] = useState<Knowledge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New states for the revamped page
  const [greetingMessage, setGreetingMessage] = useState("");
  const [isTraining, setIsTraining] = useState(false);
  const [menuTabs, setMenuTabs] = useState<string[]>([
    "appointment book",
    "cancel",
    "reschedule",
    "general inquiry",
  ]);
  const [newTabName, setNewTabName] = useState("");
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<Knowledge | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchKnowledge = useCallback(async (page: number = 1, limit: number = 10) => {
    try {
      setIsLoading(true);
      const response = await getKnowledgeList(page, limit);
      setExistingFiles(response.data);
    } catch (error: unknown) {
      console.error("Error fetching knowledge:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to load knowledge");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  const handleTrainAI = async () => {
    if (!greetingMessage.trim()) {
      toast.error("Please enter a greeting message");
      return;
    }

    try {
      setIsTraining(true);
      // TODO: Implement the train AI API call
      // await trainAI({ greeting: greetingMessage.trim() });
      toast.success("AI training started successfully!");
      setGreetingMessage("");
    } catch (error: unknown) {
      console.error("Error training AI:", error);
      toast.error("Failed to train AI");
    } finally {
      setIsTraining(false);
    }
  };

  const handleAddNewTab = async () => {
    if (!newTabName.trim()) {
      toast.error("Please enter a tab name");
      return;
    }

    try {
      setIsAddingTab(true);
      // TODO: Implement the add tab API call
      // await addTab({ name: newTabName.trim() });
      setMenuTabs([...menuTabs, newTabName.trim()]);
      toast.success(`New tab "${newTabName.trim()}" added successfully!`);
      setNewTabName("");
    } catch (error: unknown) {
      console.error("Error adding tab:", error);
      toast.error("Failed to add new tab");
    } finally {
      setIsAddingTab(false);
    }
  };

  const handleFileUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    try {
      setIsUploading(true);

      // Upload each file
      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        await createKnowledge(formData);
      }

      toast.success(`${uploadedFiles.length} file(s) uploaded successfully!`);
      setUploadedFiles([]);
      // Refresh the file list
      await fetchKnowledge();
    } catch (error: unknown) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file types
    const allowedExtensions = [".txt", ".pdf", ".csv"];
    const invalidFiles = files.filter((file) => {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      return !allowedExtensions.includes(extension);
    });

    if (invalidFiles.length > 0) {
      toast.error("Only .txt, .pdf, and .csv files are allowed.");
      // Clear the input
      e.target.value = "";
      return;
    }

    setUploadedFiles(files);
  };

  const handleDeleteFile = (file: Knowledge) => {
    setFileToDelete(file);
    setShowDeleteModal(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      await deleteKnowledge(fileToDelete.id);
      toast.success(`File "${fileToDelete.name || fileToDelete.blob_name}" deleted successfully!`);
      setShowDeleteModal(false);
      setFileToDelete(null);
      // Refresh the file list
      await fetchKnowledge();
    } catch (error: unknown) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const cancelDeleteFile = () => {
    setShowDeleteModal(false);
    setFileToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Knowledge Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Train AI, manage menus, and upload knowledge files
          </p>
        </div>
        <div
          className="backdrop-blur-sm border rounded-xl p-6 shadow-sm"
          style={{
            background: "#FFFFFF",
            borderColor: "#F0EEFF",
          }}
        >
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-100 rounded"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Knowledge Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Train your AI agent and manage its knowledge base
        </p>
      </div>

      {/* Grid Layout: Left and Right Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* 1. Agent Persona - Train AI Section with Chat Preview */}
          <div
            className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[400px] flex flex-col"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Agent Persona</h2>
                <p className="text-sm text-gray-600 mt-1">Customize your AI&apos;s greeting message</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <textarea
                  id="greeting-message"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Hello! I'm your MediCall AI assistant. How can I help you today?"
                  rows={3}
                  required
                />
              </div>

              {/* Chat Preview */}
              {greetingMessage && (
                <div className="bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <span className="text-[#8B5CF6] font-semibold text-sm">AI</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-white/80 mb-1">MediCall Assistant</div>
                      <div className="text-sm text-white">{greetingMessage}</div>
                      <div className="text-xs text-white/60 mt-2">Just now</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleTrainAI}
                  disabled={isTraining || !greetingMessage.trim()}
                  className="btn-primary-gradient"
                >
                  {isTraining ? "Updating..." : "Update Agent"}
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-xs text-blue-800">
                    <strong>Preview Updates Live:</strong> Changes to your greeting message appear
                    instantly in the chat preview
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Menu Topics Section */}
          <div
            className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[350px] flex flex-col"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Menu Topics</h2>
              <p className="text-sm text-gray-600 mt-1">Configure available conversation topics</p>
            </div>

            <div className="space-y-4">
              {/* Existing Menu Topics */}
              <div className="flex flex-wrap gap-2">
                {menuTabs.map((tab, index) => (
                  <button
                    key={index}
                    className="group relative px-4 py-2 rounded-lg text-sm font-medium transition-all bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    {tab}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuTabs(menuTabs.filter((_, i) => i !== index));
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      title="Remove topic"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </button>
                ))}
              </div>

              {/* Add New Topic */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && newTabName.trim()) {
                        handleAddNewTab();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add a new topic..."
                  />
                  <Button
                    onClick={handleAddNewTab}
                    disabled={isAddingTab || !newTabName.trim()}
                    className="btn-primary-gradient whitespace-nowrap"
                  >
                    + Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* 3. Knowledge Base - Uploaded Files with Training History */}
          <div
            className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[400px] flex flex-col"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
              <p className="text-sm text-gray-600 mt-1">Upload documents to train your AI agent</p>
            </div>

            {/* Existing Files with Training Status */}
            {existingFiles.length > 0 ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {existingFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-[#8B5CF6] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-gray-600"
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
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {file.name || file.blob_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {file.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              ✓ Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              In-active
                            </span>
                          )}
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

          {/* 4. File Upload Section */}
          <div
            className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[350px] flex flex-col"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
              <p className="text-sm text-gray-600 mt-1">Add new knowledge to your AI agent</p>
            </div>

            <div className="space-y-4">
              {/* Drag & Drop Area */}
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.txt,.csv,.docx"
                  onChange={handleFileSelection}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-40 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="w-10 h-10 text-gray-400 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Drag & drop files here, or <span className="text-blue-600">browse</span>
                  </p>
                  <p className="text-xs text-gray-500">Supports PDF, TXT, DOCX up to 10MB</p>
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && fileToDelete && (
        <div
          className="fixed inset-0  flex items-center justify-center z-[9999] p-4"
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
                  Updated:{" "}
                  {new Date(fileToDelete.updatedAt || fileToDelete.created_at).toLocaleDateString()}
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
        </div>
      )}
    </div>
  );
}
