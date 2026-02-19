"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // 原因究明用のメッセージ箱
  const [debugMessage, setDebugMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setDebugMessage(""); // 初期化
    
    // 1. ログインユーザーの確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      setDebugMessage("🚨 ログイン情報がありません。ブラウザがログインを忘れている可能性があります！");
      setIsLoading(false);
      return;
    }

    // 2. 「今月」の初日と末日を計算（ブラウザに依存しない絶対にバグらない書き方）
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDayNum = new Date(y, now.getMonth() + 1, 0).getDate();
    
    const firstDay = `${y}-${m}-01`;
    const lastDay = `${y}-${m}-${String(lastDayNum).padStart(2, '0')}`;

    // 3. データの取得
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", firstDay)
      .lte("date", lastDay)
      .order("date", { ascending: false });

    if (error) {
      setDebugMessage(`🚨 Supabaseエラー: ${error.message}`);
    } else if (data) {
      if (data.length === 0) {
        // データが0件だった場合、何が原因で0件と判断されたかを画面に出す
        setDebugMessage(`💡 データ0件。検索条件: ${firstDay} 〜 ${lastDay} / あなたのID: ${user.id}`);
      }
      setTransactions(data);
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

      {/* デバッグ用の赤いメッセージボックス（エラーや原因がある時だけ出ます） */}
      {debugMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm text-sm break-all">
          <p className="font-bold mb-1">【調査用メッセージ】</p>
          {debugMessage}
        </div>
      )}
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-6 mb-8 shadow-lg">
        <h2 className="text-sm font-medium opacity-80 mb-2">今月の利用合計</h2>
        <div className="text-4xl font-bold tracking-wider">
          ¥{totalAmount.toLocaleString()}
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 text-gray-800">明細一覧</h2>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        {transactions.length === 0 ? (
          <p className="p-8 text-gray-400 text-center">今月のデータはまだありません。</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <li key={tx.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500 mb-1">{tx.date}</div>
                  <div className="font-medium text-gray-900">{tx.description}</div>
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