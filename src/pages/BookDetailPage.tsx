import { useState, useCallback } from 'react'
import type { WordBook, Word, LearningStatus } from '../types'
import styles from './BookDetailPage.module.css'

interface Props {
  book: WordBook
  store: ReturnType<typeof import('../store').useStore>
  onBack: () => void
  onWordClick: (word: Word) => void
  onStartFlashcard: (words: Word[]) => void
  onStartQuiz: (words: Word[]) => void
}

type FilterStatus = 'all' | 'new' | 'learning' | 'mastered'

export default function BookDetailPage({ book, store, onBack, onWordClick, onStartFlashcard, onStartQuiz }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [shuffle, setShuffle] = useState(false)
  const s = store.stats(book)
  const reviewWords = store.wordsToReview(book)

  const shuffled = useCallback((words: Word[]) => {
    if (!shuffle) return words
    const arr = [...words]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [shuffle])

  const filteredWords = book.words.filter((word) => {
    if (search && !word.headWord.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'all') return true
    const rec = store.record(book, word)
    if (filter === 'new') return !store.learningRecords[store.recordKey(book, word)] || rec.status === 'new'
    if (filter === 'learning') return rec.status === 'learning'
    if (filter === 'mastered') return rec.status === 'mastered'
    return true
  })

  const statusIcon = (word: Word) => {
    const key = store.recordKey(book, word)
    const hasRecord = !!store.learningRecords[key]
    const rec = store.record(book, word)
    if (rec.status === 'mastered') return <span style={{ color: 'var(--green)' }}>✔</span>
    if (rec.status === 'learning') return <span style={{ color: 'var(--orange)' }}>&#128337;</span>
    if (rec.status === 'reviewing') return <span style={{ color: 'var(--purple)' }}>&#8635;</span>
    if (!hasRecord) return <span className="badge badge-blue">新</span>
    return null
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>&#8592; 返回</button>
        <h1 className={styles.title}>{book.name}</h1>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue} style={{ color: 'var(--blue)' }}>{s.new}</span>
          <span className={styles.statLabel}>新词</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue} style={{ color: 'var(--orange)' }}>{s.learning}</span>
          <span className={styles.statLabel}>学习中</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue} style={{ color: 'var(--purple)' }}>{s.reviewing}</span>
          <span className={styles.statLabel}>复习</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue} style={{ color: 'var(--green)' }}>{s.mastered}</span>
          <span className={styles.statLabel}>已掌握</span>
        </div>
      </div>

      <div className={styles.studySection}>
        <div className={styles.orderRow}>
          <button
            className={`${styles.orderBtn} ${!shuffle ? styles.orderActive : ''}`}
            onClick={() => setShuffle(false)}
          >
            &#8593;&#8595; 顺序
          </button>
          <button
            className={`${styles.orderBtn} ${shuffle ? styles.orderActive : ''}`}
            onClick={() => setShuffle(true)}
          >
            &#10051; 乱序
          </button>
        </div>
        <div className={styles.studyBtns}>
          <button className="btn-primary" onClick={() => onStartFlashcard(shuffled(reviewWords))} disabled={reviewWords.length === 0}>
            &#128196; 闪卡记忆 ({reviewWords.length})
          </button>
          <button className="btn-secondary" onClick={() => onStartQuiz(shuffled(reviewWords))} disabled={reviewWords.length === 0}>
            &#10003; 选择题测试
          </button>
        </div>
      </div>

      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="搜索单词..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.filters}>
        {(['all', 'new', 'learning', 'mastered'] as FilterStatus[]).map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {{ all: '全部', new: '新词', learning: '学习中', mastered: '已掌握' }[f]}
          </button>
        ))}
      </div>

      <div className={styles.wordList}>
        {filteredWords.map((word) => {
          const trans = word.translations[0]
          return (
            <div key={word.id} className={styles.wordItem} onClick={() => onWordClick(word)}>
              <div>
                <div className={styles.wordName}>{word.headWord}</div>
                {trans && (
                  <div className={styles.wordTrans}>
                    {trans.pos ? `${trans.pos} ` : ''}{trans.tranCn}
                  </div>
                )}
              </div>
              <div className={styles.wordStatus}>{statusIcon(word)}</div>
            </div>
          )
        })}
        {filteredWords.length === 0 && (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="subtitle">没有匹配的单词</div>
          </div>
        )}
      </div>
    </div>
  )
}
