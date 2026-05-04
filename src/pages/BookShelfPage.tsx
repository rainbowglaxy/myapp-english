import { useRef, useState } from 'react'
import { importWordBookFromData } from '../utils'
import type { WordBook, Word } from '../types'
import styles from './BookShelfPage.module.css'

interface Props {
  store: ReturnType<typeof import('../store').useStore>
  onBookClick: (book: WordBook) => void
  onWordClick: (word: Word, book: WordBook) => void
}

export default function BookShelfPage({ store, onBookClick, onWordClick }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [resetBook, setResetBook] = useState<WordBook | null>(null)

  const searchResults = store.searchAllWords(search)

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

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const err = store.importData(reader.result as string)
      if (err) alert(err)
      else alert('导入成功')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>我的词书</h1>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={store.toggleDarkMode} title={store.darkMode ? '亮色模式' : '暗色模式'}>
            {store.darkMode ? '&#9728;' : '&#9790;'}
          </button>
          <button className={styles.iconBtn} onClick={store.exportData} title="导出备份">
            &#8615;
          </button>
          <button className={styles.iconBtn} onClick={() => backupRef.current?.click()} title="导入备份">
            &#8613;
          </button>
        </div>
      </div>

      {/* 全局搜索 */}
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="搜索单词..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.searchClear} onClick={() => setSearch('')}>&#10005;</button>
        )}
      </div>

      {search && (
        <div className={styles.searchResults}>
          {searchResults.length === 0 ? (
            <div className={styles.noResult}>没有找到 "{search}"</div>
          ) : (
            searchResults.map(({ book, word }, i) => {
              const trans = word.translations[0]
              return (
                <button key={word.id + i} className={styles.searchItem}
                  onClick={() => { setSearch(''); onWordClick(word, book) }}>
                  <div>
                    <span className={styles.searchWord}>{word.headWord}</span>
                    {trans && <span className={styles.searchTrans}>{trans.pos ? `${trans.pos} ` : ''}{trans.tranCn}</span>}
                  </div>
                  <span className={styles.searchBook}>{book.name}</span>
                </button>
              )
            })
          )}
        </div>
      )}

      {!search && (
        <>
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
                              fill="none" stroke="#e5e7eb" strokeWidth="3"
                            />
                            <path
                              className={styles.ringFill}
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none" stroke="var(--accent)" strokeWidth="3"
                              strokeDasharray={`${s.progress * 100}, 100`} strokeLinecap="round"
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
                      <div className={styles.bookActions}>
                        <button
                          className={styles.resetBtn}
                          onClick={(e) => { e.stopPropagation(); setResetBook(book) }}
                          title="重置进度"
                        >
                          &#8635; 重置
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={(e) => { e.stopPropagation(); store.deleteWordBook(book) }}
                          title="删除词书"
                        >
                          &#10005;
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
      <input ref={backupRef} type="file" accept=".json" onChange={handleBackupImport} style={{ display: 'none' }} />

      {/* 重置确认弹窗 */}
      {resetBook && (
        <div className={styles.overlay} onClick={() => setResetBook(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>重置学习进度</div>
            <div className={styles.modalText}>
              确定要重置「{resetBook.name}」的所有学习记录吗？<br />
              此操作不可撤销。
            </div>
            <div className={styles.modalBtns}>
              <button className="btn-secondary" onClick={() => setResetBook(null)}>取消</button>
              <button className={styles.confirmResetBtn} onClick={() => { store.resetBookProgress(resetBook); setResetBook(null) }}>
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
