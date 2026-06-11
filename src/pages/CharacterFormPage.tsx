import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDraftStore } from '@/store/draftStore'
import { useCreationTaskStore } from '@/store/creationTaskStore'
import { useAutoSave } from '@/hooks/useAutoSave'
import { getCharacter, deleteCharacter } from '@/services/characterApi'
import { loadIntroState, saveIntroState, clearIntroState } from '@/services/introPersist'
import { Spinner, FullscreenLoading } from '@/components/ui/primitives'
import { BasicInfoSection } from '@/components/form/BasicInfoSection'
import { ImageSection } from '@/components/form/ImageSection'
import { DetailsSection } from '@/components/form/DetailsSection'
import { GreetingsSection } from '@/components/form/GreetingsSection'
import { IntroPageSection } from '@/components/form/IntroPageSection'
import { DynamicSection } from '@/components/form/DynamicSection'
import { DynamicHistorySection } from '@/components/form/DynamicHistorySection'
import { PreviewPanel } from '@/components/preview/PreviewPanel'

type SectionKey = 'basic' | 'image' | 'details' | 'greetings' | 'introPage' | 'dynamicNew' | 'dynamicHistory'

const SECTION_KEYS: SectionKey[] = ['basic', 'image', 'details', 'greetings', 'introPage', 'dynamicNew', 'dynamicHistory']

// required=true：发布必填项，tab 名右侧显示星号
const NAV_GROUPS: { title: string; items: { key: SectionKey; label: string; enabled: boolean; required?: boolean }[] }[] = [
  {
    title: '角色设定',
    items: [
      { key: 'basic', label: '📝 基本信息', enabled: true, required: true },
      { key: 'image', label: '🖼 形象', enabled: true, required: true },
      { key: 'details', label: '📓 更多细节', enabled: true },
      { key: 'greetings', label: '💬 开场白', enabled: true },
    ],
  },
  {
    title: '角色美化',
    items: [{ key: 'introPage', label: '🎨 介绍页美化', enabled: true }],
  },
  {
    title: '角色发帖',
    items: [
      { key: 'dynamicNew', label: '💭 新建动态', enabled: true },
      { key: 'dynamicHistory', label: '💬 历史动态', enabled: true },
    ],
  },
]

export function CharacterFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data, setData, reset, saveStatus } = useDraftStore()
  // 初始定位：URL ?tab= 指定（已发布卡片「编辑」→basic，「动态」→dynamicNew）
  const initialTab = params.get('tab')
  const [active, setActive] = useState<SectionKey>(
    initialTab && SECTION_KEYS.includes(initialTab as SectionKey) ? (initialTab as SectionKey) : 'basic',
  )
  const [deleting, setDeleting] = useState(false)

  useAutoSave()

  const query = useQuery({
    queryKey: ['character', id],
    queryFn: () => getCharacter(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (query.data?.character) {
      const char = query.data.character
      // Arca 契约不含 introPage，列表返回的是占位值；用本地持久化覆盖恢复
      const persisted = loadIntroState(char.id)
      const merged = persisted?.introPage
        ? { ...char, introPage: { ...char.introPage, ...persisted.introPage } }
        : char
      setData(merged)
    }
    return () => reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data])

  // introPage 变化写回本地持久化（覆盖左栏勾选/模板等走 draftStore.patch 的改动）
  useEffect(() => {
    if (data?.id) saveIntroState(data.id, { introPage: data.introPage })
  }, [data?.id, data?.introPage])

  // 进行中任务按角色作用域：切到不同角色才清空（同角色内切导航/收起预览不丢）
  useEffect(() => {
    if (id) useCreationTaskStore.getState().ensureScope(id)
  }, [id])

  if (query.isLoading || !data) {
    return <FullscreenLoading />
  }
  if (query.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p>加载失败</p>
        <button onClick={() => query.refetch()} className="rounded-[100px] bg-black px-4 py-1.5 text-white">
          重试
        </button>
      </div>
    )
  }

  const handleDelete = async () => {
    if (deleting) return
    if (!confirm('确定删除该角色？')) return
    setDeleting(true)
    try {
      await deleteCharacter(data.id)
      clearIntroState(data.id)
      navigate('/')
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#f7f7f7]">
      {/* 左侧导航 204px */}
      <aside className="flex h-full w-[204px] shrink-0 flex-col overflow-auto border-r border-black/[0.06] bg-white">
        <div className="flex items-center gap-1 p-4 shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.06)]">
          <button onClick={() => navigate('/')} className="flex size-9 items-center justify-center" title="返回">
            <img src="/assets/icon-back.svg" alt="返回" className="h-2 w-3.5 rotate-90" />
          </button>
          <div className="flex flex-1 flex-col gap-1">
            <span className="font-misans truncate text-[16px] text-black">{data.name || '未命名角色'}</span>
            <SaveIndicator status={saveStatus} />
          </div>
          <button onClick={handleDelete} disabled={deleting} className="flex size-6 items-center justify-center disabled:opacity-60" title="删除">
            {deleting ? (
              <Spinner size={16} className="text-black/40" />
            ) : (
              <img src="/assets/icon-delete-dark.svg" alt="删除" className="size-full" />
            )}
          </button>
        </div>
        {NAV_GROUPS.map((group) => (
          <div
            key={group.title}
            className="flex flex-col py-4 shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.06)]"
          >
            <div className="px-4">
              <p className="p-3 font-misans-medium text-[14px] text-black/30">{group.title}</p>
            </div>
            {group.items.map((item) => {
              // 历史动态：无内容时置灰禁用（不进入空态页）
              const enabled =
                item.key === 'dynamicHistory' ? data.dynamics.length > 0 : item.enabled
              return (
              <button
                key={`${item.key}-${item.label}`}
                onClick={() => enabled && setActive(item.key)}
                disabled={!enabled}
                className={`relative flex h-[60px] w-full items-center px-10 ${
                  enabled ? '' : 'opacity-30'
                }`}
              >
                {active === item.key && (
                  <span className="absolute left-2 right-2 top-2 h-11 rounded-[100px] bg-black/[0.03]" />
                )}
                <span className="font-misans relative flex items-center gap-0.5 text-[16px] text-black">
                  {item.label}
                  {item.required && <RequiredStar />}
                </span>
              </button>
              )
            })}
          </div>
        ))}
      </aside>

      {/* 中间表单区（区域内滚动，底部 30px 安全间距）。
          介绍页是三栏满高布局，自管内部滚动，不套纵向滚动外壳。 */}
      {active === 'introPage' ? (
        <main className="flex min-h-0 flex-1 justify-center overflow-hidden px-4 pt-4">
          <IntroPageSection />
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 pt-4">
          <div className="pb-[30px]">
            {active === 'basic' && <BasicInfoSection />}
            {active === 'image' && <ImageSection />}
            {active === 'details' && <DetailsSection />}
            {active === 'greetings' && <GreetingsSection />}
            {active === 'dynamicNew' && <DynamicSection />}
            {active === 'dynamicHistory' && <DynamicHistorySection />}
          </div>
        </main>
      )}

      {/* 右侧预览面板 */}
      <PreviewPanel />
    </div>
  )
}

// 必填标记星号（设计稿 intro-star 形状），染成强调红
function RequiredStar() {
  return (
    <span className="ml-0.5 inline-flex size-2.5 shrink-0 items-center justify-center" title="必填">
      <svg viewBox="0 0 16.5488 16.5488" className="size-full" fill="#ff3c00">
        <path d="M6.78597 2.04834C7.24974 0.872449 7.48162 0.284505 7.81434 0.112108C8.10283 -0.0373692 8.44596 -0.0373692 8.73444 0.112108C9.06717 0.284505 9.29905 0.87245 9.76282 2.04834L10.083 2.86019C10.4588 3.81311 10.6467 4.28957 10.9345 4.69133C11.1895 5.04745 11.5013 5.35926 11.8575 5.61431C12.2592 5.90204 12.7357 6.08996 13.6886 6.46578L14.5004 6.78597C15.6763 7.24974 16.2643 7.48162 16.4367 7.81434C16.5862 8.10283 16.5862 8.44596 16.4367 8.73444C16.2643 9.06717 15.6763 9.29905 14.5004 9.76282L13.6886 10.083C12.7357 10.4588 12.2592 10.6467 11.8575 10.9345C11.5013 11.1895 11.1895 11.5013 10.9345 11.8575C10.6467 12.2592 10.4588 12.7357 10.083 13.6886L9.76282 14.5004C9.29905 15.6763 9.06717 16.2643 8.73444 16.4367C8.44596 16.5862 8.10283 16.5862 7.81434 16.4367C7.48162 16.2643 7.24973 15.6763 6.78597 14.5004L6.46578 13.6886C6.08996 12.7357 5.90204 12.2592 5.61431 11.8575C5.35926 11.5013 5.04745 11.1895 4.69133 10.9345C4.28957 10.6467 3.81311 10.4588 2.86019 10.083L2.04834 9.76282C0.872449 9.29905 0.284505 9.06717 0.112108 8.73444C-0.0373692 8.44596 -0.0373692 8.10283 0.112108 7.81434C0.284505 7.48162 0.87245 7.24973 2.04834 6.78597L2.86019 6.46578C3.81311 6.08996 4.28957 5.90204 4.69133 5.61431C5.04745 5.35926 5.35926 5.04745 5.61431 4.69133C5.90204 4.28957 6.08996 3.81311 6.46578 2.86019L6.78597 2.04834Z" />
      </svg>
    </span>
  )
}

function SaveIndicator({ status }: { status: string }) {
  const text =
    status === 'saving'
      ? '保存中…'
      : status === 'saved'
        ? '已保存'
        : status === 'error'
          ? '保存失败'
          : '实时保存'
  return (
    <span className="font-misans flex items-center gap-1 text-[12px] text-black/30">
      {status === 'saving' && <Spinner size={10} className="text-black/30" />}
      {text}
    </span>
  )
}
