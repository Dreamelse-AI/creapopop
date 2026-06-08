import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDraftStore } from '@/store/draftStore'
import { useAutoSave } from '@/hooks/useAutoSave'
import { getCharacter, deleteCharacter } from '@/services/characterApi'
import { BasicInfoSection } from '@/components/form/BasicInfoSection'
import { ImageSection } from '@/components/form/ImageSection'
import { DetailsSection } from '@/components/form/DetailsSection'
import { GreetingsSection } from '@/components/form/GreetingsSection'
import { IntroPageSection } from '@/components/form/IntroPageSection'
import { PreviewPanel } from '@/components/preview/PreviewPanel'

type SectionKey = 'basic' | 'image' | 'details' | 'greetings' | 'introPage' | 'dynamic'

const NAV_GROUPS: { title: string; items: { key: SectionKey; label: string; enabled: boolean }[] }[] = [
  {
    title: '角色设定',
    items: [
      { key: 'basic', label: '📝 基本信息', enabled: true },
      { key: 'image', label: '🖼 形象', enabled: true },
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
      { key: 'dynamic', label: '💭 新建动态', enabled: true },
      { key: 'dynamic', label: '💬 历史动态', enabled: false },
    ],
  },
]

export function CharacterFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, setData, reset, saveStatus } = useDraftStore()
  const [active, setActive] = useState<SectionKey>('basic')

  useAutoSave()

  const query = useQuery({
    queryKey: ['character', id],
    queryFn: () => getCharacter(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (query.data?.character) setData(query.data.character)
    return () => reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data])

  if (query.isLoading || !data) {
    return <div className="flex h-full items-center justify-center text-black/40">加载中…</div>
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
    if (!confirm('确定删除该角色？')) return
    await deleteCharacter(data.id)
    navigate('/')
  }

  return (
    <div className="flex h-full bg-[#f7f7f7]">
      {/* 左侧导航 204px */}
      <aside className="flex h-full w-[204px] shrink-0 flex-col border-r border-black/[0.06] bg-white">
        <div className="flex items-center gap-1 p-4 shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.06)]">
          <button onClick={() => navigate('/')} className="flex size-9 items-center justify-center" title="返回">
            <img src="/assets/icon-back.svg" alt="返回" className="h-2 w-3.5 -rotate-90" />
          </button>
          <div className="flex flex-1 flex-col gap-1">
            <span className="font-misans truncate text-[16px] text-black">{data.name || '未命名角色'}</span>
            <SaveIndicator status={saveStatus} />
          </div>
          <button onClick={handleDelete} className="size-6" title="删除">
            <img src="/assets/icon-delete-dark.svg" alt="删除" className="size-full" />
          </button>
        </div>
        {NAV_GROUPS.map((group) => (
          <div
            key={group.title}
            className="flex flex-col py-4 shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.06)]"
          >
            <div className="px-4">
              <p className="p-3 text-sm font-semibold text-black/30">{group.title}</p>
            </div>
            {group.items.map((item) => (
              <button
                key={`${item.key}-${item.label}`}
                onClick={() => item.enabled && setActive(item.key)}
                disabled={!item.enabled}
                className={`relative flex h-[60px] w-full items-center px-10 text-base ${
                  item.enabled ? '' : 'opacity-30'
                }`}
              >
                {active === item.key && (
                  <span className="absolute left-2 right-2 top-2 h-11 rounded-[100px] bg-black/[0.03]" />
                )}
                <span className="relative text-black">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* 中间表单区 */}
      <main className="flex flex-1 justify-center overflow-auto px-4 pt-4">
        {active === 'basic' && <BasicInfoSection />}
        {active === 'image' && <ImageSection />}
        {active === 'details' && <DetailsSection />}
        {active === 'greetings' && <GreetingsSection />}
        {active === 'introPage' && <IntroPageSection />}
        {active === 'dynamic' && (
          <div className="flex w-[600px] items-center justify-center pt-20 text-black/30">
            角色动态功能即将上线
          </div>
        )}
      </main>

      {/* 右侧预览面板 */}
      <PreviewPanel />
    </div>
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
  return <span className="text-xs text-black/30">{text}</span>
}
