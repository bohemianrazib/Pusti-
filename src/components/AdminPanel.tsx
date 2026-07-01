import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, BarChart3, Database, Compass, Award, Tag, RefreshCw, Layers } from 'lucide-react';
import { db } from '../db';

interface StatsData {
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

interface SessionFeed {
  id: string;
  userName: string;
  userDistrict: string;
  score: { total: number };
  temperature: number;
  brewingTime: number;
  personality: { titleEn: string };
  createdAt: string;
}

export const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [sessions, setSessions] = useState<SessionFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const resStats = await fetch('/api/admin/analytics');
      const dataStats = await resStats.json();
      
      const resSessions = await fetch('/api/admin/sessions');
      const dataSessions = await resSessions.json();

      if (dataStats.success) setStats(dataStats.stats);
      if (dataSessions.success) setSessions(dataSessions.sessions);
      
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load real-time analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
        <span className="ml-3 text-gold-400 font-mono">Loading telemetry dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-crimson-900/20 border border-crimson-800/20 rounded-xl max-w-xl mx-auto p-6">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={fetchAdminData} className="px-5 py-2.5 bg-gold-500 text-royal-bg rounded-lg font-bold">Retry</button>
      </div>
    );
  }

  const ingredientNamesBn: Record<string, string> = {
    pushtiTea: 'পুষ্টি চা',
    milkPowder: 'দুধ পাউডার',
    sugar: 'চিনি',
    lemon: 'লেবু',
    mint: 'পুদিনা পাতা',
    cardamom: 'এলাচ',
    cinnamon: 'দারুচিনি',
    ginger: 'আদা',
    honey: 'মধু',
    clove: 'লবঙ্গ'
  };

  return (
    <div id="admin-panel" className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-crimson-800/20 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gold-400 flex items-center gap-3">
            <Compass className="w-8 h-8 text-gold-500" />
            PUSHTI TEA - অ্যাডমিন ড্যাশবোর্ড
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time behavioral engagement and game telemetry analytics console.
          </p>
        </div>
        <button
          onClick={fetchAdminData}
          className="flex items-center gap-2 px-4 py-2 bg-crimson-900/40 border border-crimson-800/30 hover:border-gold-500/50 hover:text-gold-400 rounded-xl text-sm transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Data
        </button>
      </div>

      {/* Grid of Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#140f0c]/85 p-5 rounded-md border border-[#e5c9a7]/10 backdrop-blur-lg">
          <div className="flex justify-between items-center text-gray-500 mb-3">
            <span className="text-xs uppercase tracking-wider font-mono">Total Leads</span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-parchment font-mono">{stats?.totalUsers}</div>
          <p className="text-[10px] text-green-400 mt-1">● Active Users Authenticated</p>
        </div>

        <div className="bg-[#140f0c]/85 p-5 rounded-md border border-[#e5c9a7]/10 backdrop-blur-lg">
          <div className="flex justify-between items-center text-gray-500 mb-3">
            <span className="text-xs uppercase tracking-wider font-mono">Sessions Run</span>
            <Layers className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-parchment font-mono">{stats?.totalSessions}</div>
          <p className="text-[10px] text-gray-400 mt-1">Avg Score: <strong className="text-gold-400">{stats?.averageScore}/100</strong></p>
        </div>

        <div className="bg-[#140f0c]/85 p-5 rounded-md border border-[#e5c9a7]/10 backdrop-blur-lg">
          <div className="flex justify-between items-center text-gray-500 mb-3">
            <span className="text-xs uppercase tracking-wider font-mono">Replay Rate</span>
            <RefreshCw className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-parchment font-mono">{stats?.replayRate}%</div>
          <p className="text-[10px] text-purple-400 mt-1">Multi-session Retention</p>
        </div>

        <div className="bg-[#140f0c]/85 p-5 rounded-md border border-[#e5c9a7]/10 backdrop-blur-lg">
          <div className="flex justify-between items-center text-gray-500 mb-3">
            <span className="text-xs uppercase tracking-wider font-mono">Coupons Issued</span>
            <Tag className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-parchment font-mono">{stats?.couponRedeemedCount}</div>
          <p className="text-[10px] text-green-400 mt-1">Referrals: <strong className="text-gold-400">{stats?.referralCount}</strong></p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 mb-8">
        {/* Ingredient Popularity Index */}
        <div className="lg:col-span-7 bg-[#140f0c]/85 p-6 rounded-md border border-[#e5c9a7]/10 backdrop-blur-lg">
          <h3 className="text-lg font-display font-bold text-[#e5c9a7] mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#e5c9a7]" />
            উপকরণ ব্যবহারের জনপ্রিয়তার ইনডেক্স (Ingredient Stats)
          </h3>
          <div className="space-y-3">
            {stats && (Object.entries(stats.ingredientsUsed) as [string, number][]).map(([id, val]) => {
              // Calculate relative percentage
              const maxVal = Math.max(...(Object.values(stats.ingredientsUsed) as number[]), 1);
              const percentage = Math.round((val / maxVal) * 100);

              return (
                <div key={id} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-300 font-sans">{ingredientNamesBn[id] || id} ({id})</span>
                    <span className="text-gold-400">{val} spoonfuls</span>
                  </div>
                  <div className="w-full h-2 bg-[#150d08] rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold-600 to-[#e5c9a7] transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* District Metrics */}
        <div className="lg:col-span-5 bg-[#140f0c]/85 p-6 rounded-md border border-[#e5c9a7]/10 backdrop-blur-lg">
          <h3 className="text-lg font-display font-bold text-[#e5c9a7] mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-[#e5c9a7]" />
            আঞ্চলিক পারফরম্যান্স (District Scores)
          </h3>
          <div className="divide-y divide-[#3d2b1f]/30">
            {stats && Object.entries(stats.districtMetrics).length > 0 ? (
              (Object.entries(stats.districtMetrics) as [string, { count: number; avgScore: number }][])
                .sort((a, b) => b[1].avgScore - a[1].avgScore)
                .map(([district, data], idx) => (
                  <div key={district} className="py-2.5 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#150d08] flex items-center justify-center font-mono text-[10px] border border-[#3d2b1f]/20 text-gray-400">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-gray-200">{district}</span>
                    </div>
                    <div className="flex gap-4 font-mono text-right">
                      <span className="text-gray-400">({data.count} players)</span>
                      <span className="text-[#e5c9a7] font-bold">Avg {data.avgScore}/100</span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-xs text-gray-500 py-4 text-center">No district scores registered yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Brew Feed */}
      <div className="bg-[#140f0c]/85 p-6 rounded-md border border-[#e5c9a7]/10 backdrop-blur-lg">
        <h3 className="text-lg font-display font-bold text-[#e5c9a7] mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-gold-500" />
          রিয়েল-টাইম চা তৈরির সেশন লিজেন্ডস (Recent Play Logs)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#3d2b1f]/50 text-gray-400 uppercase tracking-wider font-mono text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Heat / Time</th>
                <th className="py-3 px-4">Awarded Profile</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d2b1f]/30 font-mono">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-crimson-900/10">
                    <td className="py-3 px-4 font-sans text-parchment font-medium">{session.userName}</td>
                    <td className="py-3 px-4 text-gray-400">{session.userDistrict}</td>
                    <td className="py-3 px-4 text-gold-400 font-bold">{session.score.total}/100</td>
                    <td className="py-3 px-4 text-gray-300">
                      {session.temperature}°C / {Math.floor(session.brewingTime / 60)}:{(session.brewingTime % 60).toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4 font-sans text-green-400">{session.personality?.titleEn}</td>
                    <td className="py-3 px-4 text-gray-500 text-[10px]">
                      {new Date(session.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                    No active sessions completed yet. Take a brew test to see telemetry logs!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default AdminPanel;
