export interface Knowledge {
  id: string;
  name: string;
  description: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeResponse {
  knowledge: Knowledge[];
  activeKnowledgeId: string;
}
