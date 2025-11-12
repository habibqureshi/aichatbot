export interface Knowledge {
  id: number;
  name: string;
  blob_name: string;
  created_at: string;
  is_active: boolean;
  description?: string; // Optional, can be derived from content or set later
  content?: string; // Optional, will be fetched from PDF API later
  updatedAt?: string; // Optional, using created_at for now
}

export interface KnowledgeResponse {
  data: Knowledge[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  activeKnowledgeId?: string; // May need to be determined separately
}
