import type { PromptLocale, PromptVars } from './types'
import { template as koTemplate } from './templates/ko'
import { template as zhTemplate } from './templates/zh'
import type { Character } from '@/types/character'

const templates: Record<PromptLocale, string> = {
  ko: koTemplate,
  zh: zhTemplate,
  ja: '', // TODO: 후续 추가
  en: '', // TODO: 후续 추가
}

/**
 * 从角色数据提取提示词变量，缺失字段返回空字符串
 */
export function extractPromptVars(c: Character): PromptVars {
  const d = c.details
  return {
    name: c.name || '未命名',
    gender: c.gender === 'male' ? '男' : c.gender === 'female' ? '女' : '未知',
    age: d.age || '',
    birthday: d.birthday || '',
    zodiac: d.zodiac || '',
    mbti: d.mbti || '',
    blood_type: d.bloodType || '',
    height: d.height || '',
    hometown: d.birthplace || '',
    residence: d.residence || '',
    social_status: d.occupation || '',
    speech_style: d.language || '',
    love_style: d.loveExpression || '',
    personality: c.personality || '',
    hidden_side: d.hiddenSide || '',
    life_details: d.lifestyle || '',
    likes: d.hobbies || '',
    fears: d.dislikes || '',
    current_state: d.currentState || '',
    wishlist: d.wishlist || '',
    trending_slang: d.trendingSlang || '',
  }
}

/**
 * 将模板中的 {{key}} 占位符替换为实际值
 * 如果值为空，整行或该段落会被清理掉
 */
function fillTemplate(tpl: string, vars: PromptVars): string {
  let result = tpl
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '')
  }
  // 清理空值残留：移除包含连续逗号或空信息段的行不美观部分
  result = result.replace(/, ,/g, ',').replace(/,\s*,/g, ',')
  return result
}

/**
 * 构建完整的聊天系统提示词
 * @param character 角色数据
 * @param locale 目标语言
 * @returns 填充好的 system prompt 字符串
 */
export function buildChatPrompt(character: Character, locale: PromptLocale = 'ko'): string {
  const tpl = templates[locale]
  if (!tpl) {
    throw new Error(`Prompt template for locale "${locale}" is not available yet`)
  }
  const vars = extractPromptVars(character)
  return fillTemplate(tpl, vars)
}
