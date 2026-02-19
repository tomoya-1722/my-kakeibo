"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabaseの準備（環境変数から読み込み）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // 1. ログインしているユーザーを確認
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    // 2. 「今月」の初日と末日を計算する
    const now = new Date();
    // 日本時間（JST）を考慮したシンプルな日付取得
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('sv-SE');
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('sv-SE');

    // 3. Supabaseから「自分のデータ」かつ「今月のデータ」を取得して日付の新しい順に並べる
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", firstDay)
      .lte("date", lastDay)
      .order("date", { ascending: false });

    if (error) {
      console.error("エラーが発生しました:", error);
    } else if (data) {
      setTransactions(data);
      
      // 4. 今月の合計金額を計算する
      const total = data.reduce((sum, item) => sum + item.amount, 0);
      setTotalAmount(total);
    }
    
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">データを読み込み中...</div>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">JCB 家計簿</h1>
      
      {/* 今月の合計金額カード */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-6 mb-8 shadow-lg">
        <h2 className="text-sm font-medium opacity-80 mb-2">今月の利用合計</h2>
        <div className="text-4xl font-bold tracking-wider">
          ¥{totalAmount.toLocaleString()}
        </div>
      </div>

      {/* 明細一覧 */}
      <h2 className="text-xl font-bold mb-4 text-gray-800">明細一覧</h2>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        {transactions.length === 0 ? (
          <p className="p-8 text-gray-400 text-center">今月のデータはまだありません。</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <li key={tx.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500 mb-1">{tx.date}</div>
                  <div className="font-medium text-gray-900">{tx.description}</div>
                  <div className="text-xs inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-md mt-2">
                    {tx.category || "未分類"}
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  ¥{tx.amount.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}