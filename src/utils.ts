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
  const cleaned = data.replace(/^﻿/, '').trim()

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

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio.load()
    currentAudio = null
  }
}

export function playWordAudio(word: string, accent: 'uk' | 'us' = 'us'): void {
  stopAudio()
  const type = accent === 'uk' ? 1 : 2
  // 每次加时间戳防止浏览器缓存导致无法重播
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}&v=${Date.now()}`
  currentAudio = new Audio()
  currentAudio.src = url
  currentAudio.volume = 1
  currentAudio.load()
  const playPromise = currentAudio.play()
  if (playPromise) {
    playPromise.catch((err) => {
      console.error('播放失败:', word, err)
    })
  }
}

export function playSpeech(speechParam: string): void {
  stopAudio()
  const url = `https://dict.youdao.com/dictvoice?${speechParam}&v=${Date.now()}`
  currentAudio = new Audio()
  currentAudio.src = url
  currentAudio.volume = 1
  currentAudio.load()
  const playPromise = currentAudio.play()
  if (playPromise) {
    playPromise.catch((err) => {
      console.error('播放失败:', speechParam, err)
    })
  }
}

// ===== 基于 SM-2 的间隔重复算法 =====
//
// 状态流转：
//   new → learning → reviewing → mastered
//
// 阶段规则：
//   new: 首次接触，需连续答对 2 次进入 learning
//   learning: 短间隔复习（10分钟→30分钟→1小时），连续答对 5 次进入 reviewing
//   reviewing: 中期间隔（1~7天），连续答对 4 次进入 mastered
//   mastered: 长期间隔（7~90天），答对间隔递增，答错掉回 reviewing
//
// 答错处理：
//   mastered → reviewing（间隔重置为 1 天）
//   reviewing → learning（5 分钟后重试）
//   learning / new → 保持 learning（5 分钟后重试）
//   任意阶段答错都会降低 easeFactor
//
// easeFactor（难度系数）：
//   初始 2.5，答对 +0.1，答错 -0.3，下限 1.3

const MIN_EASE = 1.3
const DEFAULT_EASE = 2.5

export interface SRSResult {
  status: 'new' | 'learning' | 'reviewing' | 'mastered'
  consecutiveCorrect: number
  easeFactor: number
  intervalDays: number
  nextReviewAt: string
}

export function onCorrect(prev: {
  status: string
  consecutiveCorrect: number
  easeFactor: number
  intervalDays: number
}): SRSResult {
  const consecutive = prev.consecutiveCorrect + 1
  const ease = Math.max(MIN_EASE, (prev.easeFactor ?? DEFAULT_EASE) + 0.1)
  const now = Date.now()

  // new → 连续答对 2 次升级为 learning
  if (prev.status === 'new' || prev.status === 'learning') {
    if (consecutive >= 2 && prev.status === 'new') {
      // 升级到 learning，从 10 分钟开始
      return {
        status: 'learning',
        consecutiveCorrect: consecutive,
        easeFactor: ease,
        intervalDays: 0,
        nextReviewAt: new Date(now + 10 * 60 * 1000).toISOString(),
      }
    }
    if (consecutive >= 5 && prev.status === 'learning') {
      // 升级到 reviewing，从 1 天开始
      return {
        status: 'reviewing',
        consecutiveCorrect: consecutive,
        easeFactor: ease,
        intervalDays: 1,
        nextReviewAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      }
    }
    // learning 阶段短间隔递增：10分钟 → 30分钟 → 1小时
    const learningIntervals = [10, 30, 60] // 分钟
    const idx = Math.min(consecutive - 1, learningIntervals.length - 1)
    const minutes = learningIntervals[idx]
    return {
      status: prev.status as 'new' | 'learning',
      consecutiveCorrect: consecutive,
      easeFactor: ease,
      intervalDays: 0,
      nextReviewAt: new Date(now + minutes * 60 * 1000).toISOString(),
    }
  }

  // reviewing → 连续答对 4 次升级为 mastered
  if (prev.status === 'reviewing') {
    if (consecutive >= 4) {
      const days = Math.min(90, Math.max(7, Math.round(prev.intervalDays * 1.5)))
      return {
        status: 'mastered',
        consecutiveCorrect: consecutive,
        easeFactor: ease,
        intervalDays: days,
        nextReviewAt: new Date(now + days * 24 * 60 * 60 * 1000).toISOString(),
      }
    }
    // reviewing 阶段间隔递增（上限 7 天）
    const days = Math.min(7, Math.max(1, Math.round((prev.intervalDays || 1) * ease)))
    return {
      status: 'reviewing',
      consecutiveCorrect: consecutive,
      easeFactor: ease,
      intervalDays: days,
      nextReviewAt: new Date(now + days * 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  // mastered → 间隔递增（上限 90 天）
  {
    const days = Math.min(90, Math.max(7, Math.round(prev.intervalDays * 1.5)))
    return {
      status: 'mastered',
      consecutiveCorrect: consecutive,
      easeFactor: ease,
      intervalDays: days,
      nextReviewAt: new Date(now + days * 24 * 60 * 60 * 1000).toISOString(),
    }
  }
}

export function onWrong(prev: {
  status: string
  consecutiveCorrect: number
  easeFactor: number
  intervalDays: number
}): SRSResult {
  const ease = Math.max(MIN_EASE, (prev.easeFactor ?? DEFAULT_EASE) - 0.3)
  const now = Date.now()

  if (prev.status === 'mastered') {
    // 掉回 reviewing，间隔重置为 1 天
    return {
      status: 'reviewing',
      consecutiveCorrect: 0,
      easeFactor: ease,
      intervalDays: 1,
      nextReviewAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  if (prev.status === 'reviewing') {
    // 掉回 learning，5 分钟后重试
    return {
      status: 'learning',
      consecutiveCorrect: 0,
      easeFactor: ease,
      intervalDays: 0,
      nextReviewAt: new Date(now + 5 * 60 * 1000).toISOString(),
    }
  }

  // new / learning → 保持 learning，5 分钟后重试
  return {
    status: 'learning',
    consecutiveCorrect: 0,
    easeFactor: ease,
    intervalDays: 0,
    nextReviewAt: new Date(now + 5 * 60 * 1000).toISOString(),
  }
}
