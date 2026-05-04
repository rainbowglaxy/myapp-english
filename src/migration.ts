import { supabase } from './lib/supabase'

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

export async function migrateLocalStorageToSupabase(userId: string): Promise<boolean> {
  try {
    // 1. 迁移词书
    const books = load<any[]>(BOOKS_KEY, [])
    for (const book of books) {
      await supabase.from('word_books').upsert({
        user_id: userId,
        book_id: book.bookId,
        name: book.name,
        words: book.words,
      }, { onConflict: 'user_id,book_id' })
    }

    // 2. 迁移学习记录（每 100 条一批）
    const records = load<Record<string, any>>(RECORDS_KEY, {})
    const entries = Object.entries(records)
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100).map(([, rec]) => ({
        user_id: userId,
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
      await supabase.from('learning_records').upsert(batch, { onConflict: 'user_id,book_id,word_id' })
    }

    // 3. 迁移设置
    const dailyLimit = load(DAILY_LIMIT_KEY, 20)
    const darkMode = load(DARK_MODE_KEY, false)
    await supabase.from('user_settings').upsert({
      user_id: userId,
      daily_limit: dailyLimit,
      dark_mode: darkMode,
      migrated_from_local: true,
    }, { onConflict: 'user_id' })

    return true
  } catch (e) {
    console.error('Migration failed:', e)
    return false
  }
}
