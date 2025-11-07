"use client";

import { useState, useEffect, useCallback } from "react";
import { getKnowledgeList, updateActiveKnowledge } from "@/app/actions/knowledge";
import { Knowledge } from "@/app/types/knowledge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

export default function KnowledgePage() {
  const dummyKnowledgeList: Knowledge[] = [
    {
      id: "general-healthcare",
      name: "General Healthcare Knowledge",
      description:
        "Basic healthcare procedures, appointment scheduling, and general medical information",
      content: `Healthcare Knowledge Base:

APPOINTMENT SCHEDULING:
- Schedule appointments for patients
- Check doctor availability
- Handle rescheduling and cancellations
- Confirm appointment details

PATIENT INFORMATION:
- Collect patient name, phone number, and reason for visit
- Verify insurance information
- Update patient records

GENERAL PROCEDURES:
- Direct patients to appropriate departments
- Provide basic medical advice
- Handle emergency situations
- Coordinate with medical staff

COMMUNICATION:
- Maintain professional and empathetic tone
- Confirm all information
- Provide clear next steps`,
      isActive: true,
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "cardiology-specialist",
      name: "Cardiology Specialist Knowledge",
      description: "Specialized knowledge for heart-related conditions and cardiology appointments",
      content: `Cardiology Specialist Knowledge:

HEART CONDITIONS:
- Coronary artery disease
- Heart failure
- Arrhythmias
- Valvular heart disease

DIAGNOSTIC PROCEDURES:
- ECG/EKG interpretation
- Echocardiograms
- Stress tests
- Cardiac catheterization

TREATMENT OPTIONS:
- Medication management
- Lifestyle modifications
- Interventional procedures
- Surgical interventions

EMERGENCY SYMPTOMS:
- Chest pain
- Shortness of breath
- Irregular heartbeat
- Dizziness/fainting`,
      isActive: false,
      createdAt: "2024-01-20T14:30:00Z",
      updatedAt: "2024-01-25T09:15:00Z",
    },
    {
      id: "pediatric-care",
      name: "Pediatric Care Knowledge",
      description: "Child healthcare, vaccinations, and pediatric appointment management",
      content: `Pediatric Care Knowledge:

CHILD HEALTHCARE:
- Well-child visits
- Immunization schedules
- Growth and development monitoring
- Common childhood illnesses

VACCINATION SCHEDULE:
- Birth to 6 months
- 6 to 12 months
- 12 to 18 months
- Annual flu shots

PARENTS CONCERNS:
- Fever management
- Feeding issues
- Sleep problems
- Behavioral concerns

SPECIALIZED CARE:
- Neonatal care
- Adolescent health
- Chronic conditions
- Developmental disorders`,
      isActive: false,
      createdAt: "2024-02-01T11:45:00Z",
      updatedAt: "2024-02-10T16:20:00Z",
    },
    {
      id: "emergency-response",
      name: "Emergency Response Knowledge",
      description: "Emergency medical situations and urgent care coordination",
      content: `Emergency Response Knowledge:

URGENT SYMPTOMS:
- Severe chest pain
- Difficulty breathing
- Severe bleeding
- Loss of consciousness

EMERGENCY PROTOCOLS:
- Call emergency services (911)
- Provide immediate first aid
- Coordinate with emergency room
- Notify appropriate medical staff

TRIAGE SYSTEM:
- Assess severity of condition
- Prioritize urgent cases
- Direct to appropriate care level
- Monitor patient status

COORDINATION:
- Communicate with emergency services
- Prepare medical records
- Arrange transportation
- Follow up with patient/family`,
      isActive: false,
      createdAt: "2024-02-15T08:00:00Z",
      updatedAt: "2024-02-20T13:30:00Z",
    },
  ];

  const [knowledgeList, setKnowledgeList] = useState<Knowledge[]>(dummyKnowledgeList);
  const [activeKnowledgeId, setActiveKnowledgeId] = useState<string>(
    dummyKnowledgeList.find((k) => k.isActive)?.id || ""
  );
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string>(
    dummyKnowledgeList.find((k) => k.isActive)?.id || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchKnowledge = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getKnowledgeList();
      setKnowledgeList(response.knowledge);
      setActiveKnowledgeId(response.activeKnowledgeId);
      setSelectedKnowledgeId(response.activeKnowledgeId);
    } catch (error) {
      console.error("Error fetching knowledge:", error);
      // Keep dummy data if API fails
      toast.error("Failed to load knowledge base from server, using local data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  const handleUpdateActiveKnowledge = async () => {
    if (selectedKnowledgeId === activeKnowledgeId) {
      toast.info("This knowledge is already active");
      return;
    }

    try {
      setIsUpdating(true);
      await updateActiveKnowledge(selectedKnowledgeId);
      setActiveKnowledgeId(selectedKnowledgeId);
      toast.success("Active knowledge updated successfully");
    } catch (error) {
      console.error("Error updating active knowledge:", error);
      toast.error("Failed to update active knowledge");
    } finally {
      setIsUpdating(false);
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Current Knowledge</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          View and manage the system&apos;s current knowledge base for AI agent instructions
        </p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Knowledge Base</label>
                <Select value={selectedKnowledgeId} onValueChange={setSelectedKnowledgeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a knowledge base" />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgeList.map((knowledge) => (
                      <SelectItem key={knowledge.id} value={knowledge.id}>
                        <div className="flex items-center gap-2">
                          <span>{knowledge.name}</span>
                          {knowledge.id === activeKnowledgeId && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              Active
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <p className="text-sm text-gray-600 mt-1">{selectedKnowledge.description}</p>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Knowledge Content</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedKnowledge.content}
                  </pre>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-500">
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(selectedKnowledge.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>{" "}
                  {new Date(selectedKnowledge.updatedAt).toLocaleDateString()}
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
                <p className="text-xs text-gray-600 line-clamp-2">{knowledge.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Updated: {new Date(knowledge.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
