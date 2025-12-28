"use client";

import { useState } from "react";
import { QRScanner } from "../components/Scanner";
import { fetchUserData, recordUserAction, UserData } from "../utils/api";
import { Mountain, CheckCircle2, TreePine, History, AlertCircle, Loader2, User, Shield, Tent } from "lucide-react";

export default function Home() {
  const [lastScanned, setLastScanned] = useState<{ email: string; action: 'entry' | 'exit'; time: string; userData?: UserData } | null>(null);
  const [message, setMessage] = useState<string>("QRコードをかざしてください");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleScan = async (qrData: string) => {
    // Basic validation
    if (!qrData.includes("@")) {
      setIsError(true);
      setMessage("無効なQRコードです");
      return;
    }

    if (isLoading) return; // Prevent double submit
    setIsLoading(true);
    setMessage("照会中...");
    setIsError(false);

    try {
      // 1. Fetch User Data to decide action and show info
      const query = await fetchUserData(qrData);

      if (!query.success || !query.data) {
        throw new Error(query.message || "User not found");
      }

      const user = query.data;

      // Determine Action: If lastEntry is later than lastExit, they are on the mountain -> Exit.
      // Otherwise -> Entry.

      const entryTime = user.lastEntry ? new Date(user.lastEntry).getTime() : 0;
      const exitTime = user.lastExit ? new Date(user.lastExit).getTime() : 0;

      const newAction = entryTime > exitTime ? 'exit' : 'entry';

      // 2. Record the action
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

    } catch (e: any) {
      console.error(e);
      setIsError(true);
      setMessage(e.message || "スプレッドシートへの接続に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden text-white">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="z-10 mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Mountain className="w-10 h-10 text-emerald-400" />
          <h1 className="text-3xl font-bold tracking-wider text-glow">Mount Pass</h1>
        </div>
        <p className="text-white/70 text-sm tracking-widest">クラウド管理システム</p>
      </header>

      {/* Main Card */}
      <div className="z-10 w-full max-w-md glass-panel rounded-3xl p-6 flex flex-col gap-6">

        {/* Scanner Area */}
        {isLoading ? (
          <div className="w-full aspect-square flex flex-col items-center justify-center bg-black/20 rounded-2xl border border-white/10 animate-pulse">
            <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mb-4" />
            <p className="text-sm font-light">データベース通信中...</p>
          </div>
        ) : (
          <QRScanner onScan={handleScan} />
        )}

        {/* Status Message Area */}
        <div className={`text-center transition-all duration-300 min-h-[30px] ${isError ? 'text-red-400' : 'text-white'}`}>
          <p className="text-lg font-medium">{message}</p>
        </div>
      </div>

      {/* Result Card (Rich Data) */}
      {lastScanned && !isLoading && (
        <div className="z-10 w-full max-w-md mt-6 glass-panel rounded-xl p-6 animate-in slide-in-from-bottom-4 fade-in duration-500">

          {/* Header Status */}
          <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
            <div className={`p-3 rounded-full ${lastScanned.action === 'entry' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {lastScanned.action === 'entry' ? <TreePine size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {lastScanned.action === 'entry' ? '入山 (ENTRY)' : '下山 (EXIT)'}
              </h2>
              <div className="flex items-center gap-2 text-xs opacity-50">
                <History size={12} />
                <span>{lastScanned.time}</span>
              </div>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="space-y-4">
            {lastScanned.userData && (
              <>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg"><User size={18} className="text-orange-300" /></div>
                  <div>
                    <p className="text-xs opacity-50">氏名 / 会員種別</p>
                    <p className="font-semibold text-lg">{lastScanned.userData.name} <span className="text-sm font-normal opacity-70">({lastScanned.userData.memberType})</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg"><Shield size={18} className="text-blue-300" /></div>
                  <div>
                    <p className="text-xs opacity-50">保険有効期限</p>
                    <p className="font-medium">{lastScanned.userData.insuranceExpiry}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg"><Tent size={18} className="text-green-300" /></div>
                  <div>
                    <p className="text-xs opacity-50">機材情報</p>
                    <p className="font-medium">{lastScanned.userData.equipment}</p>
                  </div>
                </div>
              </>
            )}

            <div className="pt-2 text-center">
              <p className="text-xs text-white/30 truncate">{lastScanned.email}</p>
            </div>
          </div>

        </div>
      )}

      {/* Footer */}
      <footer className="absolute bottom-4 text-xs text-white/30">
        Cloud Sync Active &bull; Ver 2.0.0
      </footer>
    </main>
  );
}
