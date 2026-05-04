import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from './lib/auth'
import { useStore } from './store'
import type { WordBook, Word } from './types'
import AuthPage from './components/AuthPage'
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
  | { type: 'wordDetail'; word: Word; book: WordBook; words: Word[] }
  | { type: 'flashcard'; book: WordBook; words: Word[] }
  | { type: 'quiz'; book: WordBook; words: Word[] }

function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const store = useStore(user?.id ?? null)
  const [tab, setTab] = useState<Tab>('books')
  const [page, setPage] = useState<Page>({ type: 'tab' })
  const [tabBarHidden, setTabBarHidden] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const goBack = () => setPage({ type: 'tab' })

  const openWordDetail = useCallback((word: Word, book: WordBook, words: Word[]) => {
    setPage({ type: 'wordDetail', word, book, words })
  }, [])

  // Hide tab bar on scroll down, show on scroll up
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let lastY = 0
    const onScroll = () => {
      const y = el.scrollTop
      if (y > lastY && y > 60) setTabBarHidden(true)
      else if (y < lastY - 10) setTabBarHidden(false)
      lastY = y
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [tab])

  // Reset scroll hide when switching tabs
  useEffect(() => { setTabBarHidden(false) }, [tab])

  // Auth loading
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        加载中...
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return <AuthPage />
  }

  // Logged in - store not yet hydrated from Supabase
  if (!store.hydrated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-secondary)' }}>
        同步数据中...
      </div>
    )
  }

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
    const idx = page.words.indexOf(page.word)

    // 标记认识并跳到下一个
    const markAndNext = (known: boolean) => {
      if (known) {
        store.markKnown(page.book, page.word)
      } else {
        store.markUnknown(page.book, page.word)
      }
      if (idx >= 0 && idx + 1 < page.words.length) {
        setPage({ ...page, word: page.words[idx + 1] })
      } else {
        goBack()
      }
    }

    const goPrev = () => {
      if (idx > 0) {
        setPage({ ...page, word: page.words[idx - 1] })
      }
    }

    return (
      <WordDetailPage
        word={page.word}
        book={page.book}
        store={store}
        onBack={goBack}
        onMarkAndNext={markAndNext}
        onPrev={goPrev}
        currentIdx={idx + 1}
        totalWords={page.words.length}
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
      <div className="tab-content" ref={scrollRef}>
        {tab === 'books' && (
          <BookShelfPage
            store={store}
            onBookClick={(book) => setPage({ type: 'bookDetail', book })}
            onWordClick={(word, book) => openWordDetail(word, book, book.words)}
          />
        )}
        {tab === 'today' && (
          <TodayPage
            store={store}
            onStudy={(book, words) => setPage({ type: 'flashcard', book, words })}
            onWordClick={(word, book, words) => openWordDetail(word, book, words)}
          />
        )}
        {tab === 'stats' && (
          <StatsPage
            store={store}
            onWordClick={(word, book, words) => openWordDetail(word, book, words)}
          />
        )}
      </div>
      <nav className={`tab-bar${tabBarHidden ? ' tab-bar-hidden' : ''}`}>
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
        <button onClick={signOut} style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '8px 0 6px' }}>
          <span className="tab-icon">&#128682;</span>
          <span>退出</span>
        </button>
      </nav>
    </>
  )
}

export default App
