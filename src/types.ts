/**
 * Types for the Pushti Tea Interactive Experience
 */

export enum GameStage {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  TUTORIAL = 'TUTORIAL',
  KITCHEN = 'KITCHEN',
  BREWING = 'BREWING',
  ANALYSIS = 'ANALYSIS',
  LEADERBOARD = 'LEADERBOARD',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  phone: string;
  district: string;
  xp: number;
  level: number;
  referralCode: string;
  referredBy?: string;
  badge?: string;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  nameBn: string;
  nameEn: string;
  unitBn: string;
  unitEn: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  color: string; // Used for fluid color changes
  bubbleRate: number; // Modifies boiling bubble size or density
  aromaWeight: number; // Influences tea aroma calculation
  tasteProfile: string; // Description like 'Spicy', 'Sweet', etc.
}

export interface RecipeState {
  pushtiTea: number; // spoons
  milkPowder: number; // spoons
  sugar: number; // spoons
  lemon: number; // slices
  mint: number; // leaves
  cardamom: number; // pieces
  cinnamon: number; // pieces
  ginger: number; // pieces
  honey: number; // spoons
  clove: number; // pieces
}

export interface ScoreBreakdown {
  taste: number; // 0-100
  aroma: number; // 0-100
  color: number; // 0-100
  balance: number; // 0-100
  total: number; // 0-100
}

export interface TeaPersonality {
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  badge: string;
  tagline: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  userName: string;
  userDistrict: string;
  recipe: RecipeState;
  temperature: number;
  brewingTime: number; // seconds
  score: ScoreBreakdown;
  personality: TeaPersonality;
  couponCode: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  district: string;
  score: number;
  level: number;
  badge: string;
  rank?: number;
}

export interface AdminStats {
  totalUsers: number;
  totalSessions: number;
  averageScore: number;
  otpSuccessRate: number;
  sessionsCompleted: number;
  replayRate: number;
  ingredientsUsed: Record<string, number>;
  districtMetrics: Record<string, { count: number; avgScore: number }>;
  referralCount: number;
  couponRedeemedCount: number;
}
