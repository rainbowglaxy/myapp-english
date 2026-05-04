// JSON 解析模型（对应词书 JSON 格式）
export interface WordBookJSON {
  wordRank: number
  headWord: string
  content: WordBookContent
  bookId: string
}

export interface WordBookContent {
  word: WordDetail
}

export interface WordDetail {
  wordHead: string
  wordId: string
  content: WordContent
}

export interface WordContent {
  exam?: ExamItem[]
  sentence?: SentenceGroup
  usphone?: string
  ukphone?: string
  ukspeech?: string
  usspeech?: string
  syno?: SynonymGroup
  phrase?: PhraseGroup
  relWord?: RelatedWordGroup
  trans?: Translation[]
}

export interface ExamItem {
  question: string
  answer: ExamAnswer
  examType: number
  choices: Choice[]
}

export interface ExamAnswer {
  explain: string
  rightIndex: number
}

export interface Choice {
  choiceIndex: number
  choice: string
}

export interface SentenceGroup {
  sentences: Sentence[]
  desc?: string
}

export interface Sentence {
  sContent: string
  sCn: string
}

export interface SynonymGroup {
  synos: Synonym[]
  desc?: string
}

export interface Synonym {
  pos: string
  tran: string
  hwds: SynonymWord[]
}

export interface SynonymWord {
  w: string
}

export interface PhraseGroup {
  phrases: Phrase[]
  desc?: string
}

export interface Phrase {
  pContent: string
  pCn: string
}

export interface RelatedWordGroup {
  rels: RelatedWordRel[]
  desc?: string
}

export interface RelatedWordRel {
  pos: string
  words: RelatedWord[]
}

export interface RelatedWord {
  hwd: string
  tran: string
}

export interface Translation {
  tranCn: string
  descOther?: string
  pos?: string
  descCn?: string
  tranOther?: string
}

// App 内部模型
export interface WordBook {
  id: string
  bookId: string
  name: string
  words: Word[]
  createdAt: string
}

export interface Word {
  id: string
  wordId: string
  headWord: string
  wordRank: number
  usphone?: string
  ukphone?: string
  usspeech?: string
  ukspeech?: string
  translations: Translation[]
  sentences: Sentence[]
  phrases: Phrase[]
  synonyms: Synonym[]
  relatedWords: RelatedWordRel[]
  exams: ExamItem[]
}

// 学习记录
export type LearningStatus = 'new' | 'learning' | 'reviewing' | 'mastered'

export interface LearningRecord {
  wordId: string
  bookId: string
  status: LearningStatus
  reviewCount: number
  correctCount: number
  consecutiveCorrect: number  // 连续答对次数
  easeFactor: number          // 难度系数（SM-2 算法，初始 2.5，最低 1.3）
  intervalDays: number        // 当前间隔天数
  lastReviewedAt?: string
  nextReviewAt?: string
}

// 统计
export interface BookStats {
  total: number
  new: number
  learning: number
  reviewing: number
  mastered: number
  progress: number
}
