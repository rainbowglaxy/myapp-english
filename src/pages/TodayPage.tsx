import type { WordBook, Word } from '../types'
import styles from './TodayPage.module.css'

interface Props {
  store: ReturnType<typeof import('../store').useStore>
  onStudy: (book: WordBook, words: Word[]) => void
}

export default function TodayPage({ store, onStudy }: Props) {
  const dueBooks = store.wordBooks
    .map((book) => ({ book, dueWords: store.wordsToReview(book) }))
    .filter((d) => d.dueWords.length > 0)

  const totalDue = dueBooks.reduce((sum, d) => sum + d.dueWords.length, 0)
  const totalMastered = store.wordBooks.reduce((sum, b) => sum + store.stats(b).mastered, 0)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>今日学习</h1>

      <div className={styles.overview}>
        <div className={styles.overviewItem}>
          <span className={styles.bigNum} style={{ color: 'var(--accent)' }}>{totalDue}</span>
          <span className={styles.overviewLabel}>待学习</span>
        </div>
        <div className={styles.overviewItem}>
          <span className={styles.bigNum}>{store.wordBooks.length}</span>
          <span className={styles.overviewLabel}>词书</span>
        </div>
        <div className={styles.overviewItem}>
          <span className={styles.bigNum} style={{ color: 'var(--green)' }}>{totalMastered}</span>
          <span className={styles.overviewLabel}>已掌握</span>
        </div>
      </div>

      {dueBooks.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#9989;</div>
          <div className="title">今天没有需要复习的单词</div>
          <div className="subtitle">继续保持，或者导入新词书开始学习</div>
        </div>
      ) : (
        <div className={styles.cardList}>
          {dueBooks.map(({ book, dueWords }) => (
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
              <button className="btn-primary" onClick={() => onStudy(book, dueWords)} style={{ width: '100%', marginTop: 12 }}>
                开始学习
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
