// 相続税計算アプリの型定義

export enum HeirType {
  SPOUSE = 'spouse',
  CHILD = 'child',
  PARENT = 'parent',
  SIBLING = 'sibling',
  OTHER = 'other'
}

export enum RelationshipType {
  SPOUSE = 'spouse',
  CHILD = 'child',
  ADOPTED_CHILD = 'adopted_child',
  GRANDCHILD_ADOPTED = 'grandchild_adopted',
  PARENT = 'parent',
  SIBLING = 'sibling',
  HALF_SIBLING = 'half_sibling',
  OTHER = 'other'
}

export interface FamilyStructure {
  spouse_exists: boolean;
  children_count: number;
  adopted_children_count: number;
  grandchild_adopted_count: number;
  parents_alive: number;
  siblings_count: number;
  half_siblings_count: number;
  non_heirs_count: number;
}

export interface Heir {
  id: string;
  name: string;
  heir_type: HeirType;
  relationship: RelationshipType;
  inheritance_share: number;
  two_fold_addition: boolean;
  is_adopted?: boolean;
}

export interface TaxCalculationResult {
  legal_heirs: Heir[];
  total_heirs_count: number;
  basic_deduction: number;
  taxable_estate: number;
  total_tax_amount: number;
  heir_tax_details: {
    heir_id: string;
    name: string;
    relationship: string;
    legal_share_amount: number;
    tax_before_addition: number;
    two_fold_addition: boolean;
    legal_share_fraction: string;
  }[];
}

export interface DivisionInput {
  heirs: Heir[];
  total_amount: number;
  total_tax_amount: number;
  mode: 'amount' | 'percentage';
  amounts?: Record<string, number>;
  percentages?: Record<string, number>;
  rounding_method?: 'round' | 'floor' | 'ceil';
}

export interface DivisionResult {
  total_final_tax_amount: number;
  division_details: {
    heir_id: string;
    name: string;
    relationship: string;
    acquired_amount: number;
    distributed_tax: number;
    adjustment: number;
    final_tax_amount: number;
  }[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
}

// 税額速算表
export interface TaxTableRow {
  max_amount: number;
  tax_rate: number;
  deduction: number;
}

export const TAX_TABLE: TaxTableRow[] = [
  { max_amount: 10_000_000, tax_rate: 0.10, deduction: 0 },
  { max_amount: 30_000_000, tax_rate: 0.15, deduction: 500_000 },
  { max_amount: 50_000_000, tax_rate: 0.20, deduction: 2_000_000 },
  { max_amount: 100_000_000, tax_rate: 0.30, deduction: 7_000_000 },
  { max_amount: 200_000_000, tax_rate: 0.40, deduction: 17_000_000 },
  { max_amount: 300_000_000, tax_rate: 0.45, deduction: 27_000_000 },
  { max_amount: 600_000_000, tax_rate: 0.50, deduction: 42_000_000 },
  { max_amount: Infinity, tax_rate: 0.55, deduction: 72_000_000 }
];

// 定数
export const BASIC_DEDUCTION_BASE = 30_000_000;
export const BASIC_DEDUCTION_PER_HEIR = 6_000_000;
export const TWO_FOLD_ADDITION_EXEMPT = [HeirType.SPOUSE, HeirType.CHILD, HeirType.PARENT];

