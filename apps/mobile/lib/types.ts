import type { LoadingType, SetStatus } from "@gymeasure/shared";

export type CatalogExercise = {
  id: string;
  name: string;
  description: string | null;
  bodyPart: string | null;
  equipment: string | null;
  muscles: string | null;
  loadingType: LoadingType;
  imageUrl: string | null;
  attribution: string | null;
  licenseName: string | null;
  licenseAuthor: string | null;
};

export type PlannedSet = {
  id?: string;
  sortOrder: number;
  reps: number;
  weightKg: number;
};

export type DayExercise = {
  id?: string;
  exerciseId: string;
  sortOrder: number;
  name: string;
  imageUrl: string | null;
  loadingType: LoadingType;
  bodyPart?: string | null;
  equipment?: string | null;
  attribution?: string | null;
  plannedSets: PlannedSet[];
};

export type TrainingDay = {
  id: string;
  name: string;
  exercises: DayExercise[];
};

export type SessionSet = {
  id?: string;
  sortOrder: number;
  status: SetStatus;
  plannedReps: number | null;
  plannedWeightKg: number | null;
  reps: number | null;
  weightKg: number | null;
  isExtra: boolean;
};

export type SessionExercise = {
  id?: string;
  exerciseId: string;
  name: string;
  imageUrl: string | null;
  loadingType: LoadingType;
  sortOrder: number;
  sets: SessionSet[];
  volume?: number;
};

export type GymSession = {
  id: string;
  status: "active" | "completed";
  trainingDayId: string | null;
  performedAt: string;
  bodyweightKg: number | null;
  notes: string | null;
  exercises: SessionExercise[];
  totalVolume?: number;
};
