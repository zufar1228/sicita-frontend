// types/user.ts
export interface AppUser {
  id: number; // Sesuai dengan SERIAL di database
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export type UserRole = "admin" | "user";
