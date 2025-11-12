"use client";

import { useState, useEffect, useCallback } from "react";
import { getKnowledgeList, updateActiveKnowledge, createKnowledge } from "@/app/actions/knowledge";
import { Knowledge } from "@/app/types/knowledge";
import { Button } from "@/components/ui/button";
import SingleSelect from "@/components/common/SingleSelect";
import { toast } from "react-toastify";
export default function KnowledgePage() {
  const [knowledgeList, setKnowledgeList] = useState<Knowledge[]>([]);
  const [activeKnowledgeId, setActiveKnowledgeId] = useState<number | null>(null);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKnowledgeName, setNewKnowledgeName] = useState("");
  const [newKnowledgeFile, setNewKnowledgeFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  // const [currentPage, setCurrentPage] = useState(1);
  // const [totalPages, setTotalPages] = useState(0);
  // const [totalItems, setTotalItems] = useState(0);

  const fetchKnowledge = useCallback(async (page: number = 1, limit: number = 10) => {
    try {
      setIsLoading(true);
      const response = await getKnowledgeList(page, limit);
      setKnowledgeList(response.data);
      // setTotalItems(response.metadata.total);
      // setTotalPages(response.metadata.total_pages);
      // setCurrentPage(response.metadata.page);

      // Find the active knowledge from the list
      const activeKnowledge = response.data.find((k) => k.is_active);
      setActiveKnowledgeId(activeKnowledge?.id || null);
      setSelectedKnowledgeId(activeKnowledge?.id || null);
    } catch (error) {
      console.error("Error fetching knowledge:", error);
      toast.error("Failed to load knowledge.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // useEffect(() => {
  //   fetchKnowledge();
  // }, [fetchKnowledge]);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  const handleUpdateActiveKnowledge = async () => {
    if (!selectedKnowledgeId || selectedKnowledgeId === activeKnowledgeId) {
      toast.info("This knowledge is already active");
      return;
    }

    try {
      setIsUpdating(true);
      const response = await updateActiveKnowledge(selectedKnowledgeId);
      console.log("Knowledge activation successful:", response);

      // Refresh the knowledge list to get updated active status from backend
      await fetchKnowledge();

      toast.success("Active knowledge updated successfully");
    } catch (error) {
      console.error("Error updating active knowledge:", error);
      toast.error("Failed to update active knowledge");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKnowledgeName.trim()) {
      toast.error("Please enter a knowledge name");
      return;
    }
    if (!newKnowledgeFile) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setIsCreating(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("name", newKnowledgeName.trim());
      formData.append("file", newKnowledgeFile);

      // Upload file to backend
      const uploadResponse = await createKnowledge(formData);
      console.log("Upload successful:", uploadResponse);

      // Refresh the knowledge list to get the updated data from backend
      await fetchKnowledge();

      toast.success("New knowledge uploaded and created successfully!");

      // Reset form
      setNewKnowledgeName("");
      setNewKnowledgeFile(null);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating knowledge:", error);
      toast.error("Failed to create new knowledge");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedKnowledge = knowledgeList.find((k) => k.id === selectedKnowledgeId);

  if (isLoading) {
    return (
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Current Knowledge</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            View and manage the system&apos;s current knowledge base
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Current Knowledge</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              View and manage the system&apos;s current knowledge base for AI agent instructions
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Create New Knowledge
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Knowledge Selection */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Select Active Knowledge
              {activeKnowledgeId && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Active: {knowledgeList.find((k) => k.id === activeKnowledgeId)?.name}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose which knowledge base the AI agent should use for processing calls and providing
              responses
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SingleSelect
                  label="Knowledge Base"
                  options={knowledgeList.map((knowledge) => ({
                    id: knowledge.id,
                    label: knowledge.name,
                    value: knowledge.id,
                  }))}
                  selectedValue={selectedKnowledgeId}
                  onChange={(value) =>
                    setSelectedKnowledgeId(typeof value === "string" ? parseInt(value) : value)
                  }
                  placeholder="Select a knowledge base"
                  emptyMessage="No knowledge bases available"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleUpdateActiveKnowledge}
                  disabled={isUpdating || selectedKnowledgeId === activeKnowledgeId}
                  className="w-full sm:w-auto"
                >
                  {isUpdating ? "Updating..." : "Update Active Knowledge"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Details */}
        {selectedKnowledge && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {selectedKnowledge.name}
                {selectedKnowledge.id === activeKnowledgeId && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Currently Active
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Blob: {selectedKnowledge.blob_name}</p>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">File Information</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Blob Name:</span> {selectedKnowledge.blob_name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Status:</span>{" "}
                    {selectedKnowledge.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-500">
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(selectedKnowledge.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>{" "}
                  {selectedKnowledge.updatedAt
                    ? new Date(selectedKnowledge.updatedAt).toLocaleDateString()
                    : new Date(selectedKnowledge.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge List Overview */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Knowledge Bases</h2>
            <p className="text-sm text-gray-600 mt-1">
              Overview of all available knowledge bases in the system
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {knowledgeList.map((knowledge) => (
              <div
                key={knowledge.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  knowledge.id === activeKnowledgeId
                    ? "border-green-500 bg-green-50"
                    : knowledge.id === selectedKnowledgeId
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedKnowledgeId(knowledge.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{knowledge.name}</h4>
                  {knowledge.id === activeKnowledgeId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{knowledge.blob_name}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Updated:{" "}
                  {knowledge.updatedAt
                    ? new Date(knowledge.updatedAt).toLocaleDateString()
                    : new Date(knowledge.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Knowledge Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New Knowledge</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ cursor: "pointer" }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateKnowledge} className="space-y-4">
                <div>
                  <label
                    htmlFor="knowledge-name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Knowledge Name
                  </label>
                  <input
                    type="text"
                    id="knowledge-name"
                    value={newKnowledgeName}
                    onChange={(e) => setNewKnowledgeName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter knowledge base name"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="knowledge-file"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Upload File
                  </label>
                  <input
                    type="file"
                    id="knowledge-file"
                    accept=".csv,.txt,.pdf,.doc,.docx,.json,.xml"
                    onChange={(e) => setNewKnowledgeFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: CSV, TXT, PDF, DOC, DOCX, JSON, XML
                  </p>
                  {newKnowledgeFile && (
                    <p className="text-sm text-green-600 mt-1">
                      Selected: {newKnowledgeFile.name} ({(newKnowledgeFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating || !newKnowledgeName.trim() || !newKnowledgeFile}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    style={{ cursor: "pointer" }}
                  >
                    {isCreating ? "Creating..." : "Create Knowledge"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
