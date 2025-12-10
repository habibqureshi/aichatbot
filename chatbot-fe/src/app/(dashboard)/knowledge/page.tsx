"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getKnowledgeList, createKnowledge, deleteKnowledge } from "@/app/actions/knowledge";
import { getAppSettingByKey, updateAppSetting } from "@/app/actions/app-settings";
import { Knowledge } from "@/app/types/knowledge";
import { toast } from "react-toastify";
import {
  GreetingConfiguration,
  MenuTopics,
  KnowledgeBase,
  FileUpload,
  DeleteModal,
} from "@/components/knowledge";

export default function KnowledgePage() {
  const [existingFiles, setExistingFiles] = useState<Knowledge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // States for greeting
  const [greetingMessage, setGreetingMessage] = useState("");
  const [greetingSettingId, setGreetingSettingId] = useState<number | null>(null);
  const [isTraining, setIsTraining] = useState(false);

  // States for menu
  const [menuTabs, setMenuTabs] = useState<string[]>([
    "appointment book",
    "reschedule",
    "general inquiry",
    "cancel",
  ]);
  const [menuSettingId, setMenuSettingId] = useState<number | null>(null);
  const [newTabName, setNewTabName] = useState("");
  const [isAddingTab, setIsAddingTab] = useState(false);

  // Default tabs that cannot be deleted
  const defaultTabs = useMemo(() => ["appointment book", "reschedule", "general inquiry", "cancel"], []);

  // States for file upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<Knowledge | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Ref for upload button scrolling
  const uploadButtonRef = useRef<HTMLButtonElement>(null);

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

  const fetchAppSettings = useCallback(async () => {
    try {
      // Fetch greeting
      const greetingData = await getAppSettingByKey("GREETING");
      setGreetingMessage(greetingData.value);
      setGreetingSettingId(greetingData.id);

      // Fetch menu
      const menuData = await getAppSettingByKey("MENU");
      setMenuSettingId(menuData.id);

      // Parse menu items if value exists
      if (menuData.value && menuData.value.trim()) {
        try {
          const parsedMenu = JSON.parse(menuData.value);
          if (Array.isArray(parsedMenu)) {
            // Sort the menu tabs to match the default order
            const sortedMenu = defaultTabs
              .filter((tab) => parsedMenu.includes(tab))
              .concat(parsedMenu.filter((tab) => !defaultTabs.includes(tab)));
            setMenuTabs(sortedMenu);
          }
        } catch (parseError) {
          console.error("Error parsing menu data:", parseError);
          // Keep default menu tabs if parsing fails
        }
      }
    } catch (error: unknown) {
      console.error("Error fetching app settings:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to load app settings");
      }
    }
  }, [defaultTabs]);

  useEffect(() => {
    fetchKnowledge();
    fetchAppSettings();
  }, [fetchKnowledge, fetchAppSettings]);

  const handleTrainAI = async () => {
    if (!greetingMessage.trim()) {
      toast.error("Please enter a greeting message");
      return;
    }

    if (!greetingSettingId) {
      toast.error("Greeting setting not initialized");
      return;
    }

    try {
      setIsTraining(true);
      await updateAppSetting(greetingSettingId, {
        key: "GREETING",
        value: greetingMessage.trim(),
      });
      toast.success("AI greeting updated successfully!");
    } catch (error: unknown) {
      console.error("Error training AI:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update AI greeting");
      }
    } finally {
      setIsTraining(false);
    }
  };

  const handleAddNewTab = async () => {
    if (!newTabName.trim()) {
      toast.error("Please enter a tab name");
      return;
    }

    // Check for duplicate tab names
    if (menuTabs.includes(newTabName.trim())) {
      toast.error("This topic already exists");
      return;
    }

    if (!menuSettingId) {
      toast.error("Menu setting not initialized");
      return;
    }

    try {
      setIsAddingTab(true);
      const updatedMenuTabs = [...menuTabs, newTabName.trim()];

      await updateAppSetting(menuSettingId, {
        key: "MENU",
        value: JSON.stringify(updatedMenuTabs),
      });

      setMenuTabs(updatedMenuTabs);
      toast.success(`New tab "${newTabName.trim()}" added successfully!`);
      setNewTabName("");
    } catch (error: unknown) {
      console.error("Error adding tab:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add new tab");
      }
    } finally {
      setIsAddingTab(false);
    }
  };

  const handleRemoveTab = async (index: number) => {
    const tabToRemove = menuTabs[index];

    if (!menuSettingId) {
      toast.error("Menu setting not initialized");
      return;
    }

    try {
      const updatedMenuTabs = menuTabs.filter((_, i) => i !== index);

      await updateAppSetting(menuSettingId, {
        key: "MENU",
        value: JSON.stringify(updatedMenuTabs),
      });

      setMenuTabs(updatedMenuTabs);
      toast.success(`Tab "${tabToRemove}" removed successfully!`);
    } catch (error: unknown) {
      console.error("Error removing tab:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to remove tab");
      }
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
    const allowedExtensions = [".txt"];
    const invalidFiles = files.filter((file) => {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      return !allowedExtensions.includes(extension);
    });

    if (invalidFiles.length > 0) {
      toast.error("Only .txt files are allowed.");
      // Clear the input
      e.target.value = "";
      return;
    }

    setUploadedFiles(files);

    // Scroll to upload button after file selection
    setTimeout(() => {
      uploadButtonRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <GreetingConfiguration
            greetingMessage={greetingMessage}
            setGreetingMessage={setGreetingMessage}
            isTraining={isTraining}
            handleTrainAI={handleTrainAI}
          />

          <MenuTopics
            menuTabs={menuTabs}
            newTabName={newTabName}
            setNewTabName={setNewTabName}
            isAddingTab={isAddingTab}
            handleAddNewTab={handleAddNewTab}
            handleRemoveTab={handleRemoveTab}
            defaultTabs={defaultTabs}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <KnowledgeBase existingFiles={existingFiles} handleDeleteFile={handleDeleteFile} />

          <FileUpload
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            isUploading={isUploading}
            handleFileSelection={handleFileSelection}
            handleFileUpload={handleFileUpload}
            uploadButtonRef={uploadButtonRef}
          />
        </div>
      </div>

      <DeleteModal
        showDeleteModal={showDeleteModal}
        fileToDelete={fileToDelete}
        confirmDeleteFile={confirmDeleteFile}
        cancelDeleteFile={cancelDeleteFile}
      />
    </div>
  );
}
