import { useState } from 'react'
import { useAuth } from '../lib/auth'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('请输入邮箱'); return }
    if (password.length < 6) { setError('密码至少 6 位'); return }

    setLoading(true)
    const err = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)
    setLoading(false)

    if (err) {
      setError(err)
    } else if (mode === 'register') {
      setError('')
      setMode('login')
      setError('注册成功，请登录')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>&#128218;</div>
        <h1 className={styles.title}>单词本</h1>
        <p className={styles.subtitle}>{mode === 'login' ? '登录以同步你的学习数据' : '创建账号开始学习'}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className={styles.input}
            type="password"
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <button
          className={styles.toggle}
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
        >
          {mode === 'login' ? '没有账号？注册' : '已有账号？登录'}
        </button>
      </div>
    </div>
  )
}
