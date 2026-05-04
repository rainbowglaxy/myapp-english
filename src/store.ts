import { useState, useCallback, useEffect } from 'react'
import type { WordBook, Word, LearningRecord, BookStats } from './types'
import { onCorrect, onWrong } from './utils'

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

export function useStore() {
  const [wordBooks, setWordBooks] = useState<WordBook[]>(() => load(BOOKS_KEY, []))
  const [learningRecords, setLearningRecords] = useState<Record<string, LearningRecord>>(() => load(RECORDS_KEY, {}))
  const [dailyLimit, setDailyLimitState] = useState<number>(() => load(DAILY_LIMIT_KEY, 20))
  const [darkMode, setDarkModeState] = useState<boolean>(() => load(DARK_MODE_KEY, false))

  useEffect(() => { save(BOOKS_KEY, wordBooks) }, [wordBooks])
  useEffect(() => { save(RECORDS_KEY, learningRecords) }, [learningRecords])
  useEffect(() => { save(DAILY_LIMIT_KEY, dailyLimit) }, [dailyLimit])
  useEffect(() => { save(DARK_MODE_KEY, darkMode) }, [darkMode])

  // 暗色模式
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleDarkMode = useCallback(() => {
    setDarkModeState((prev) => !prev)
  }, [])

  const setDailyLimit = useCallback((limit: number) => {
    setDailyLimitState(Math.max(1, Math.min(200, limit)))
  }, [])

  const addWordBook = useCallback((book: WordBook) => {
    setWordBooks((prev) => {
      // 去重：如果 bookId 已存在，合并新单词
      const existing = prev.find((b) => b.bookId === book.bookId)
      if (existing) {
        const existingWordIds = new Set(existing.words.map((w) => w.wordId))
        const newWords = book.words.filter((w) => !existingWordIds.has(w.wordId))
        if (newWords.length === 0) return prev
        return prev.map((b) =>
          b.bookId === book.bookId
            ? { ...b, words: [...b.words, ...newWords] }
            : b
        )
      }
      return [...prev, book]
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
  }, [])

  // 重置单本书的学习进度
  const resetBookProgress = useCallback((book: WordBook) => {
    setLearningRecords((prev) => {
      const next = { ...prev }
      for (const word of book.words) {
        delete next[`${book.bookId}_${word.wordId}`]
      }
      return next
    })
  }, [])

  // 重置单个单词的学习进度
  const resetWordProgress = useCallback((book: WordBook, word: Word) => {
    const key = `${book.bookId}_${word.wordId}`
    setLearningRecords((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
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

  // 获取今日已学习的单词
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

  // 获取某本书中指定状态的单词
  const getWordsByStatus = useCallback((book: WordBook, status: 'new' | 'learning' | 'reviewing' | 'mastered'): Word[] => {
    return book.words.filter((word) => {
      const key = `${book.bookId}_${word.wordId}`
      const rec = learningRecords[key]
      if (status === 'new') return !rec || rec.status === 'new'
      return rec?.status === status
    })
  }, [learningRecords])

  // 全局搜索单词
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

  // 导出全部数据
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

  // 导入备份数据
  const importData = useCallback((json: string): string => {
    try {
      const data = JSON.parse(json)
      if (!data.wordBooks || !data.learningRecords) {
        return '备份文件格式不正确'
      }
      setWordBooks(data.wordBooks)
      setLearningRecords(data.learningRecords)
      if (data.dailyLimit) setDailyLimitState(data.dailyLimit)
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
