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
  | { type: 'wordDetail'; word: Word; book: WordBook }
  | { type: 'flashcard'; book: WordBook; words: Word[] }
  | { type: 'quiz'; book: WordBook; words: Word[] }

function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('books')
  const [page, setPage] = useState<Page>({ type: 'tab' })

  const goBack = () => setPage({ type: 'tab' })

  if (page.type === 'bookDetail') {
    return (
      <BookDetailPage
        book={page.book}
        store={store}
        onBack={goBack}
        onWordClick={(word) => setPage({ type: 'wordDetail', word, book: page.book })}
        onStartFlashcard={(words) => setPage({ type: 'flashcard', book: page.book, words })}
        onStartQuiz={(words) => setPage({ type: 'quiz', book: page.book, words })}
      />
    )
  }

  if (page.type === 'wordDetail') {
    return <WordDetailPage word={page.word} book={page.book} store={store} onBack={goBack} />
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
          />
        )}
        {tab === 'stats' && <StatsPage store={store} />}
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
