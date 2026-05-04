import { useState } from 'react'
import type { WordBook, Word, LearningStatus } from '../types'
import styles from './StatsPage.module.css'

interface Props {
  store: ReturnType<typeof import('../store').useStore>
  onWordClick: (word: Word, book: WordBook) => void
}

type ModalData = { book: WordBook; status: LearningStatus; label: string; color: string } | null

export default function StatsPage({ store, onWordClick }: Props) {
  const todayWords = store.getTodayWords()
  const [modal, setModal] = useState<ModalData>(null)

  const statusInfo: Record<LearningStatus, { label: string; color: string; badge: string }> = {
    new: { label: '新词', color: 'var(--blue)', badge: 'badge-blue' },
    learning: { label: '学习中', color: 'var(--orange)', badge: 'badge-orange' },
    reviewing: { label: '复习中', color: 'var(--purple)', badge: 'badge-purple' },
    mastered: { label: '已掌握', color: 'var(--green)', badge: 'badge-green' },
  }

  const modalWords = modal ? store.getWordsByStatus(modal.book, modal.status) : []

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
        <>
          {/* 今日学习卡片 */}
          <div className={styles.todayCard}>
            <div className={styles.todayTitle}>今日学习</div>
            <div className={styles.todayRow}>
              <div className={styles.todayItem}>
                <span className={styles.todayVal} style={{ color: 'var(--accent)' }}>{todayWords.length}</span>
                <span className={styles.todayLbl}>已复习</span>
              </div>
              <div className={styles.todayItem}>
                <span className={styles.todayVal}>{store.dailyLimit}</span>
                <span className={styles.todayLbl}>每日计划</span>
              </div>
              <div className={styles.todayItem}>
                <div className={styles.todayProgress}>
                  <svg viewBox="0 0 36 36" className={styles.todayRing}>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent)" strokeWidth="3"
                      strokeDasharray={`${Math.min(100, (todayWords.length / store.dailyLimit) * 100)}, 100`} strokeLinecap="round" />
                  </svg>
                  <span className={styles.todayRingText}>{Math.min(100, Math.round((todayWords.length / store.dailyLimit) * 100))}%</span>
                </div>
                <span className={styles.todayLbl}>完成率</span>
              </div>
            </div>
            {todayWords.length > 0 && (
              <div className={styles.todayWords}>
                {todayWords.slice(0, 10).map(({ word, book, record }, i) => (
                  <button key={word.id + i} className={`badge ${statusInfo[record.status as LearningStatus]?.badge ?? 'badge-accent'}`} onClick={() => onWordClick(word, book)}>
                    {word.headWord}
                  </button>
                ))}
                {todayWords.length > 10 && <span className={styles.todayMore}>+{todayWords.length - 10}</span>}
              </div>
            )}
          </div>

          {/* 每本词书的统计 */}
          {store.wordBooks.map((book) => {
            const s = store.stats(book)
            const statuses: LearningStatus[] = ['new', 'learning', 'reviewing', 'mastered']

            return (
              <div key={book.id} className={styles.bookCard}>
                <div className={styles.bookHeader}>
                  <span className={styles.bookName}>{book.name}</span>
                  <span className={styles.progressPct} style={{ color: 'var(--accent)' }}>{Math.round(s.progress * 100)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${s.progress * 100}%` }} />
                </div>
                <div className={styles.statsRow}>
                  {statuses.map((status) => {
                    const info = statusInfo[status]
                    const count = s[status as keyof typeof s] as number
                    return (
                      <button key={status} className={styles.statBtn} onClick={() => count > 0 && setModal({ book, status, label: info.label, color: info.color })} disabled={count === 0}>
                        <span className={styles.statVal} style={{ color: info.color }}>{count}</span>
                        <span className={styles.statLbl}>{info.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div className={styles.bookInfo}>
                  <span>&#128196; 共 {s.total} 词</span>
                  <span>&#127991; {book.bookId}</span>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* 单词列表弹窗 */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{modal.book.name} · {modal.label}</span>
              <button className={styles.modalClose} onClick={() => setModal(null)}>&#10005;</button>
            </div>
            <div className={styles.modalBody}>
              {modalWords.map((word) => {
                const trans = word.translations[0]
                return (
                  <button key={word.id} className={styles.modalWord} onClick={() => { setModal(null); onWordClick(word, modal.book) }}>
                    <div>
                      <span className={styles.modalWordName}>{word.headWord}</span>
                      {trans && <span className={styles.modalWordTrans}>{trans.pos ? `${trans.pos} ` : ''}{trans.tranCn}</span>}
                    </div>
                    <span className={styles.modalArrow}>&#8250;</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
