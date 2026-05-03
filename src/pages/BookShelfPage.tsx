import { useRef } from 'react'
import { importWordBookFromData } from '../utils'
import type { WordBook } from '../types'
import styles from './BookShelfPage.module.css'

interface Props {
  store: ReturnType<typeof import('../store').useStore>
  onBookClick: (book: WordBook) => void
}

export default function BookShelfPage({ store, onBookClick }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const book = importWordBookFromData(reader.result as string, file.name.replace(/\.json$/i, ''))
        store.addWordBook(book)
      } catch (err: any) {
        alert('导入失败: ' + (err.message || '未知错误'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>我的词书</h1>

      {store.wordBooks.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#128218;</div>
          <div className="title">还没有词书</div>
          <div className="subtitle">导入 JSON 格式的词书文件开始背单词</div>
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>
            导入词书
          </button>
        </div>
      ) : (
        <>
          <div className={styles.actions}>
            <button className="btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
              + 导入词书
            </button>
          </div>
          <div className={styles.list}>
            {store.wordBooks.map((book) => {
              const s = store.stats(book)
              return (
                <div
                  key={book.id}
                  className={`card ${styles.bookCard}`}
                  onClick={() => onBookClick(book)}
                >
                  <div className={styles.bookHeader}>
                    <div>
                      <div className={styles.bookName}>{book.name}</div>
                      <div className={styles.bookCount}>{book.words.length} 个单词</div>
                    </div>
                    <div className={styles.progressRing}>
                      <svg viewBox="0 0 36 36" className={styles.ring}>
                        <path
                          className={styles.ringBg}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="3"
                        />
                        <path
                          className={styles.ringFill}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="3"
                          strokeDasharray={`${s.progress * 100}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className={styles.ringText}>{Math.round(s.progress * 100)}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${s.progress * 100}%` }} />
                  </div>
                  <div className={styles.chips}>
                    <span className="badge badge-blue">{s.new} 新词</span>
                    <span className="badge badge-orange">{s.learning} 学习中</span>
                    <span className="badge badge-green">{s.mastered} 已掌握</span>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); store.deleteWordBook(book) }}
                    title="删除词书"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
    </div>
  )
}
