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

  useEffect(() => {
    // 画面が開かれたら、まずはログインしているかチェック
    checkSession();

    // ログイン状態が変わった時（ログイン完了時など）に画面を更新する設定
    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchData(newSession.user.id);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    if (session) {
      fetchData(session.user.id);
    } else {
      setIsLoading(false);
    }
  };

  // Googleログインの処理
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  // ログアウトの処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTransactions([]);
  };

  const fetchData = async (userId: string) => {
    setIsLoading(true);
    
    // 今月の初日と末日
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDayNum = new Date(y, now.getMonth() + 1, 0).getDate();
    
    const firstDay = `${y}-${m}-01`;
    const lastDay = `${y}-${m}-${String(lastDayNum).padStart(2, '0')}`;

    // データの取得
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", firstDay)
      .lte("date", lastDay)
      .order("date", { ascending: false });

    if (error) {
      console.error(error);
    } else if (data) {
      setTransactions(data);
      const total = data.reduce((sum, item) => sum + item.amount, 0);
      setTotalAmount(total);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  // --------------------------------------------------------
  // ① ログインしていない時の画面（ログインボタンを表示）
  // --------------------------------------------------------
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">JCB 自動家計簿</h1>
          <p className="text-sm text-gray-500 mb-8">Googleアカウントでログインして、家計簿をはじめましょう。</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // ② ログインしている時の画面（家計簿ダッシュボード）
  // --------------------------------------------------------
  return (
    <div className="p-4 max-w-2xl mx-auto min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">JCB 家計簿</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800">
          ログアウト
        </button>
      </div>
      
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
              <li key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
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