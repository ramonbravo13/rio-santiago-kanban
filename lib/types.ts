
// Definir los tipos de enums manualmente para evitar problemas de importación
export enum UserRole {
  ADMIN = 'ADMIN',
  COLABORADOR = 'COLABORADOR'
}

export enum ProgramStatus {
  ACTIVO = 'ACTIVO',
  CERRADO = 'CERRADO',
  CANCELADO = 'CANCELADO'
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export enum TranscriptionStatus {
  PENDING = 'PENDING',
  TRANSCRIBING = 'TRANSCRIBING',
  SUMMARIZING = 'SUMMARIZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface User {
  id: string;
  name?: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Program {
  id: string;
  name: string;
  description?: string | null;
  generalObjective: string;
  startDate: Date;
  endDate: Date;
  status: ProgramStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskLink {
  url: string;
  title?: string;
}

export interface Task {
  id: string;
  name: string;
  description?: string | null;
  creatorId: string;
  programId: string;
  dueDate?: Date | null;
  status: TaskStatus;
  expectedDeliverables?: string | null;
  progressPercentage: number;
  links?: TaskLink[] | null;
  createdAt: Date;
  updatedAt: Date;
  assignees?: TaskAssignee[];
  creator?: User;
  program?: Program;
  comments?: Comment[];
  files?: File[];
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  createdAt: Date;
  task?: Task;
  user?: User;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author?: User;
}

export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  taskId: string;
  uploadedById: string;
  createdAt: Date;
  uploadedBy?: User;
}

export interface KPIData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  deliverablesUploaded: number;
  averageCompletionTime: number;
  tasksInDelay: number;
  participationLevel: number;
}

export interface ProgramKPI extends KPIData {
  programId: string;
  programName: string;
}

export interface UserKPI extends KPIData {
  userId: string;
  userName: string;
}

export interface Transcription {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  audioUrl: string;
  originalText?: string | null;
  summary?: string | null;
  status: TranscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}


