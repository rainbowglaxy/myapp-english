import { useState, useCallback, useEffect } from 'react'
import type { WordBook, Word, LearningRecord, BookStats } from './types'
import { onCorrect, onWrong } from './utils'

const BOOKS_KEY = 'wordBooks_v1'
const RECORDS_KEY = 'learningRecords_v1'
const DAILY_LIMIT_KEY = 'dailyLimit_v1'

function loadBooks(): WordBook[] {
  try {
    const data = localStorage.getItem(BOOKS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function loadRecords(): Record<string, LearningRecord> {
  try {
    const data = localStorage.getItem(RECORDS_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveBooks(books: WordBook[]) {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books))
}

function saveRecords(records: Record<string, LearningRecord>) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

function loadDailyLimit(): number {
  const data = localStorage.getItem(DAILY_LIMIT_KEY)
  return data ? Number(data) : 20
}

function saveDailyLimit(limit: number) {
  localStorage.setItem(DAILY_LIMIT_KEY, String(limit))
}

export interface StoreState {
  wordBooks: WordBook[]
  learningRecords: Record<string, LearningRecord>
}

export function useStore() {
  const [wordBooks, setWordBooks] = useState<WordBook[]>(loadBooks)
  const [learningRecords, setLearningRecords] = useState<Record<string, LearningRecord>>(loadRecords)
  const [dailyLimit, setDailyLimitState] = useState<number>(loadDailyLimit)

  useEffect(() => { saveBooks(wordBooks) }, [wordBooks])
  useEffect(() => { saveRecords(learningRecords) }, [learningRecords])
  useEffect(() => { saveDailyLimit(dailyLimit) }, [dailyLimit])

  const setDailyLimit = useCallback((limit: number) => {
    setDailyLimitState(Math.max(1, Math.min(100, limit)))
  }, [])

  const addWordBook = useCallback((book: WordBook) => {
    setWordBooks((prev) => [...prev, book])
  }, [])

  const deleteWordBook = useCallback((book: WordBook) => {
    setWordBooks((prev) => prev.filter((b) => b.id !== book.id))
    setLearningRecords((prev) => {
      const next = { ...prev }
      for (const word of book.words) {
        const key = `${book.bookId}_${word.wordId}`
        delete next[key]
      }
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

  const todayStats = useCallback(() => {
    const todayWords = getTodayWords()
    return { reviewed: todayWords.length }
  }, [getTodayWords])

  return {
    wordBooks,
    learningRecords,
    dailyLimit,
    addWordBook,
    deleteWordBook,
    setDailyLimit,
    recordKey,
    record,
    markKnown,
    markUnknown,
    stats,
    wordsToReview,
    getTodayWords,
    getWordsByStatus,
    todayStats,
  }
}
