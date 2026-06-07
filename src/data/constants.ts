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
export const MAX_IMAGES = 9

export const SPECIES_OPTIONS = [
  { value: 'human', label: '人类' },
  { value: 'elf', label: '精灵' },
  { value: 'beast', label: '兽人' },
  { value: 'animal', label: '动物' },
  { value: 'other', label: '其他' },
] as const

export const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' },
] as const

// 更多细节字段（来自框架图）
export const DETAIL_FIELDS = [
  { key: 'birthplace', label: '出生地' },
  { key: 'residence', label: '居住地' },
  { key: 'occupation', label: '职业' },
  { key: 'appearance', label: '外观' },
  { key: 'language', label: '语言习惯' },
  { key: 'dressStyle', label: '穿衣风格' },
  { key: 'socialMode', label: '社交模式' },
  { key: 'loveExpression', label: '表达爱的方式' },
  { key: 'values', label: '价值观' },
  { key: 'lifestyle', label: '生活习惯' },
  { key: 'hobbies', label: '爱好' },
  { key: 'dislikes', label: '讨厌的东西' },
  { key: 'growth', label: '成长经历' },
  { key: 'family', label: '家庭成员' },
  { key: 'relationships', label: '社交关系' },
  { key: 'worldview', label: '特殊背景/世界观' },
  { key: 'wishlist', label: '愿望清单' },
] as const

export const INTRO_SECTIONS = [
  { key: 'basic', label: '基础信息', locked: true },
  { key: 'image', label: '形象', locked: true },
  { key: 'details', label: '更多细节', locked: false },
  { key: 'greetings', label: '开场白', locked: false },
] as const
