// 预设标签（36个）+ 更多细节字段定义。与 docs/SPEC.md 一致。

export const PRESET_TAGS = [
  '心机', '坏男人', '傲娇', '专情', '反差萌', '能干', '财阀', '执着',
  '追妻火葬场', '非人类', '傲慢', '温柔', '偶像/名人', '双重生活',
  '油嘴滑舌', '年下', '冷酷', '大叔/年上你', '外国人/混血', '直接',
  '冷淡', '三角恋', '契约婚姻', '身份差距', '单恋', '禁忌之恋',
  '一夜情缘', '破镜重圆', '初恋', '职场恋爱', '青梅竹马',
  '爱恨交织/厌恶关系', '权力关系', '命定之恋', '师徒关系', '恋人关系',
] as const

export const MAX_TAGS = 3
export const MAX_NAME_LEN = 8
export const MAX_INTRO_LEN = 200
export const MAX_PERSONALITY_LEN = 200
export const MAX_IMAGES = 1000

export const SPECIES_OPTIONS = [
  { value: 'human', label: '人类', emoji: '☺️' },
  { value: 'elf', label: '精灵', emoji: '🧚' },
  { value: 'beast', label: '兽人', emoji: '🐱' },
  { value: 'animal', label: '动物', emoji: '🐶' },
  { value: 'other', label: '其他', emoji: '👾' },
] as const

export const GENDER_OPTIONS = [
  { value: 'male', label: '男', emoji: '👦' },
  { value: 'female', label: '女', emoji: '👧' },
  { value: 'unknown', label: '未知', emoji: '❓' },
] as const

// 更多细节字段（来自设计稿，含 emoji 前缀）
export const DETAIL_FIELDS = [
  { key: 'birthplace', label: '出生地', emoji: '👶🏻' },
  { key: 'residence', label: '居住地', emoji: '📍' },
  { key: 'occupation', label: '职业', emoji: '💼' },
  { key: 'appearance', label: '外貌', emoji: '🌈' },
  { key: 'language', label: '语言习惯', emoji: '💬' },
  { key: 'dressStyle', label: '穿衣风格', emoji: '🧥' },
  { key: 'socialMode', label: '社交模式', emoji: '🍻' },
  { key: 'loveExpression', label: '表达爱的方式', emoji: '💞' },
  { key: 'values', label: '价值观', emoji: '💎' },
  { key: 'lifestyle', label: '生活习惯', emoji: '🛏' },
  { key: 'hobbies', label: '爱好', emoji: '🍭' },
  { key: 'dislikes', label: '讨厌的东西', emoji: '💣' },
  { key: 'growth', label: '成长经历', emoji: '⛳️' },
  { key: 'family', label: '家庭成员', emoji: '👩‍👩‍👧‍👦' },
  { key: 'relationships', label: '社交关系', emoji: '👭' },
  { key: 'worldview', label: '特殊背景/世界观', emoji: '🧿' },
  { key: 'wishlist', label: '愿望清单', emoji: '💝' },
] as const

export const MAX_DETAIL_LEN = 200

export const INTRO_SECTIONS = [
  { key: 'basic', label: '基础信息', locked: true },
  { key: 'image', label: '形象', locked: true },
  { key: 'details', label: '更多细节', locked: false },
  { key: 'greetings', label: '开场白', locked: false },
] as const

// 介绍页"选择展示内容"清单（来自设计稿）
// locked=true：默认选中且不可取消（名字~性格 共7项）
// locked=false：默认选中但可取消（开场白）
export const INTRO_CONTENT_FIELDS = [
  { key: 'name', label: '名字', locked: true },
  { key: 'tags', label: '标签', locked: true },
  { key: 'species', label: '物种', locked: true },
  { key: 'gender', label: '性别', locked: true },
  { key: 'voice', label: '音色', locked: true },
  { key: 'intro', label: '简介', locked: true },
  { key: 'personality', label: '性格', locked: true },
  { key: 'greetings', label: '开场白', locked: false },
] as const

// 介绍页 UI 模版（首个为默认占位，其余为预设缩略图）
export const INTRO_TEMPLATES = [
  { value: 'none', label: '默认简约风' },
  { value: 'tpl1', label: '模版 1' },
  { value: 'tpl2', label: '模版 2' },
] as const
