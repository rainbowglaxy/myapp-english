import { useState, useCallback } from 'react'
import type { WordBook, Word } from '../types'
import styles from './TodayPage.module.css'

interface Props {
  store: ReturnType<typeof import('../store').useStore>
  onStudy: (book: WordBook, words: Word[]) => void
  onWordClick: (word: Word, book: WordBook, words: Word[]) => void
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TodayPage({ store, onStudy, onWordClick }: Props) {
  const [editingLimit, setEditingLimit] = useState(false)
  const [limitInput, setLimitInput] = useState(String(store.dailyLimit))
  const [shuffle, setShuffle] = useState(false)

  const dueBooks = store.wordBooks
    .map((book) => ({ book, dueWords: store.wordsToReview(book) }))
    .filter((d) => d.dueWords.length > 0)

  const totalDue = dueBooks.reduce((sum, d) => sum + d.dueWords.length, 0)
  const totalMastered = store.wordBooks.reduce((sum, b) => sum + store.stats(b).mastered, 0)
  const todayWords = store.getTodayWords()

  const getStudyWords = useCallback((words: Word[]) => {
    return shuffle ? shuffleArr(words) : words
  }, [shuffle])

  const handleSaveLimit = () => {
    const n = parseInt(limitInput, 10)
    if (!isNaN(n) && n > 0) {
      store.setDailyLimit(n)
    }
    setEditingLimit(false)
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'mastered': return <span className="badge badge-green">已掌握</span>
      case 'reviewing': return <span className="badge badge-purple">复习中</span>
      case 'learning': return <span className="badge badge-orange">学习中</span>
      default: return null
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>今日学习</h1>

      <div className={styles.overview}>
        <div className={styles.overviewItem}>
          <span className={styles.bigNum} style={{ color: 'var(--accent)' }}>{totalDue}</span>
          <span className={styles.overviewLabel}>待学习</span>
        </div>
        <div className={styles.overviewItem}>
          <span className={styles.bigNum} style={{ color: 'var(--orange)' }}>{todayWords.length}</span>
          <span className={styles.overviewLabel}>今日已学</span>
        </div>
        <div className={styles.overviewItem}>
          <span className={styles.bigNum} style={{ color: 'var(--green)' }}>{totalMastered}</span>
          <span className={styles.overviewLabel}>已掌握</span>
        </div>
      </div>

      <div className={styles.planRow}>
        <span className={styles.planLabel}>每日计划</span>
        {editingLimit ? (
          <div className={styles.planEdit}>
            <input
              className={styles.planInput}
              type="number"
              min={1}
              max={100}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLimit()}
              autoFocus
            />
            <span className={styles.planUnit}>词/天</span>
            <button className="btn-primary btn-sm" onClick={handleSaveLimit}>确定</button>
          </div>
        ) : (
          <button className={styles.planValue} onClick={() => { setLimitInput(String(store.dailyLimit)); setEditingLimit(true) }}>
            {store.dailyLimit} 词/天 <span style={{ fontSize: 12, opacity: 0.5 }}>&#9998;</span>
          </button>
        )}
      </div>

      {todayWords.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>今日已学单词</div>
          <div className={styles.todayWordList}>
            {todayWords.map(({ word, book, record }, i) => {
              // 今日已学单词作为可导航列表
              const allTodayWords = todayWords.map(tw => tw.word)
              return (
                <button key={word.id + i} className={styles.todayWordItem}
                  onClick={() => onWordClick(word, book, allTodayWords)}>
                  <div>
                    <span className={styles.todayWordName}>{word.headWord}</span>
                    {word.translations[0] && (
                      <span className={styles.todayWordTrans}>
                        {word.translations[0].pos ? `${word.translations[0].pos} ` : ''}{word.translations[0].tranCn}
                      </span>
                    )}
                  </div>
                  {statusBadge(record.status)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {dueBooks.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>待学习</div>
            <div className={styles.orderToggle}>
              <button className={`${styles.orderBtn} ${!shuffle ? styles.orderActive : ''}`} onClick={() => setShuffle(false)}>
                &#8593;&#8595; 顺序
              </button>
              <button className={`${styles.orderBtn} ${shuffle ? styles.orderActive : ''}`} onClick={() => setShuffle(true)}>
                &#10051; 乱序
              </button>
            </div>
          </div>
          <div className={styles.cardList}>
            {dueBooks.map(({ book, dueWords }) => {
              const studyWords = getStudyWords(dueWords)
              return (
                <div key={book.id} className="card">
                  <div className={styles.cardHeader}>
                    <div>
                      <div className={styles.bookName}>{book.name}</div>
                      <div className={styles.dueCount}>{dueWords.length} 个单词待复习</div>
                    </div>
                    <span style={{ fontSize: 20, color: 'var(--accent)', opacity: 0.5 }}>&#9654;</span>
                  </div>
                  <div className={styles.wordChips}>
                    {dueWords.slice(0, 5).map((w) => (
                      <span key={w.id} className="badge badge-accent">{w.headWord}</span>
                    ))}
                    {dueWords.length > 5 && (
                      <span className={styles.moreCount}>+{dueWords.length - 5}</span>
                    )}
                  </div>
                  <button className="btn-primary" onClick={() => onStudy(book, studyWords)} style={{ width: '100%', marginTop: 12 }}>
                    开始学习
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {dueBooks.length === 0 && todayWords.length === 0 && (
        <div className="empty-state">
          <div className="icon">&#9989;</div>
          <div className="title">今天没有需要复习的单词</div>
          <div className="subtitle">继续保持，或者导入新词书开始学习</div>
        </div>
      )}
    </div>
  )
}
