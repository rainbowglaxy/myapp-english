import { useState, useEffect, useMemo } from 'react'
import type { WordBook, Word } from '../types'
import styles from './QuizStudyPage.module.css'

interface Props {
  book: WordBook
  words: Word[]
  store: ReturnType<typeof import('../store').useStore>
  onBack: () => void
}

interface QuizItem {
  word: Word
  question: string
  choices: string[]
  correctIndex: number
  explain: string
}

const LABELS = ['A', 'B', 'C', 'D']

function buildQuizItems(words: Word[], ordered: boolean): QuizItem[] {
  const items: QuizItem[] = []

  for (const word of words) {
    if (word.exams.length > 0 && word.exams[0].choices.length >= 2) {
      const exam = word.exams[0]
      items.push({
        word,
        question: exam.question,
        choices: exam.choices.map((c) => c.choice),
        correctIndex: exam.answer.rightIndex - 1,
        explain: exam.answer.explain,
      })
    } else {
      const wrongChoices = words
        .filter((w) => w.id !== word.id && w.translations.length > 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.headWord)

      const allChoices = [...wrongChoices, word.headWord].sort(() => Math.random() - 0.5)
      const correctIdx = allChoices.indexOf(word.headWord)
      const translation = word.translations[0]?.tranCn ?? ''

      items.push({
        word,
        question: `下面哪个单词的意思是：${translation}`,
        choices: allChoices,
        correctIndex: correctIdx,
        explain: `${word.headWord}：${translation}`,
      })
    }
  }

  return ordered ? items : items.sort(() => Math.random() - 0.5)
}

export default function QuizStudyPage({ book, words, store, onBack }: Props) {
  const [ordered, setOrdered] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [finished, setFinished] = useState(false)

  const quizItems = useMemo(() => buildQuizItems(words, ordered), [words, ordered])
  const item = currentIndex < quizItems.length ? quizItems[currentIndex] : null

  const handleChoice = (index: number) => {
    if (showResult || !item) return
    setSelectedChoice(index)
    setShowResult(true)
    if (index === item.correctIndex) {
      setSessionCorrect((c) => c + 1)
      store.markKnown(book, item.word)
    } else {
      store.markUnknown(book, item.word)
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 >= quizItems.length) {
      setFinished(true)
    } else {
      setCurrentIndex((i) => i + 1)
      setSelectedChoice(null)
      setShowResult(false)
    }
  }

  if (quizItems.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button onClick={onBack}>&#8592; 返回</button>
          <span>选择题测试</span>
          <span />
        </div>
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="subtitle">没有需要测试的单词</div>
        </div>
      </div>
    )
  }

  if (finished) {
    const total = quizItems.length
    const rate = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button onClick={onBack}>&#8592; 返回</button>
          <span>选择题测试</span>
          <span />
        </div>
        <div className={styles.finished}>
          <div className={styles.finishedIcon}>
            {rate >= 80 ? '&#127942;' : rate >= 60 ? '&#11088;' : '&#8635;'}
          </div>
          <h2>测试完成！</h2>
          <p>共 {total} 题，答对 {sessionCorrect} 题</p>
          <div className={styles.rate} style={{ color: rate >= 80 ? 'var(--green)' : rate >= 60 ? 'var(--orange)' : 'var(--red)' }}>
            正确率 {rate}%
          </div>
          <button className="btn-primary" onClick={onBack} style={{ width: '100%' }}>返回</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button onClick={onBack}>&#8592; 返回</button>
        <span>选择题测试</span>
        <button onClick={() => setOrdered(!ordered)} style={{ fontSize: 12, color: 'var(--accent)' }}>
          {ordered ? '&#8593;&#8595; 顺序' : '&#10051; 乱序'}
        </button>
      </div>

      <div className={styles.progressInfo}>
        <span>{currentIndex + 1} / {quizItems.length}</span>
        <span style={{ color: 'var(--green)', fontWeight: 600 }}>&#10003; {sessionCorrect}</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 20 }}>
        <div className="progress-fill" style={{ width: `${(currentIndex / quizItems.length) * 100}%` }} />
      </div>

      {item && (
        <div className={styles.quizArea}>
          <div className={styles.questionCard}>
            <div className={styles.qIndex}>第 {currentIndex + 1} 题</div>
            <div className={styles.qText}>{item.question}</div>
          </div>

          <div className={styles.choices}>
            {item.choices.map((choice, idx) => {
              let cls = styles.choiceBtn
              if (showResult) {
                if (idx === item.correctIndex) cls += ' ' + styles.choiceCorrect
                else if (idx === selectedChoice) cls += ' ' + styles.choiceWrong
              } else if (idx === selectedChoice) {
                cls += ' ' + styles.choiceSelected
              }
              return (
                <button
                  key={idx}
                  className={cls}
                  onClick={() => handleChoice(idx)}
                  disabled={showResult}
                >
                  <span className={styles.choiceLabel}>{LABELS[idx] ?? idx + 1}.</span>
                  <span className={styles.choiceText}>{choice}</span>
                  {showResult && idx === item.correctIndex && <span className={styles.choiceIcon}>&#9989;</span>}
                  {showResult && idx === selectedChoice && idx !== item.correctIndex && <span className={styles.choiceIcon}>&#10060;</span>}
                </button>
              )
            })}
          </div>

          {showResult && (
            <>
              <div className={styles.explainCard}>
                <div className={styles.explainTitle}>解析</div>
                <div className={styles.explainText}>{item.explain}</div>
              </div>
              <button className="btn-primary" onClick={handleNext} style={{ width: '100%' }}>
                {currentIndex + 1 >= quizItems.length ? '查看结果' : '下一题'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
