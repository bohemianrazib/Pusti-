import fs from 'fs';
import path from 'path';
import { User, SessionRecord, LeaderboardEntry, ScoreBreakdown, RecipeState, TeaPersonality } from './types';

const DB_PATH = path.join(process.cwd(), 'database.json');

interface DatabaseSchema {
  users: Record<string, User>;
  sessions: SessionRecord[];
  coupons: { code: string; userId: string; score: number; createdAt: string }[];
  referrals: { referrerId: string; referredId: string; bonusXp: number; createdAt: string }[];
}

class FileDatabase {
  private db: DatabaseSchema = {
    users: {},
    sessions: [],
    coupons: [],
    referrals: []
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        this.db = JSON.parse(data);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database. Initializing empty.', err);
      this.db = { users: {}, sessions: [], coupons: [], referrals: [] };
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database.', err);
    }
  }

  // --- Users CRUD ---
  public getOrCreateUser(name: string, phone: string, district: string, referralCodeUsed?: string): User {
    // Search by phone
    let user = Object.values(this.db.users).find(u => u.phone === phone);
    if (user) {
      // Update district/name if they change
      user.name = name;
      user.district = district;
      this.save();
      return user;
    }

    // Create new
    const referralCode = 'PUSHTI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = 'user-' + Math.random().toString(36).substring(2, 11);
    
    user = {
      id,
      name,
      phone,
      district,
      xp: 100, // starting XP
      level: 1,
      referralCode,
      createdAt: new Date().toISOString()
    };

    this.db.users[id] = user;

    // Handle referral
    if (referralCodeUsed) {
      const referrer = Object.values(this.db.users).find(u => u.referralCode === referralCodeUsed);
      if (referrer && referrer.id !== id) {
        user.referredBy = referrer.id;
        referrer.xp += 150; // Referral award
        if (referrer.xp >= referrer.level * 500) {
          referrer.level += 1;
        }
        
        this.db.referrals.push({
          referrerId: referrer.id,
          referredId: id,
          bonusXp: 150,
          createdAt: new Date().toISOString()
        });
      }
    }

    this.save();
    return user;
  }

  public getUser(id: string): User | null {
    return this.db.users[id] || null;
  }

  public addXp(userId: string, xpAmount: number): User | null {
    const user = this.db.users[userId];
    if (!user) return null;

    user.xp += xpAmount;
    // Simple level up: each level needs level * 400 XP
    const nextLevelThreshold = user.level * 400;
    if (user.xp >= nextLevelThreshold) {
      user.level += 1;
      user.badge = this.getBadgeForLevel(user.level);
    }

    this.save();
    return user;
  }

  private getBadgeForLevel(level: number): string {
    if (level >= 8) return 'Grand Tea Emperor';
    if (level >= 5) return 'Golden Brewer Master';
    if (level >= 3) return 'Expert Tea Chef';
    return 'Amateur Brewer';
  }

  // --- Sessions and Recipes ---
  public addSession(
    userId: string,
    recipe: RecipeState,
    temperature: number,
    brewingTime: number,
    score: ScoreBreakdown,
    personality: TeaPersonality,
    discount?: number
  ): SessionRecord {
    const user = this.db.users[userId];
    const userName = user ? user.name : 'Guest';
    const userDistrict = user ? user.district : 'Dhaka';

    const id = 'session-' + Math.random().toString(36).substring(2, 11);
    const sanitizedName = userName.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PERFECT';
    const finalDiscount = discount || 5;
    const couponCode = `PUSHTI-${sanitizedName}-${finalDiscount}PERCENT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const record: SessionRecord = {
      id,
      userId,
      userName,
      userDistrict,
      recipe,
      temperature,
      brewingTime,
      score,
      personality,
      couponCode,
      discount: finalDiscount,
      createdAt: new Date().toISOString()
    };

    this.db.sessions.push(record);

    // Save coupon
    this.db.coupons.push({
      code: couponCode,
      userId,
      score: score.total,
      createdAt: new Date().toISOString()
    });

    // Award XP based on tea score!
    this.addXp(userId, score.total * 3);

    this.save();
    return record;
  }

  public getSessions(): SessionRecord[] {
    return this.db.sessions;
  }

  // --- Leaderboard Calculations ---
  public getLeaderboard(limit = 100): LeaderboardEntry[] {
    // Aggregate high scores per user
    const userScores: Record<string, number> = {};
    this.db.sessions.forEach(s => {
      if (!userScores[s.userId] || userScores[s.userId] < s.score.total) {
        userScores[s.userId] = s.score.total;
      }
    });

    const entries: LeaderboardEntry[] = Object.values(this.db.users).map(user => {
      const bestScore = userScores[user.id] || 0;
      return {
        userId: user.id,
        userName: user.name,
        district: user.district,
        score: bestScore,
        level: user.level,
        badge: user.badge || this.getBadgeForLevel(user.level)
      };
    });

    // Sort by score descending, then level descending, then name
    entries.sort((a, b) => b.score - a.score || b.level - a.level);

    return entries.slice(0, limit).map((entry, idx) => ({
      ...entry,
      rank: idx + 1
    }));
  }

  // --- Stats and Admin Dashboard queries ---
  public getAdminStats() {
    const totalUsers = Object.keys(this.db.users).length;
    const totalSessions = this.db.sessions.length;

    let totalScoreSum = 0;
    this.db.sessions.forEach(s => totalScoreSum += s.score.total);
    const averageScore = totalSessions > 0 ? Math.round(totalScoreSum / totalSessions) : 0;

    // Compile ingredient statistics
    const ingredientsUsed: Record<string, number> = {
      pushtiTea: 0, milkPowder: 0, sugar: 0, lemon: 0, mint: 0,
      cardamom: 0, cinnamon: 0, ginger: 0, honey: 0, clove: 0
    };

    this.db.sessions.forEach(s => {
      Object.entries(s.recipe).forEach(([key, val]) => {
        if (key in ingredientsUsed) {
          ingredientsUsed[key] += val;
        }
      });
    });

    // District metrics
    const districtMetrics: Record<string, { count: number; totalScore: number; avgScore: number }> = {};
    this.db.sessions.forEach(s => {
      const d = s.userDistrict || 'Dhaka';
      if (!districtMetrics[d]) {
        districtMetrics[d] = { count: 0, totalScore: 0, avgScore: 0 };
      }
      districtMetrics[d].count += 1;
      districtMetrics[d].totalScore += s.score.total;
    });

    const finalDistrictMetrics: Record<string, { count: number; avgScore: number }> = {};
    Object.entries(districtMetrics).forEach(([district, m]) => {
      finalDistrictMetrics[district] = {
        count: m.count,
        avgScore: Math.round(m.totalScore / m.count)
      };
    });

    // Replay rate: active users with > 1 session
    const userSessionCounts: Record<string, number> = {};
    this.db.sessions.forEach(s => {
      userSessionCounts[s.userId] = (userSessionCounts[s.userId] || 0) + 1;
    });
    const usersWithMultiSessions = Object.values(userSessionCounts).filter(c => c > 1).length;
    const replayRate = totalUsers > 0 ? Math.round((usersWithMultiSessions / totalUsers) * 100) : 0;

    return {
      totalUsers,
      totalSessions,
      averageScore,
      otpSuccessRate: 98, // Simulated firebase rate
      sessionsCompleted: totalSessions,
      replayRate,
      ingredientsUsed,
      districtMetrics: finalDistrictMetrics,
      referralCount: this.db.referrals.length,
      couponRedeemedCount: this.db.coupons.length
    };
  }
}

export const db = new FileDatabase();
export default db;
