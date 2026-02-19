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
  
  // 表示対象の年月を管理 (初期値は今月)
  const [targetDate, setTargetDate] = useState(new Date());

  // モーダル・入力用
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkSession();
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

  // 月を切り替える関数
  const changeMonth = (diff: number) => {
    const newDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + diff, 1);
    setTargetDate(newDate);
  };

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
      fetchData(session.user.id);
    }
    setIsSaving(false);
  };

  if (isLoading && !session) return <div className="p-8 text-center">読み込み中...</div>;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg">Googleでログイン</button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen bg-gray-50 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">JCB 家計簿</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-xs text-gray-400">ログアウト</button>
      </div>

      {/* 📅 月選択セレクター */}
      <div className="flex items-center justify-between bg-white rounded-xl p-2 mb-4 shadow-sm">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">◀</button>
        <span className="font-bold text-lg text-gray-700">
          {targetDate.getFullYear()}年 {targetDate.getMonth() + 1}月
        </span>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">▶</button>
      </div>
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-6 mb-8 shadow-md">
        <h2 className="text-sm opacity-80 mb-2">利用合計</h2>
        <div className="text-4xl font-bold">¥{totalAmount.toLocaleString()}</div>
      </div>

      <h2 className="text-lg font-bold mb-4 text-gray-800">明細</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {transactions.length === 0 ? (
          <p className="p-8 text-gray-400 text-center text-sm">データがありません</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <li key={tx.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-400 mb-1">{tx.date}</div>
                  <div className="font-medium text-gray-900 text-sm">{tx.description}</div>
                </div>
                <div className="font-bold text-gray-900">¥{tx.amount.toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg text-3xl flex items-center justify-center">＋</button>

      {/* 手動入力モーダル (以前と同じ) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">手動で記録</h2>
            <div className="space-y-4">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full border rounded-lg p-2" />
              <input type="text" placeholder="内容" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="w-full border rounded-lg p-2" />
              <input type="number" placeholder="金額" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full border rounded-lg p-2 text-right" />
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-500">閉じる</button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}