import { useState, useRef, useCallback } from 'react'
import type { WordBook, Word } from '../types'
import { playWordAudio } from '../utils'
import styles from './FlashcardStudyPage.module.css'

interface Props {
  book: WordBook
  words: Word[]
  store: ReturnType<typeof import('../store').useStore>
  onBack: () => void
}

export default function FlashcardStudyPage({ book, words, store, onBack }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [finished, setFinished] = useState(false)
  const dragStartX = useRef(0)

  const currentWord = currentIndex < words.length ? words[currentIndex] : null

  const handleSwipe = useCallback((known: boolean) => {
    if (!currentWord) return
    setSessionTotal((t) => t + 1)
    if (known) {
      setSessionCorrect((c) => c + 1)
      store.markKnown(book, currentWord)
    } else {
      store.markUnknown(book, currentWord)
    }

    const direction = known ? 400 : -400
    setDragX(direction)

    setTimeout(() => {
      setDragX(0)
      setIsFlipped(false)
      if (currentIndex + 1 >= words.length) {
        setFinished(true)
      } else {
        setCurrentIndex((i) => i + 1)
      }
    }, 300)
  }, [currentWord, book, store, currentIndex, words.length])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isFlipped) return
    dragStartX.current = e.clientX
    setIsDragging(true)
  }, [isFlipped])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    setDragX(e.clientX - dragStartX.current)
  }, [isDragging])

  const onPointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    const threshold = 100
    if (dragX > threshold) {
      handleSwipe(true)
    } else if (dragX < -threshold) {
      handleSwipe(false)
    } else {
      setDragX(0)
    }
  }, [isDragging, dragX, handleSwipe])

  if (words.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button onClick={onBack}>&#8592; 返回</button>
          <span>闪卡记忆</span>
          <span />
        </div>
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="subtitle">没有需要复习的单词</div>
        </div>
      </div>
    )
  }

  if (finished) {
    const rate = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button onClick={onBack}>&#8592; 返回</button>
          <span>闪卡记忆</span>
          <span />
        </div>
        <div className={styles.finished}>
          <div className={styles.finishedIcon}>&#11088;</div>
          <h2>本轮学习完成！</h2>
          <p>共 {sessionTotal} 个单词<br />认识 {sessionCorrect} 个，正确率 {rate}%</p>
          <button className="btn-primary" onClick={onBack} style={{ width: '100%' }}>返回</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button onClick={onBack}>&#8592; 返回</button>
        <span>闪卡记忆</span>
        <span />
      </div>

      <div className={styles.progressSection}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(currentIndex / words.length) * 100}%` }} />
        </div>
        <div className={styles.progressInfo}>
          <span>{currentIndex} / {words.length}</span>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>&#10003; {sessionCorrect}</span>
        </div>
      </div>

      <div className={styles.cardArea}>
        {currentWord && (
          <div
            className={`${styles.card} ${isFlipped ? styles.cardFlipped : ''}`}
            style={{
              transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease',
            }}
            onClick={() => {
              if (!isFlipped) {
                setIsFlipped(true)
                playWordAudio(currentWord.headWord)
              }
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {!isFlipped ? (
              <div className={styles.cardFront}>
                <div className={styles.speakerIcon}>&#128264;</div>
                <div className={styles.cardWord}>{currentWord.headWord}</div>
                {currentWord.ukphone && (
                  <div className={styles.cardPhone}>/{currentWord.ukphone}/</div>
                )}
                <div className={styles.cardHint}>点击翻转</div>
              </div>
            ) : (
              <div className={styles.cardBack}>
                <div className={styles.cardBackWord}>{currentWord.headWord}</div>
                <hr />
                <div className={styles.cardBackContent}>
                  {currentWord.translations.map((t, i) => (
                    <div key={i} className={styles.cardTransRow}>
                      {t.pos && <span className="badge badge-accent">{t.pos}</span>}
                      <span>{t.tranCn}</span>
                    </div>
                  ))}
                  {currentWord.sentences[0] && (
                    <>
                      <hr />
                      <div className={styles.cardSentence}>{currentWord.sentences[0].sContent}</div>
                      <div className={styles.cardSentenceCn}>{currentWord.sentences[0].sCn}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!isFlipped ? (
        <div className={styles.hintText}>点击卡片查看释义</div>
      ) : (
        <div className={styles.actionBtns}>
          <button className={styles.noBtn} onClick={() => handleSwipe(false)}>
            <span style={{ fontSize: 24 }}>&#10060;</span>
            <span>不认识</span>
          </button>
          <button className={styles.yesBtn} onClick={() => handleSwipe(true)}>
            <span style={{ fontSize: 24 }}>&#9989;</span>
            <span>认识</span>
          </button>
        </div>
      )}
    </div>
  )
}
