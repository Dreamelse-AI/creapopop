import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CharacterCard } from '@/components/character/CharacterCard'
import {
  deleteCharacter,
  listCharacters,
  publishCharacter,
} from '@/services/characterApi'
import { Spinner } from '@/components/ui/primitives'

type Tab = 'draft' | 'published'

export function AllCharactersPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const qc = useQueryClient()
  const tab: Tab = params.get('tab') === 'published' ? 'published' : 'draft'

  const { data, isLoading } = useQuery({
    queryKey: ['characters', tab],
    queryFn: () => listCharacters(tab),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  })

  const publishMut = useMutation({
    mutationFn: (id: string) => publishCharacter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  })

  const list = data?.characters ?? []

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f7f7]">
      {/* 顶栏 */}
      <header className="flex h-[56px] shrink-0 items-center gap-3 px-5">
        <button
          onClick={() => navigate('/')}
          className="flex size-8 items-center justify-center rounded-full transition hover:bg-black/5"
          title="返回"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-misans-bold text-[18px] text-black">
          {tab === 'draft' ? '草稿箱' : '已发布'}
        </h1>
      </header>

      {/* Tab 切换 */}
      <div className="flex gap-2 px-5 pb-3">
        <button
          onClick={() => setParams({ tab: 'draft' })}
          className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition ${
            tab === 'draft' ? 'bg-black text-white' : 'bg-black/5 text-black/50 hover:bg-black/10'
          }`}
        >
          草稿箱
        </button>
        <button
          onClick={() => setParams({ tab: 'published' })}
          className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition ${
            tab === 'published' ? 'bg-black text-white' : 'bg-black/5 text-black/50 hover:bg-black/10'
          }`}
        >
          已发布
        </button>
      </div>

      {/* 卡片平铺网格 */}
      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {isLoading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-black/40">
            <Spinner size={28} className="text-black/30" />
            <span>加载中…</span>
          </div>
        ) : list.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-black/30">暂无内容</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
            {list.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                variant={tab}
                onEdit={() => navigate(`/character/${c.id}`)}
                onPublish={tab === 'draft' ? () => publishMut.mutate(c.id) : undefined}
                onDynamic={tab === 'published' ? () => navigate(`/character/${c.id}`) : undefined}
                onDelete={() => deleteMut.mutate(c.id)}
                publishing={publishMut.isPending && publishMut.variables === c.id}
                deleting={deleteMut.isPending && deleteMut.variables === c.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
