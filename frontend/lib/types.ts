// ─── Enums ────────────────────────────────────────────────────────────────────
export type Role = 'ADMIN' | 'PROFESSEUR' | 'EMPLOYE';

export type RequestStatus =
  | 'BROUILLON'
  | 'EN_ATTENTE'
  | 'EN_COURS'
  | 'VALIDEE'
  | 'REJETEE'
  | 'DOCUMENT_DISPONIBLE'
  | 'ANNULEE';

export type FileType = 'PIECE_JOINTE' | 'GENERE' | 'SIGNE';
export type OrgUnitType = 'DEPARTEMENT' | 'SERVICE' | 'LABORATOIRE';
export type AllowedRole = 'TOUS' | 'PROFESSEUR' | 'EMPLOYE';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
  last_login_at: string | null;
  staff_profile: StaffProfile | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

// ─── Referentials ─────────────────────────────────────────────────────────────
export interface Grade {
  id: number;
  code: string;
  intitule_fr: string;
  intitule_ar: string | null;
  staff_type: 'PROFESSEUR' | 'EMPLOYE' | null;
  is_active: boolean;
}

export interface OrganizationalUnit {
  id: number;
  code: string;
  nom_fr: string;
  nom_ar: string | null;
  type: OrgUnitType;
  parent_id: number | null;
  is_active: boolean;
  children?: OrganizationalUnit[];
}

// ─── Profiles ─────────────────────────────────────────────────────────────────
export interface ProfessorProfile {
  id: number;
  laboratoire_id: number | null;
  date_prise_fonction: string | null;
  date_habilitation: string | null;
  specialite: string | null;
}

export interface EmployeeProfile {
  id: number;
  service_id: number | null;
  date_affectation: string | null;
  fonction_actuelle: string | null;
  situation_familiale: string | null;
  nombre_enfants: number;
  anciennete: string | null;
  solde_conge: number;
  conge_reporte: number;
}

export interface StaffProfile {
  id: number;
  user_id: number;
  staff_type: 'PROFESSEUR' | 'EMPLOYE';
  nom_fr: string;
  prenom_fr: string;
  nom_ar: string | null;
  prenom_ar: string | null;
  sexe: 'M' | 'F' | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  cin: string | null;
  doti: string | null;
  telephone: string | null;
  situation_administrative: string | null;
  date_recrutement: string | null;
  grade: Grade | null;
  organizational_unit: OrganizationalUnit | null;
  professor_profile: ProfessorProfile | null;
  employee_profile: EmployeeProfile | null;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  staff_profile: StaffProfile | null;
}

// ─── Document Types & Templates ──────────────────────────────────────────────
export interface DocumentType {
  id: number;
  code: string;
  nom_fr: string;
  nom_ar: string | null;
  allowed_role: AllowedRole;
  requires_language: boolean;
  is_active: boolean;
  form_schema: Record<string, unknown> | null;
}

export interface DocumentTemplate {
  id: number;
  document_type_id: number;
  language: string;
  role_target: 'PROFESSEUR' | 'EMPLOYE' | null;
  version: number;
  content: string;
  is_active: boolean;
  created_at: string;
  document_type?: DocumentType;
}

// ─── Requests ─────────────────────────────────────────────────────────────────
export interface RequestStatusHistory {
  id: number;
  old_status: RequestStatus | null;
  new_status: RequestStatus;
  comment: string | null;
  changed_by: number;
  created_at: string;
  changed_by_user?: Pick<User, 'id' | 'email'>;
}

export interface RequestFile {
  id: number;
  request_id: number;
  type: FileType;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface DocumentRequest {
  id: number;
  reference: string;
  requester_id: number;
  document_type_id: number;
  language: string | null;
  status: RequestStatus;
  payload: Record<string, unknown> | null;
  admin_comment: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  processing_started_at: string | null;
  validated_at: string | null;
  rejected_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  requester?: Pick<User, 'id' | 'email' | 'staff_profile'>;
  document_type?: DocumentType;
  status_histories?: RequestStatusHistory[];
  files?: RequestFile[];
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface UserDashboard {
  total_requests: number;
  by_status: Partial<Record<RequestStatus, number>>;
  documents_available: number;
  unread_notifications: number;
}

export interface AdminDashboard {
  users_by_role: Partial<Record<Role, number>>;
  active_users: number;
  requests_by_status: Partial<Record<RequestStatus, number>>;
  monthly_requests: { month: string; total: number }[];
  avg_processing_hours: number;
}
