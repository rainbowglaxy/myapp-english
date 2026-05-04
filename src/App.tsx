import { useState } from 'react'
import { useStore } from './store'
import type { WordBook, Word } from './types'
import BookShelfPage from './pages/BookShelfPage'
import BookDetailPage from './pages/BookDetailPage'
import WordDetailPage from './pages/WordDetailPage'
import FlashcardStudyPage from './pages/FlashcardStudyPage'
import QuizStudyPage from './pages/QuizStudyPage'
import TodayPage from './pages/TodayPage'
import StatsPage from './pages/StatsPage'

type Tab = 'books' | 'today' | 'stats'
type Page =
  | { type: 'tab' }
  | { type: 'bookDetail'; book: WordBook }
  | { type: 'wordDetail'; word: Word; book: WordBook; words?: Word[] }
  | { type: 'flashcard'; book: WordBook; words: Word[] }
  | { type: 'quiz'; book: WordBook; words: Word[] }

function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('books')
  const [page, setPage] = useState<Page>({ type: 'tab' })

  const goBack = () => setPage({ type: 'tab' })

  const openWordDetail = (word: Word, book: WordBook, words?: Word[]) => {
    setPage({ type: 'wordDetail', word, book, words })
  }

  const nextWord = page.type === 'wordDetail' && page.words
    ? () => {
        const idx = page.words!.indexOf(page.word)
        if (idx >= 0 && idx + 1 < page.words!.length) {
          setPage({ ...page, word: page.words![idx + 1] })
        } else {
          goBack()
        }
      }
    : undefined

  const prevWord = page.type === 'wordDetail' && page.words
    ? () => {
        const idx = page.words!.indexOf(page.word)
        if (idx > 0) {
          setPage({ ...page, word: page.words![idx - 1] })
        }
      }
    : undefined

  if (page.type === 'bookDetail') {
    const reviewWords = store.wordsToReview(page.book)
    return (
      <BookDetailPage
        book={page.book}
        store={store}
        onBack={goBack}
        onWordClick={(word) => openWordDetail(word, page.book, reviewWords)}
        onStartFlashcard={(words) => setPage({ type: 'flashcard', book: page.book, words })}
        onStartQuiz={(words) => setPage({ type: 'quiz', book: page.book, words })}
      />
    )
  }

  if (page.type === 'wordDetail') {
    return (
      <WordDetailPage
        word={page.word}
        book={page.book}
        store={store}
        onBack={goBack}
        onNext={nextWord}
        onPrev={prevWord}
        hasNav={!!page.words}
        currentIdx={page.words ? page.words.indexOf(page.word) + 1 : undefined}
        totalWords={page.words?.length}
      />
    )
  }

  if (page.type === 'flashcard') {
    return <FlashcardStudyPage book={page.book} words={page.words} store={store} onBack={goBack} />
  }

  if (page.type === 'quiz') {
    return <QuizStudyPage book={page.book} words={page.words} store={store} onBack={goBack} />
  }

  return (
    <>
      <div className="tab-content">
        {tab === 'books' && (
          <BookShelfPage
            store={store}
            onBookClick={(book) => setPage({ type: 'bookDetail', book })}
          />
        )}
        {tab === 'today' && (
          <TodayPage
            store={store}
            onStudy={(book, words) => setPage({ type: 'flashcard', book, words })}
            onWordClick={(word, book) => {
              const dueWords = store.wordsToReview(book)
              openWordDetail(word, book, dueWords)
            }}
          />
        )}
        {tab === 'stats' && (
          <StatsPage
            store={store}
            onWordClick={(word, book) => openWordDetail(word, book)}
          />
        )}
      </div>
      <nav className="tab-bar">
        <button className={tab === 'books' ? 'active' : ''} onClick={() => setTab('books')}>
          <span className="tab-icon">&#128218;</span>
          <span>词书</span>
        </button>
        <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>
          <span className="tab-icon">&#11088;</span>
          <span>今日学习</span>
        </button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
          <span className="tab-icon">&#128202;</span>
          <span>统计</span>
        </button>
      </nav>
    </>
  )
}

export default App
