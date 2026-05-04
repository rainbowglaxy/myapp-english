import { useEffect } from 'react'
import type { WordBook, Word } from '../types'
import { playWordAudio, playSpeech } from '../utils'
import styles from './WordDetailPage.module.css'

interface Props {
  word: Word
  book: WordBook
  store: ReturnType<typeof import('../store').useStore>
  onBack: () => void
  onMarkAndNext: (known: boolean) => void
  onPrev: () => void
  currentIdx: number
  totalWords: number
}

export default function WordDetailPage({ word, book, store, onBack, onMarkAndNext, onPrev, currentIdx, totalWords }: Props) {
  const rec = store.record(book, word)

  // 自动播放发音
  useEffect(() => {
    playWordAudio(word.headWord)
  }, [word.id])

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button onClick={onBack}>&#8592; 返回</button>
        <span className={styles.navInfo}>{currentIdx} / {totalWords}</span>
        <span />
      </div>

      <div className={styles.header}>
        <h1 className={styles.word} onClick={() => playWordAudio(word.headWord)}>
          {word.headWord}
          <span className={styles.playIcon}>&#128264;</span>
        </h1>
        <div className={styles.phonetics}>
          {word.ukphone && (
            <button className={styles.phoneBtn} onClick={() => word.ukspeech ? playSpeech(word.ukspeech) : playWordAudio(word.headWord, 'uk')}>
              <span className="badge badge-accent">英</span>
              <span>/{word.ukphone}/</span>
              <span style={{ color: 'var(--accent)' }}>&#128264;</span>
            </button>
          )}
          {word.usphone && (
            <button className={styles.phoneBtn} onClick={() => word.usspeech ? playSpeech(word.usspeech) : playWordAudio(word.headWord, 'us')}>
              <span className="badge badge-accent">美</span>
              <span>/{word.usphone}/</span>
              <span style={{ color: 'var(--accent)' }}>&#128264;</span>
            </button>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.unknownBtn} onClick={() => onMarkAndNext(false)}>
            &#128078; 不认识
          </button>
          <button className={styles.knownBtn} onClick={() => onMarkAndNext(true)}>
            &#128077; 认识
          </button>
        </div>

        <div className={styles.recInfo}>
          复习 {rec.reviewCount} 次 · 正确 {rec.correctCount} 次 · 连续正确 {rec.consecutiveCorrect} 次
        </div>
      </div>

      <div className={styles.navRow}>
        <button className={styles.navBtn} onClick={onPrev} disabled={currentIdx <= 1}>
          &#8592; 上一个
        </button>
        <button className={styles.navBtn} onClick={() => onMarkAndNext(true)}>
          下一个 &#8594;
        </button>
      </div>

      {word.translations.length > 0 && (
        <div className="section-card">
          <div className="section-title">释义</div>
          {word.translations.map((t, i) => (
            <div key={i} className={styles.transRow}>
              {t.pos && <span className="badge badge-accent">{t.pos}</span>}
              <div>
                <div>{t.tranCn}</div>
                {t.tranOther && <div className={styles.enDef}>{t.tranOther}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {word.sentences.length > 0 && (
        <div className="section-card">
          <div className="section-title">例句</div>
          {word.sentences.map((s, i) => (
            <div key={i} className={styles.sentence}>
              <div dangerouslySetInnerHTML={{ __html: highlightWord(s.sContent, word.headWord) }} />
              <div className={styles.sentenceCn}>{s.sCn}</div>
              {i < word.sentences.length - 1 && <hr className={styles.divider} />}
            </div>
          ))}
        </div>
      )}

      {word.phrases.length > 0 && (
        <div className="section-card">
          <div className="section-title">短语</div>
          {word.phrases.map((p, i) => (
            <div key={i} className={styles.phraseRow}>
              <span className={styles.phraseContent}>{p.pContent}</span>
              <span className={styles.phraseCn}>{p.pCn}</span>
            </div>
          ))}
        </div>
      )}

      {word.synonyms.length > 0 && (
        <div className="section-card">
          <div className="section-title">同近义词</div>
          {word.synonyms.map((syn, i) => (
            <div key={i} className={styles.synRow}>
              <div>
                <span className="badge badge-purple">{syn.pos}</span>
                <span className={styles.synTran}> {syn.tran}</span>
              </div>
              <div>{syn.hwds.map((h) => h.w).join(' · ')}</div>
            </div>
          ))}
        </div>
      )}

      {word.relatedWords.length > 0 && (
        <div className="section-card">
          <div className="section-title">同根词</div>
          {word.relatedWords.map((group, i) => (
            <div key={i} className={styles.relGroup}>
              <span className="badge badge-orange">{group.pos}</span>
              {group.words.map((w, j) => (
                <div key={j} className={styles.relWord}>
                  <span className={styles.relHwd}>{w.hwd}</span>
                  <span className={styles.relTran}>{w.tran}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function highlightWord(text: string, headWord: string): string {
  const lower = text.toLowerCase()
  const wordLower = headWord.toLowerCase()
  const idx = lower.indexOf(wordLower)
  if (idx === -1) return text
  return text.substring(0, idx) +
    `<strong style="color: var(--accent)">${text.substring(idx, idx + headWord.length)}</strong>` +
    text.substring(idx + headWord.length)
}
