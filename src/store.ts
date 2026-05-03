import { useState, useCallback, useEffect } from 'react'
import type { WordBook, Word, LearningRecord, BookStats } from './types'
import { nextReviewDate, fiveMinutesLater } from './utils'

const BOOKS_KEY = 'wordBooks_v1'
const RECORDS_KEY = 'learningRecords_v1'

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

export interface StoreState {
  wordBooks: WordBook[]
  learningRecords: Record<string, LearningRecord>
}

export function useStore() {
  const [wordBooks, setWordBooks] = useState<WordBook[]>(loadBooks)
  const [learningRecords, setLearningRecords] = useState<Record<string, LearningRecord>>(loadRecords)

  useEffect(() => { saveBooks(wordBooks) }, [wordBooks])
  useEffect(() => { saveRecords(learningRecords) }, [learningRecords])

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
    }
  }, [learningRecords, recordKey])

  const markKnown = useCallback((book: WordBook, word: Word) => {
    const key = recordKey(book, word)
    const rec = record(book, word)
    const newCorrect = rec.correctCount + 1
    const newReview = rec.reviewCount + 1
    const updated: LearningRecord = {
      ...rec,
      reviewCount: newReview,
      correctCount: newCorrect,
      lastReviewedAt: new Date().toISOString(),
      status: newCorrect >= 3 ? 'mastered' : 'reviewing',
      nextReviewAt: nextReviewDate(newCorrect),
    }
    setLearningRecords((prev) => ({ ...prev, [key]: updated }))
  }, [recordKey, record])

  const markUnknown = useCallback((book: WordBook, word: Word) => {
    const key = recordKey(book, word)
    const rec = record(book, word)
    const updated: LearningRecord = {
      ...rec,
      reviewCount: rec.reviewCount + 1,
      lastReviewedAt: new Date().toISOString(),
      status: 'learning',
      nextReviewAt: fiveMinutesLater(),
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

  const wordsToReview = useCallback((book: WordBook, limit = 20): Word[] => {
    const now = new Date().toISOString()
    const result: Word[] = []
    for (const word of book.words) {
      if (result.length >= limit) break
      const key = recordKey(book, word)
      const rec = learningRecords[key]
      if (!rec) {
        result.push(word) // 新词
      } else if (rec.status === 'mastered') {
        continue
      } else if (rec.nextReviewAt && rec.nextReviewAt <= now) {
        result.push(word)
      }
    }
    return result
  }, [learningRecords, recordKey])

  return {
    wordBooks,
    learningRecords,
    addWordBook,
    deleteWordBook,
    recordKey,
    record,
    markKnown,
    markUnknown,
    stats,
    wordsToReview,
  }
}
