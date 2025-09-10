export type SettingType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON";

export interface SortCriteria {
  field: string;
  sortOrder: number;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  type: SettingType;
  json: Record<string, unknown> | null;
  createdBy: string;
  updatedBy: string;
  createdTs: string;
  updatedTs: string;
}

export interface SettingsResponse {
  content: Setting[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  sort: {
    sorted: boolean;
    unsorted: boolean;
    empty: boolean;
  };
  numberOfElements: number;
  pageable: {
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  first: boolean;
  last: boolean;
  empty: boolean;
}
