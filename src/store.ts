import { useState, useCallback, useEffect, useRef } from 'react'
import type { WordBook, Word, LearningRecord, BookStats } from './types'
import { onCorrect, onWrong } from './utils'
import { supabase } from './lib/supabase'
import { migrateLocalStorageToSupabase } from './migration'

const BOOKS_KEY = 'wordBooks_v1'
const RECORDS_KEY = 'learningRecords_v1'
const DAILY_LIMIT_KEY = 'dailyLimit_v1'
const DARK_MODE_KEY = 'darkMode_v1'

function load<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export interface StoreState {
  wordBooks: WordBook[]
  learningRecords: Record<string, LearningRecord>
}

export function useStore(userId: string | null = null) {
  const [wordBooks, setWordBooks] = useState<WordBook[]>(() => load(BOOKS_KEY, []))
  const [learningRecords, setLearningRecords] = useState<Record<string, LearningRecord>>(() => load(RECORDS_KEY, {}))
  const [dailyLimit, setDailyLimitState] = useState<number>(() => load(DAILY_LIMIT_KEY, 20))
  const [darkMode, setDarkModeState] = useState<boolean>(() => load(DARK_MODE_KEY, false))
  const [hydrated, setHydrated] = useState(!userId) // if no userId, start hydrated (localStorage mode)
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  // localStorage 持久化（始终保留作为离线缓存）
  useEffect(() => { save(BOOKS_KEY, wordBooks) }, [wordBooks])
  useEffect(() => { save(RECORDS_KEY, learningRecords) }, [learningRecords])
  useEffect(() => { save(DAILY_LIMIT_KEY, dailyLimit) }, [dailyLimit])
  useEffect(() => { save(DARK_MODE_KEY, darkMode) }, [darkMode])

  // 暗色模式
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // 从 Supabase 加载数据
  useEffect(() => {
    if (!userId) {
      setHydrated(true)
      return
    }

    let cancelled = false

    async function loadFromSupabase() {
      // 检查是否需要迁移
      const { data: settings } = await supabase
        .from('user_settings')
        .select('migrated_from_local, daily_limit, dark_mode')
        .eq('user_id', userId!)
        .maybeSingle()

      if (!settings?.migrated_from_local) {
        await migrateLocalStorageToSupabase(userId!)
      }

      if (cancelled) return

      // 加载词书
      const { data: books } = await supabase
        .from('word_books')
        .select('book_id, name, words, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: true })

      if (cancelled) return

      if (books && books.length > 0) {
        const mapped: WordBook[] = books.map((b: any) => ({
          id: b.book_id,
          bookId: b.book_id,
          name: b.name,
          words: b.words as Word[],
          createdAt: b.created_at,
        }))
        setWordBooks(mapped)
      }

      // 加载学习记录
      const { data: records } = await supabase
        .from('learning_records')
        .select('*')
        .eq('user_id', userId!)

      if (cancelled) return

      if (records && records.length > 0) {
        const mapped: Record<string, LearningRecord> = {}
        for (const r of records) {
          const key = `${r.book_id}_${r.word_id}`
          mapped[key] = {
            wordId: r.word_id,
            bookId: r.book_id,
            status: r.status,
            reviewCount: r.review_count,
            correctCount: r.correct_count,
            consecutiveCorrect: r.consecutive_correct,
            easeFactor: r.ease_factor,
            intervalDays: r.interval_days,
            lastReviewedAt: r.last_reviewed_at || undefined,
            nextReviewAt: r.next_review_at || undefined,
          }
        }
        setLearningRecords(mapped)
      }

      // 加载设置
      if (settings) {
        setDailyLimitState(settings.daily_limit)
        setDarkModeState(settings.dark_mode)
      }

      if (!cancelled) setHydrated(true)
    }

    setHydrated(false)
    loadFromSupabase()
    return () => { cancelled = true }
  }, [userId])

  const toggleDarkMode = useCallback(() => {
    setDarkModeState((prev) => {
      const next = !prev
      if (userIdRef.current) {
        supabase.from('user_settings').upsert({
          user_id: userIdRef.current,
          dark_mode: next,
        }, { onConflict: 'user_id' }).then()
      }
      return next
    })
  }, [])

  const setDailyLimit = useCallback((limit: number) => {
    const clamped = Math.max(1, Math.min(200, limit))
    setDailyLimitState(clamped)
    if (userIdRef.current) {
      supabase.from('user_settings').upsert({
        user_id: userIdRef.current,
        daily_limit: clamped,
      }, { onConflict: 'user_id' }).then()
    }
  }, [])

  const addWordBook = useCallback((book: WordBook) => {
    setWordBooks((prev) => {
      const existing = prev.find((b) => b.bookId === book.bookId)
      let next: WordBook[]
      if (existing) {
        const existingWordIds = new Set(existing.words.map((w) => w.wordId))
        const newWords = book.words.filter((w) => !existingWordIds.has(w.wordId))
        if (newWords.length === 0) return prev
        next = prev.map((b) =>
          b.bookId === book.bookId
            ? { ...b, words: [...b.words, ...newWords] }
            : b
        )
      } else {
        next = [...prev, book]
      }
      // 写入 Supabase
      if (userIdRef.current) {
        const target = next.find((b) => b.bookId === book.bookId)!
        supabase.from('word_books').upsert({
          user_id: userIdRef.current,
          book_id: target.bookId,
          name: target.name,
          words: target.words,
        }, { onConflict: 'user_id,book_id' }).then()
      }
      return next
    })
  }, [])

  const deleteWordBook = useCallback((book: WordBook) => {
    setWordBooks((prev) => prev.filter((b) => b.id !== book.id))
    setLearningRecords((prev) => {
      const next = { ...prev }
      for (const word of book.words) {
        delete next[`${book.bookId}_${word.wordId}`]
      }
      return next
    })
    if (userIdRef.current) {
      supabase.from('word_books').delete()
        .eq('user_id', userIdRef.current)
        .eq('book_id', book.bookId).then()
      supabase.from('learning_records').delete()
        .eq('user_id', userIdRef.current)
        .eq('book_id', book.bookId).then()
    }
  }, [])

  const resetBookProgress = useCallback((book: WordBook) => {
    setLearningRecords((prev) => {
      const next = { ...prev }
      for (const word of book.words) {
        delete next[`${book.bookId}_${word.wordId}`]
      }
      return next
    })
    if (userIdRef.current) {
      supabase.from('learning_records').delete()
        .eq('user_id', userIdRef.current)
        .eq('book_id', book.bookId).then()
    }
  }, [])

  const resetWordProgress = useCallback((book: WordBook, word: Word) => {
    const key = `${book.bookId}_${word.wordId}`
    setLearningRecords((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    if (userIdRef.current) {
      supabase.from('learning_records').delete()
        .eq('user_id', userIdRef.current)
        .eq('book_id', book.bookId)
        .eq('word_id', word.wordId).then()
    }
  }, [])

  const recordKey = useCallback((book: WordBook, word: Word) => {
    return `${book.bookId}_${word.wordId}`
  }, [])

  const record = useCallback((book: WordBook, word: Word): LearningRecord => {
    const key = recordKey(book, word)
    return learningRecords[key] ?? {
      wordId: word.wordId,
      bookId: book.bookId,
      status: 'new',
      reviewCount: 0,
      correctCount: 0,
      consecutiveCorrect: 0,
      easeFactor: 2.5,
      intervalDays: 0,
    }
  }, [learningRecords, recordKey])

  const markKnown = useCallback((book: WordBook, word: Word) => {
    const key = recordKey(book, word)
    const rec = record(book, word)
    const srs = onCorrect({
      status: rec.status,
      consecutiveCorrect: rec.consecutiveCorrect,
      easeFactor: rec.easeFactor,
      intervalDays: rec.intervalDays,
    })
    const updated: LearningRecord = {
      ...rec,
      reviewCount: rec.reviewCount + 1,
      correctCount: rec.correctCount + 1,
      consecutiveCorrect: srs.consecutiveCorrect,
      easeFactor: srs.easeFactor,
      intervalDays: srs.intervalDays,
      lastReviewedAt: new Date().toISOString(),
      status: srs.status,
      nextReviewAt: srs.nextReviewAt,
    }
    setLearningRecords((prev) => ({ ...prev, [key]: updated }))
    if (userIdRef.current) {
      supabase.from('learning_records').upsert({
        user_id: userIdRef.current,
        book_id: updated.bookId,
        word_id: updated.wordId,
        status: updated.status,
        review_count: updated.reviewCount,
        correct_count: updated.correctCount,
        consecutive_correct: updated.consecutiveCorrect,
        ease_factor: updated.easeFactor,
        interval_days: updated.intervalDays,
        last_reviewed_at: updated.lastReviewedAt || null,
        next_review_at: updated.nextReviewAt || null,
      }, { onConflict: 'user_id,book_id,word_id' }).then()
    }
  }, [recordKey, record])

  const markUnknown = useCallback((book: WordBook, word: Word) => {
    const key = recordKey(book, word)
    const rec = record(book, word)
    const srs = onWrong({
      status: rec.status,
      consecutiveCorrect: rec.consecutiveCorrect,
      easeFactor: rec.easeFactor,
      intervalDays: rec.intervalDays,
    })
    const updated: LearningRecord = {
      ...rec,
      reviewCount: rec.reviewCount + 1,
      consecutiveCorrect: srs.consecutiveCorrect,
      easeFactor: srs.easeFactor,
      intervalDays: srs.intervalDays,
      lastReviewedAt: new Date().toISOString(),
      status: srs.status,
      nextReviewAt: srs.nextReviewAt,
    }
    setLearningRecords((prev) => ({ ...prev, [key]: updated }))
    if (userIdRef.current) {
      supabase.from('learning_records').upsert({
        user_id: userIdRef.current,
        book_id: updated.bookId,
        word_id: updated.wordId,
        status: updated.status,
        review_count: updated.reviewCount,
        correct_count: updated.correctCount,
        consecutive_correct: updated.consecutiveCorrect,
        ease_factor: updated.easeFactor,
        interval_days: updated.intervalDays,
        last_reviewed_at: updated.lastReviewedAt || null,
        next_review_at: updated.nextReviewAt || null,
      }, { onConflict: 'user_id,book_id,word_id' }).then()
    }
  }, [recordKey, record])

  const stats = useCallback((book: WordBook): BookStats => {
    const total = book.words.length
    let newCount = 0, learningCount = 0, reviewingCount = 0, masteredCount = 0
    for (const word of book.words) {
      const key = recordKey(book, word)
      const rec = learningRecords[key]
      if (!rec) {
        newCount++
      } else {
        switch (rec.status) {
          case 'new': newCount++; break
          case 'learning': learningCount++; break
          case 'reviewing': reviewingCount++; break
          case 'mastered': masteredCount++; break
        }
      }
    }
    return {
      total,
      new: newCount,
      learning: learningCount,
      reviewing: reviewingCount,
      mastered: masteredCount,
      progress: total > 0 ? masteredCount / total : 0,
    }
  }, [learningRecords, recordKey])

  const wordsToReview = useCallback((book: WordBook, limit?: number): Word[] => {
    const max = limit ?? dailyLimit
    const now = new Date().toISOString()
    const result: Word[] = []
    for (const word of book.words) {
      if (result.length >= max) break
      const key = recordKey(book, word)
      const rec = learningRecords[key]
      if (!rec) {
        result.push(word)
      } else if (rec.status === 'mastered') {
        continue
      } else if (rec.nextReviewAt && rec.nextReviewAt <= now) {
        result.push(word)
      }
    }
    return result
  }, [learningRecords, recordKey, dailyLimit])

  const getTodayWords = useCallback((): { book: WordBook; word: Word; record: LearningRecord }[] => {
    const today = new Date().toISOString().slice(0, 10)
    const result: { book: WordBook; word: Word; record: LearningRecord }[] = []
    for (const book of wordBooks) {
      for (const word of book.words) {
        const key = `${book.bookId}_${word.wordId}`
        const rec = learningRecords[key]
        if (rec && rec.lastReviewedAt && rec.lastReviewedAt.slice(0, 10) === today) {
          result.push({ book, word, record: rec })
        }
      }
    }
    return result
  }, [wordBooks, learningRecords])

  const getWordsByStatus = useCallback((book: WordBook, status: 'new' | 'learning' | 'reviewing' | 'mastered'): Word[] => {
    return book.words.filter((word) => {
      const key = `${book.bookId}_${word.wordId}`
      const rec = learningRecords[key]
      if (status === 'new') return !rec || rec.status === 'new'
      return rec?.status === status
    })
  }, [learningRecords])

  const searchAllWords = useCallback((query: string): { book: WordBook; word: Word }[] => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const result: { book: WordBook; word: Word }[] = []
    for (const book of wordBooks) {
      for (const word of book.words) {
        if (word.headWord.toLowerCase().includes(q)) {
          result.push({ book, word })
        }
      }
    }
    return result.slice(0, 30)
  }, [wordBooks])

  const todayStats = useCallback(() => {
    const todayWords = getTodayWords()
    return { reviewed: todayWords.length }
  }, [getTodayWords])

  const exportData = useCallback(() => {
    const data = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      wordBooks,
      learningRecords,
      dailyLimit,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wordbook-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [wordBooks, learningRecords, dailyLimit])

  const importData = useCallback((json: string): string => {
    try {
      const data = JSON.parse(json)
      if (!data.wordBooks || !data.learningRecords) {
        return '备份文件格式不正确'
      }
      setWordBooks(data.wordBooks)
      setLearningRecords(data.learningRecords)
      if (data.dailyLimit) setDailyLimitState(data.dailyLimit)

      // 同步到 Supabase
      if (userIdRef.current) {
        const uid = userIdRef.current
        // 词书
        for (const book of data.wordBooks) {
          supabase.from('word_books').upsert({
            user_id: uid,
            book_id: book.bookId,
            name: book.name,
            words: book.words,
          }, { onConflict: 'user_id,book_id' }).then()
        }
        // 学习记录
        const entries = Object.entries(data.learningRecords)
        const batch = entries.map(([, rec]: [string, any]) => ({
          user_id: uid,
          book_id: rec.bookId,
          word_id: rec.wordId,
          status: rec.status,
          review_count: rec.reviewCount,
          correct_count: rec.correctCount,
          consecutive_correct: rec.consecutiveCorrect,
          ease_factor: rec.easeFactor,
          interval_days: rec.intervalDays,
          last_reviewed_at: rec.lastReviewedAt || null,
          next_review_at: rec.nextReviewAt || null,
        }))
        supabase.from('learning_records').upsert(batch, { onConflict: 'user_id,book_id,word_id' }).then()
      }
      return ''
    } catch (e) {
      return '解析备份文件失败: ' + (e as Error).message
    }
  }, [])

  return {
    wordBooks,
    learningRecords,
    dailyLimit,
    darkMode,
    hydrated,
    addWordBook,
    deleteWordBook,
    setDailyLimit,
    toggleDarkMode,
    recordKey,
    record,
    markKnown,
    markUnknown,
    stats,
    wordsToReview,
    getTodayWords,
    getWordsByStatus,
    searchAllWords,
    todayStats,
    resetBookProgress,
    resetWordProgress,
    exportData,
    importData,
  }
}
