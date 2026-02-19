'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

export default function KakeiboApp() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [shopName, setShopName] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  // 1. ログイン状態の監視
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) fetchTransactions()
    }
    checkUser()

    // 状態変化をリアルタイムでキャッチ
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchTransactions()
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  // 2. 履歴データの取得
  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    if (data) setTransactions(data)
  }

  // 3. Googleログイン処理
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) alert("Googleログインエラー: " + error.message)
  }

  // 4. メールログイン処理 (バックアップ用)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin,
      }
    })
    if (error) alert("エラー: " + error.message)
    else alert("ログインメールを送信しました！")
  }

  // 5. ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setTransactions([])
  }

  // 6. 手動入力の保存処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    
    const { error } = await supabase
      .from('transactions')
      .insert([{ 
        amount: Number(amount), 
        shop_name: shopName, 
        category: '手動入力',
        user_id: user.id 
      }])

    if (error) {
      alert("保存エラー: " + error.message)
    } else {
      setAmount('')
      setShopName('')
      fetchTransactions()
    }
    setLoading(false)
  }

  // --- 画面表示 (ログイン前) ---
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 text-black text-center">
        <h1 className="text-4xl font-extrabold mb-2">JCB家計簿</h1>
        <p className="text-gray-500 mb-10">自動取り込み家計簿アプリ</p>
        
        <div className="w-full max-w-sm space-y-4">
          {/* Googleログインボタン */}
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-gray-300 text-gray-700 p-4 rounded-xl shadow-sm font-bold flex items-center justify-center gap-3 active:scale-95 transition"
          >
            Googleでログイン
          </button>

          <div className="flex items-center gap-2 text-gray-400 my-4">
            <hr className="flex-grow" /> <span className="text-xs">またはメールで</span> <hr className="flex-grow" />
          </div>

          {/* メールログインフォーム */}
          <form onSubmit={handleEmailLogin} className="space-y-2">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-black"
              required
            />
            <button className="w-full bg-black text-white p-4 rounded-xl font-bold active:scale-95 transition">
              ログインリンクを送信
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- 画面表示 (ログイン後) ---
  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen text-black">
      <div className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold">サクサク家計簿</h1>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <button onClick={handleLogout} className="text-xs bg-gray-200 px-3 py-1 rounded-full">ログアウト</button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm mb-8 space-y-4">
        <input
          type="text"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="どこで？"
          className="w-full border-b text-lg p-2 outline-none"
          required
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="いくら？"
          className="w-full border-b p-2 outline-none text-3xl font-mono"
          required
        />
        <button disabled={loading} className="w-full bg-black text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition">
          {loading ? '保存中...' : '記録する'}
        </button>
      </form>

      <h2 className="font-bold mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-black inline-block"></span>
        最近の履歴
      </h2>
      <div className="space-y-3">
        {transactions.length === 0 && <p className="text-center text-gray-400 py-10">履歴がまだありません</p>}
        {transactions.map((t) => (
          <div key={t.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm">
            <div>
              <div className="font-bold">{t.shop_name}</div>
              <div className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleDateString()}</div>
            </div>
            <div className="text-lg font-bold">¥{Number(t.amount).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}