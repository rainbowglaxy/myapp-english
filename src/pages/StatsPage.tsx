import styles from './StatsPage.module.css'

interface Props {
  store: ReturnType<typeof import('../store').useStore>
}

export default function StatsPage({ store }: Props) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>学习统计</h1>

      {store.wordBooks.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#128202;</div>
          <div className="title">暂无学习数据</div>
          <div className="subtitle">导入词书并开始学习后，这里将显示你的学习统计</div>
        </div>
      ) : (
        <div className={styles.cardList}>
          {store.wordBooks.map((book) => {
            const s = store.stats(book)
            return (
              <div key={book.id} className="card">
                <div className={styles.cardHeader}>
                  <span className={styles.bookName}>{book.name}</span>
                  <span className={styles.progressPct} style={{ color: 'var(--accent)' }}>
                    {Math.round(s.progress * 100)}%
                  </span>
                </div>

                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${s.progress * 100}%` }}
                  />
                </div>

                <div className={styles.statsRow}>
                  <div className={styles.statCol}>
                    <span className={styles.statVal} style={{ color: 'var(--blue)' }}>{s.new}</span>
                    <span className={styles.statLbl}>新词</span>
                  </div>
                  <div className={styles.statCol}>
                    <span className={styles.statVal} style={{ color: 'var(--orange)' }}>{s.learning}</span>
                    <span className={styles.statLbl}>学习中</span>
                  </div>
                  <div className={styles.statCol}>
                    <span className={styles.statVal} style={{ color: 'var(--purple)' }}>{s.reviewing}</span>
                    <span className={styles.statLbl}>复习</span>
                  </div>
                  <div className={styles.statCol}>
                    <span className={styles.statVal} style={{ color: 'var(--green)' }}>{s.mastered}</span>
                    <span className={styles.statLbl}>掌握</span>
                  </div>
                </div>

                <div className={styles.bookInfo}>
                  <span>&#128196; 共 {s.total} 词</span>
                  <span>&#127991; {book.bookId}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
