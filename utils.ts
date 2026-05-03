import type { WordBookJSON, WordBook, Word } from './types'

// 生成 UUID
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 把多个拼接的 JSON 对象字符串解析成数组
// 支持三种格式：
//   1. 标准数组：[{...},{...}]
//   2. 单个对象：{...}
//   3. 拼接对象：{...}{...}{...}
function parseFlexibleJSON(data: string): WordBookJSON[] {
  const cleaned = data.replace(/^\uFEFF/, '').trim()

  // 先尝试标准 JSON 解析
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    // 标准解析失败，尝试拆分拼接的对象
  }

  // 逐字符扫描，按括号深度切割出每个独立 JSON 对象
  const objects: WordBookJSON[] = []
  let depth = 0
  let start = -1

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        const chunk = cleaned.slice(start, i + 1)
        try {
          objects.push(JSON.parse(chunk))
        } catch (e) {
          throw new Error(`第 ${objects.length + 1} 个单词解析失败: ${(e as Error).message}`)
        }
        start = -1
      }
    }
  }

  if (objects.length === 0) {
    throw new Error('未找到有效的 JSON 数据')
  }

  return objects
}

// 从 JSON 数据导入词书
export function importWordBookFromData(data: string, bookName?: string): WordBook {
  let entries: WordBookJSON[]
  try {
    entries = parseFlexibleJSON(data)
  } catch (e) {
    throw new Error(`JSON Parse error: ${(e as Error).message}`)
  }

  if (entries.length === 0) {
    throw new Error('文件为空')
  }

  const words: Word[] = entries.map((json) => {
    const c = json.content.word.content
    return {
      id: uuid(),
      wordId: json.content.word.wordId,
      headWord: json.headWord,
      wordRank: json.wordRank,
      usphone: c.usphone,
      ukphone: c.ukphone,
      usspeech: c.usspeech,
      ukspeech: c.ukspeech,
      translations: c.trans ?? [],
      sentences: c.sentence?.sentences ?? [],
      phrases: c.phrase?.phrases ?? [],
      synonyms: c.syno?.synos ?? [],
      relatedWords: c.relWord?.rels ?? [],
      exams: c.exam ?? [],
    }
  })

  const bookId = entries[0].bookId ?? uuid()
  const name = bookName ?? bookId

  return {
    id: uuid(),
    bookId,
    name,
    words,
    createdAt: new Date().toISOString(),
  }
}

// 播放发音
let currentAudio: HTMLAudioElement | null = null

export function playWordAudio(word: string, accent: 'uk' | 'us' = 'us'): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  const type = accent === 'uk' ? 1 : 2
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`
  currentAudio = new Audio(url)
  currentAudio.play().catch(() => {})
}

export function playSpeech(speechParam: string): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  const url = `https://dict.youdao.com/dictvoice?${speechParam}`
  currentAudio = new Audio(url)
  currentAudio.play().catch(() => {})
}

// 间隔复习算法
export function nextReviewDate(correctCount: number): string {
  const intervals = [
    60 * 10,           // 10分钟
    60 * 60,           // 1小时
    60 * 60 * 24,      // 1天
    60 * 60 * 24 * 3,  // 3天
    60 * 60 * 24 * 7,  // 7天
  ]
  const idx = Math.min(correctCount - 1, intervals.length - 1)
  const interval = intervals[Math.max(0, idx)]
  return new Date(Date.now() + interval * 1000).toISOString()
}

// 5分钟后再复习
export function fiveMinutesLater(): string {
  return new Date(Date.now() + 300 * 1000).toISOString()
}
