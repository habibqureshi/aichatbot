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
  const [selectedTab, setSelectedTab] = useState<string>("");
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

  const handleSelectTab = async (tabName: string) => {
    try {
      setSelectedTab(tabName);
      // TODO: Implement the select tab API call
      // await selectTab({ name: tabName });
      toast.success(`Selected tab: ${tabName}`);
    } catch (error: unknown) {
      console.error("Error selecting tab:", error);
      toast.error("Failed to select tab");
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
          <h1 className="text-xl sm:text-2xl font-bold text-[#2A2A2A]">Knowledge Management</h1>
          <p className="text-sm sm:text-base text-[#787878] mt-1">
            Train AI, manage menus, and upload knowledge files
          </p>
        </div>
        <div className="bg-[#F4F4FD] rounded-lg shadow p-6" style={{ border: "1px solid #E3C5FF" }}>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[#E3C5FF] rounded w-1/4"></div>
            <div className="h-10 bg-white rounded" style={{ border: "1px solid #E3C5FF" }}></div>
            <div className="h-32 bg-white rounded" style={{ border: "1px solid #E3C5FF" }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#2A2A2A]">Knowledge Management</h1>
        <p className="text-sm sm:text-base text-[#787878] mt-1">
          Train AI, manage menus, and upload knowledge files
        </p>
      </div>

      <div className="space-y-6">
        {/* Train AI Section */}
        <div
          className="bg-[#F4F4FD] rounded-lg shadow p-4 sm:p-6"
          style={{ border: "1px solid #E3C5FF" }}
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#2A2A2A]">Train AI</h2>
            <p className="text-sm text-[#787878] mt-1">Enter a greeting message to train the AI agent</p>
          </div>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="greeting-message"
                className="block text-sm font-medium text-[#2A2A2A] mb-2"
              >
                Greeting Message
              </label>
              <textarea
                id="greeting-message"
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                className="w-full px-3 py-2 border rounded-md shadow-sm bg-white text-[#2A2A2A] focus:outline-none focus:ring-[#4318FF] focus:border-[#4318FF] resize-none"
                style={{ border: "1px solid #E3C5FF" }}
                placeholder="Enter your greeting message here..."
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleTrainAI}
                disabled={isTraining || !greetingMessage.trim()}
                className="bg-gradient-to-r from-[#9882F7] to-[#4318FF] hover:from-[#8872E7] hover:to-[#3518EF] text-white"
              >
                {isTraining ? "Training..." : "Train AI"}
              </Button>
            </div>
          </div>
        </div>

        {/* Menu Tabs Section */}
        <div
          className="bg-[#F4F4FD] rounded-lg shadow p-4 sm:p-6"
          style={{ border: "1px solid #E3C5FF" }}
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#2A2A2A]">Menu Management</h2>
            <p className="text-sm text-[#787878] mt-1">
              Select existing tabs or add new ones for the AI menu system
            </p>
          </div>
          <div className="space-y-4">
            {/* Existing Tabs */}
            <div>
              <h3 className="text-sm font-medium text-[#2A2A2A] mb-2">Available Tabs</h3>
              <div className="flex flex-wrap gap-2">
                {menuTabs.map((tab, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedTab === tab
                        ? "bg-gradient-to-r from-[#9882F7] to-[#4318FF] text-white"
                        : "bg-white border border-[#E3C5FF] text-[#2A2A2A] hover:border-[#9882F7]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Add New Tab */}
            <div className="border-t pt-4" style={{ borderColor: "#E3C5FF" }}>
              <h3 className="text-sm font-medium text-[#2A2A2A] mb-2">Add New Tab</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md shadow-sm bg-white text-[#2A2A2A] focus:outline-none focus:ring-[#4318FF] focus:border-[#4318FF]"
                  style={{ border: "1px solid #E3C5FF" }}
                  placeholder="Enter new tab name"
                />
                <Button
                  onClick={handleAddNewTab}
                  disabled={isAddingTab || !newTabName.trim()}
                  className="bg-gradient-to-r from-[#9882F7] to-[#4318FF] hover:from-[#8872E7] hover:to-[#3518EF] text-white"
                >
                  {isAddingTab ? "Adding..." : "Add Tab"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload and Management Section */}
        <div
          className="bg-[#F4F4FD] rounded-lg shadow p-4 sm:p-6"
          style={{ border: "1px solid #E3C5FF" }}
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#2A2A2A]">File Management</h2>
            <p className="text-sm text-[#787878] mt-1">
              Upload new knowledge files and manage existing ones
            </p>
          </div>
          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <h3 className="text-sm font-medium text-[#2A2A2A] mb-2">Upload Files</h3>
              <div className="space-y-4">
                <div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.csv"
                    onChange={handleFileSelection}
                    className="w-full px-3 py-2 border rounded-md shadow-sm bg-white text-[#2A2A2A] focus:outline-none focus:ring-[#4318FF] focus:border-[#4318FF] cursor-pointer"
                    style={{ border: "1px solid #E3C5FF" }}
                  />
                  <p className="text-xs text-[#787878] mt-1">Supported formats: PDF, TXT, CSV</p>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #E3C5FF" }}>
                    <h4 className="text-sm font-medium text-[#2A2A2A] mb-2">Selected Files:</h4>
                    <ul className="space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="text-sm text-[#787878]">
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={handleFileUpload}
                    disabled={isUploading || uploadedFiles.length === 0}
                    className="bg-gradient-to-r from-[#9882F7] to-[#4318FF] hover:from-[#8872E7] hover:to-[#3518EF] text-white"
                  >
                    {isUploading ? "Uploading..." : "Upload Files"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing Files */}
            {existingFiles.length > 0 && (
              <div className="border-t pt-6" style={{ borderColor: "#E3C5FF" }}>
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-[#2A2A2A]">Existing Files</h3>
                </div>
                <ul className="space-y-3 max-h-96 overflow-auto">
                  {existingFiles.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-[#9882F7] transition-colors"
                      style={{ borderColor: "#E3C5FF" }}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-[#2A2A2A] mb-1">
                          {file.name || file.blob_name}
                        </h4>
                        <p className="text-xs text-[#787878]">
                          Updated: {new Date(file.updatedAt || file.created_at).toLocaleDateString()}
                          {file.is_active && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-[#9882F7] to-[#4318FF] text-white">
                              Active
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file)}
                        className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
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
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && fileToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-[#F4F4FD] rounded-lg shadow-xl max-w-md w-full"
            style={{ border: "1px solid #E3C5FF" }}
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
                  <h3 className="text-lg font-semibold text-[#2A2A2A]">Delete File</h3>
                  <p className="text-sm text-[#787878] mt-1">
                    Are you sure you want to delete this file? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 mb-6" style={{ border: "1px solid #E3C5FF" }}>
                <h4 className="font-medium text-sm text-[#2A2A2A] mb-1">
                  {fileToDelete.name || fileToDelete.blob_name}
                </h4>
                <p className="text-xs text-[#787878]">
                  Updated:{" "}
                  {new Date(fileToDelete.updatedAt || fileToDelete.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={cancelDeleteFile}
                  variant="outline"
                  className="border-[#E3C5FF] text-[#2A2A2A] hover:bg-[#E3C5FF] hover:text-[#2A2A2A]"
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
