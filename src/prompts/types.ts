export type PromptLocale = 'ko' | 'zh' | 'ja' | 'en'

export interface MessageItem {
  type: 'text' | 'voice' | 'sticker' | 'image' | 'state_update' | 'html_file'
  data: Record<string, string>
}

export interface PromptVars {
  name: string
  gender: string
  age: string
  birthday: string
  zodiac: string
  mbti: string
  blood_type: string
  height: string
  hometown: string
  residence: string
  social_status: string
  speech_style: string
  love_style: string
  personality: string
  hidden_side: string
  life_details: string
  likes: string
  fears: string
  current_state: string
  wishlist: string
  trending_slang: string
}
