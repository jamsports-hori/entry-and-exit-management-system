"use client";

import { useState, useEffect } from "react";
import { QRScanner } from "../components/Scanner";
import { fetchUserData, recordUserAction, UserData, fetchDailyReport } from "../utils/api";
import { Mountain, CheckCircle2, TreePine, History, User, Shield, Tent, Loader2, ClipboardList } from "lucide-react";
import { ReportItem } from "../types/report";

export default function Home() {
  const [viewMode, setViewMode] = useState<'home' | 'scan' | 'result'>('home');
  const [lastScanned, setLastScanned] = useState<{ email: string; action: 'entry' | 'exit'; time: string; userData?: UserData } | null>(null);
  const [message, setMessage] = useState<string>("QRコードをかざしてください");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [todaysLog, setTodaysLog] = useState<ReportItem[]>([]);

  // Fetch today's log on mount
  useEffect(() => {
    loadTodaysLog();
  }, []);

  // Return to home after showing result
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (viewMode === 'result') {
      timer = setTimeout(() => {
        setViewMode('home');
        setLastScanned(null);
        setMessage("QRコードをかざしてください");
      }, 5000); // 5 seconds display
    }
    return () => clearTimeout(timer);
  }, [viewMode]);

  const loadTodaysLog = async () => {
    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const res = await fetchDailyReport(today);
    if (res.success && res.data) {
      setTodaysLog(res.data.reverse());
    }
  };

  const handleScan = async (qrData: string) => {
    if (!qrData.includes("@")) {
      setIsError(true);
      setMessage("無効なQRコードです");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);
    setMessage("照会中...");
    setIsError(false);

    try {
      const query = await fetchUserData(qrData);

      if (!query.success || !query.data) {
        throw new Error(query.message || "User not found");
      }

      const user = query.data;
      const entryTime = user.lastEntry ? new Date(user.lastEntry).getTime() : 0;
      const exitTime = user.lastExit ? new Date(user.lastExit).getTime() : 0;
      const newAction = entryTime > exitTime ? 'exit' : 'entry';

      setMessage(newAction === 'entry' ? "入山処理中..." : "下山処理中...");
      const recordResult = await recordUserAction(qrData, newAction);

      if (!recordResult.success) {
        throw new Error(recordResult.message);
      }

      setLastScanned({
        email: qrData,
        action: newAction,
        time: new Date().toLocaleString('ja-JP'),
        userData: user
      });

      if (newAction === 'entry') {
        setMessage("入山を受け付けました。");
      } else {
        setMessage("下山を確認しました。お疲れ様でした！");
      }

      loadTodaysLog();
      setViewMode('result');

    } catch (e: any) {
      console.error(e);
      setIsError(true);
      setMessage(e.message || "スプレッドシートへの接続に失敗しました");
      // Keep in scan mode on error so they can try again, but show error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-start p-4 relative overflow-y-auto text-white pb-20 font-sans">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-black -z-10" />
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="z-10 mb-8 text-center mt-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Mountain className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
          <h1 className="text-4xl font-bold tracking-wider text-white drop-shadow-lg">Mount Pass</h1>
        </div>
        <p className="text-white/60 text-sm tracking-[0.2em] uppercase font-light border-t border-white/10 pt-2 inline-block px-4">
          入下山チェック
        </p>
      </header>

      {/* HOME MODE */}
      {viewMode === 'home' && (
        <div className="w-full max-w-md flex flex-col gap-8 animate-in zoom-in-95 fade-in duration-500">

          {/* Big Action Button */}
          <button
            onClick={() => setViewMode('scan')}
            className="group relative w-full aspect-video bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center border border-white/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>

            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm mb-2 group-hover:scale-110 transition-transform duration-300">
                <Tent size={48} className="text-white" />
              </div>
              <span className="text-3xl font-bold tracking-widest text-white drop-shadow-md">ENTRY <span className="text-emerald-200 text-xl align-middle mx-1">or</span> EXIT</span>
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-100/80">Tap to Scan QR Details</span>
            </div>
          </button>

          {/* Today's Log Summary */}
          <div className="glass-panel rounded-2xl p-5 border border-white/5 bg-black/20 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="text-emerald-400" size={20} />
                <h3 className="font-bold text-lg text-white/90">本日の記録</h3>
              </div>
              <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-mono text-emerald-300 border border-white/10">
                Total: {todaysLog.length}
              </span>
            </div>

            <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="space-y-2">
                {todaysLog.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-sm">
                    本日の記録はまだありません
                  </div>
                ) : (
                  todaysLog.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white/80">
                          {log.name.slice(0, 1)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white/90">{log.name}</span>
                          <span className="text-[10px] text-white/40 truncate max-w-[200px]">
                            {[log.memberType, log.equipment, log.color].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-xs font-mono">
                        {log.exitTime ? (
                          <span className="text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">OUT {formatTime(log.exitTime)}</span>
                        ) : (
                          <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">IN {formatTime(log.entryTime)}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCAN MODE */}
      {viewMode === 'scan' && (
        <div className="w-full max-w-md flex flex-col gap-6 animate-in zoom-in-95 fade-in duration-300">
          <div className="glass-panel rounded-3xl p-6 relative">
            {isLoading ? (
              <div className="w-full aspect-square flex flex-col items-center justify-center bg-black/20 rounded-2xl border border-white/10 animate-pulse">
                <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mb-4" />
                <p className="text-sm font-light tracking-widest">{message}</p>
              </div>
            ) : (
              <QRScanner onScan={handleScan} />
            )}

            <div className={`mt-6 text-center transition-all duration-300 min-h-[24px] ${isError ? 'text-red-400' : 'text-white/70'}`}>
              <p className="text-sm tracking-wider">{message}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setViewMode('home');
              setIsError(false);
              setMessage("QRコードをかざしてください");
            }}
            className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm tracking-widest uppercase font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* RESULT MODE */}
      {viewMode === 'result' && lastScanned && (
        <div className="w-full max-w-md animate-in zoom-in-95 fade-in duration-500">
          <div className="glass-panel rounded-3xl p-8 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]">

            {/* Result Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${lastScanned.action === 'entry' ? 'bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)]'}`}>
                {lastScanned.action === 'entry' ? <TreePine size={40} /> : <CheckCircle2 size={40} />}
              </div>
              <h2 className="text-3xl font-bold mb-1">
                {lastScanned.action === 'entry' ? 'Welcome Back!' : 'See You Again!'}
              </h2>
              <p className={`text-lg font-medium tracking-wider uppercase ${lastScanned.action === 'entry' ? 'text-emerald-400' : 'text-blue-400'}`}>
                {lastScanned.action === 'entry' ? '入山 (ENTRY)' : '下山 (EXIT)'}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-4 bg-black/20 p-6 rounded-2xl border border-white/5">
              {lastScanned.userData && (
                <>
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs text-white/40 uppercase tracking-widest">Name</span>
                    <span className="text-xl font-bold">{lastScanned.userData.name}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs text-white/40 uppercase tracking-widest">Type</span>
                    <span className="text-sm font-medium opacity-80">{lastScanned.userData.memberType}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs text-white/40 uppercase tracking-widest">Expiry</span>
                    <span className={`text-sm font-bold font-mono ${lastScanned.action === 'entry' && lastScanned.userData.insuranceExpiry && new Date(lastScanned.userData.insuranceExpiry).getTime() < new Date().setHours(0, 0, 0, 0)
                      ? 'text-red-400'
                      : 'text-emerald-400'
                      }`}>
                      {lastScanned.userData.insuranceExpiry || "---"}
                    </span>
                  </div>

                  <div className="pt-1">
                    <span className="text-xs text-white/40 uppercase tracking-widest block mb-2">Equipment</span>
                    <div className="flex items-center gap-2 text-sm bg-white/5 p-2 rounded-lg">
                      <Tent size={14} className="text-white/50" />
                      <span className="truncate">{lastScanned.userData.equipment || "---"}</span>
                      {lastScanned.userData.color && <span className="opacity-50 border-l border-white/20 pl-2">{lastScanned.userData.color}</span>}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Auto Redirect Progress */}
            <div className="mt-8 flex items-center justify-center gap-2 opacity-50">
              <Loader2 className="animate-spin" size={14} />
              <span className="text-xs">Returning to home...</span>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto pt-8 text-[10px] text-white/20 font-mono text-center w-full">
        MOUNT PASS SERVER SYSTEM &bull; VER 2.2.0
      </footer>
    </main>
  );
}

// Helper for time formatting
function formatTime(val: any) {
  if (!val) return "-";
  // If it's a full date string, extract time
  if (typeof val === 'string' && val.includes('T')) {
    return new Date(val).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
  return val.toString().slice(0, 5); // Simple slice for HH:mm:ss -> HH:mm if format matches
}
