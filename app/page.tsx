"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // 表示対象の年月を管理 (初期値は今日)
  const [targetDate, setTargetDate] = useState(new Date());

  // 手動入力モーダル・入力用
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkSession();
    // ログイン状態の監視
    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // セッションまたは対象月が変わるたびにデータを再取得
  useEffect(() => {
    if (session) {
      fetchData(session.user.id);
    }
  }, [session, targetDate]);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    if (!session) setIsLoading(false);
  };

  const fetchData = async (userId: string) => {
    setIsLoading(true);
    
    // 表示中の年月の初日と末日を計算
    const y = targetDate.getFullYear();
    const m = targetDate.getMonth();
    const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", firstDay)
      .lte("date", lastDay)
      .order("date", { ascending: false });

    if (data) {
      setTransactions(data);
      setTotalAmount(data.reduce((sum, item) => sum + item.amount, 0));
    }
    setIsLoading(false);
  };

  // 月を切り替える
  const changeMonth = (diff: number) => {
    const newDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + diff, 1);
    setTargetDate(newDate);
  };

  // 手動保存の処理（AIカテゴリ判定付き）
  const handleSave = async () => {
    if (!newDescription || !newAmount || !session) return;
    setIsSaving(true);

    try {
      // 1. ChatGPT APIを叩いてカテゴリを推測
      const res = await fetch("/api/guess-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDescription }),
      });
      const { category } = await res.json();

      // 2. Supabaseに保存
      const { error } = await supabase.from("transactions").insert([
        {
          user_id: session.user.id,
          date: newDate,
          description: newDescription,
          amount: parseInt(newAmount, 10),
          category: category // AIが判定したカテゴリ
        }
      ]);

      if (!error) {
        setNewDescription("");
        setNewAmount("");
        setIsModalOpen(false);
        fetchData(session.user.id); // 一覧を更新
      }
    } catch (err) {
      console.error("保存失敗:", err);
    }
    setIsSaving(false);
  };

  if (isLoading && !session) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  // ログイン前の画面
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">JCB 自動家計簿</h1>
          <button 
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  // メイン画面
  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen bg-gray-50 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">JCB 家計簿</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-xs text-gray-400 hover:text-gray-600">ログアウト</button>
      </div>

      {/* 📅 月選択セレクター */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-2 mb-4 shadow-sm border border-gray-100">
        <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-gray-50 rounded-xl text-gray-400">◀</button>
        <span className="font-bold text-lg text-gray-700">
          {targetDate.getFullYear()}年 {targetDate.getMonth() + 1}月
        </span>
        <button onClick={() => changeMonth(1)} className="p-3 hover:bg-gray-50 rounded-xl text-gray-400">▶</button>
      </div>
      
      {/* 合計金額カード */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-3xl p-8 mb-8 shadow-xl shadow-blue-200">
        <h2 className="text-sm opacity-80 mb-2 font-medium">この月の利用合計</h2>
        <div className="text-4xl font-black">¥{totalAmount.toLocaleString()}</div>
      </div>

      <h2 className="text-lg font-bold mb-4 text-gray-800 ml-1">明細一覧</h2>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {transactions.length === 0 ? (
          <p className="p-12 text-gray-400 text-center text-sm">今月のデータはありません</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <li key={tx.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div className="flex-1 pr-4">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-bold">{tx.date}</div>
                  <div className="font-semibold text-gray-800 text-sm mb-1">{tx.description}</div>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                    {tx.category || "未分類"}
                  </span>
                </div>
                <div className="font-black text-gray-900 text-right">¥{tx.amount.toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 浮遊追加ボタン */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-300 text-4xl flex items-center justify-center hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all z-40"
      >
        ＋
      </button>

      {/* 手動入力モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom duration-300">
            <h2 className="text-2xl font-black mb-6 text-gray-800">手動で記録</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">日付</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full border-gray-200 border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">内容</label>
                <input type="text" placeholder="例: カフェ" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="w-full border-gray-200 border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">金額</label>
                <input type="number" inputMode="numeric" placeholder="0" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full border-gray-200 border rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-right text-xl font-bold" />
              </div>
            </div>
            <div className="mt-10 flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600">キャンセル</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 disabled:bg-blue-300 transition-all"
              >
                {isSaving ? "AIが分類中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}