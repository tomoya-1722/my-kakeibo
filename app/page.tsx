"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // 手動入力用の状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) fetchData(newSession.user.id);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    if (session) fetchData(session.user.id);
    else setIsLoading(false);
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTransactions([]);
  };

  const fetchData = async (userId: string) => {
    setIsLoading(true);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDayNum = new Date(y, now.getMonth() + 1, 0).getDate();
    const firstDay = `${y}-${m}-01`;
    const lastDay = `${y}-${m}-${String(lastDayNum).padStart(2, '0')}`;

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

  // 手動保存の処理
  const handleSave = async () => {
    if (!newDescription || !newAmount || !session) return;
    setIsSaving(true);

    const { error } = await supabase.from("transactions").insert([
      {
        user_id: session.user.id,
        date: newDate,
        description: newDescription,
        amount: parseInt(newAmount, 10),
        category: "手動入力"
      }
    ]);

    if (!error) {
      setNewDescription("");
      setNewAmount("");
      setIsModalOpen(false);
      fetchData(session.user.id); // 一覧を再読み込み
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">JCB 自動家計簿</h1>
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">Googleでログイン</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen bg-gray-50 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">JCB 家計簿</h1>
        <button onClick={handleLogout} className="text-sm text-gray-400">ログアウト</button>
      </div>
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-6 mb-8 shadow-md">
        <h2 className="text-sm opacity-80 mb-2">今月の利用合計</h2>
        <div className="text-4xl font-bold">¥{totalAmount.toLocaleString()}</div>
      </div>

      <h2 className="text-xl font-bold mb-4 text-gray-800">明細一覧</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {transactions.length === 0 ? (
          <p className="p-8 text-gray-400 text-center text-sm">データがありません</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <li key={tx.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-400 mb-1">{tx.date}</div>
                  <div className="font-medium text-gray-900">{tx.description}</div>
                </div>
                <div className="font-bold text-gray-900">¥{tx.amount.toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 🚀 右下の浮いている追加ボタン */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg text-3xl flex items-center justify-center hover:bg-blue-700 transition-transform active:scale-90"
      >
        ＋
      </button>

      {/* 📝 手動入力モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">手動で記録</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">日付</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full border rounded-lg p-2 text-lg" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">内容</label>
                <input type="text" placeholder="例: ランチ" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="w-full border rounded-lg p-2 text-lg" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">金額</label>
                <input type="number" inputMode="numeric" placeholder="金額を入力" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full border rounded-lg p-2 text-lg text-right" />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold">キャンセル</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-blue-200 shadow-lg disabled:bg-blue-300"
              >
                {isSaving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}