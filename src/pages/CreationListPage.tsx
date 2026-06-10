import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TopNav } from '@/components/layout/TopNav'
import { CharacterCard } from '@/components/character/CharacterCard'
import { PillButton, Spinner, FullscreenLoading } from '@/components/ui/primitives'
import {
  deleteCharacter,
  listCharacters,
  publishCharacter,
  saveCharacter,
} from '@/services/characterApi'
import { createEmptyCharacter } from '@/types/character'
import { useAuthStore } from '@/features/auth/authStore'

export function CreationListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const email = useAuthStore((s) => s.email) || ''

  const drafts = useQuery({
    queryKey: ['characters', 'draft'],
    queryFn: () => listCharacters('draft'),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
  })
  const published = useQuery({
    queryKey: ['characters', 'published'],
    queryFn: () => listCharacters('published'),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
  })

  const createMut = useMutation({
    mutationFn: () => {
      const draft = createEmptyCharacter('', email)
      return saveCharacter(draft)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['characters', 'draft'] })
      navigate(`/character/${res.character.id}`)
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : ''
      // 后端对草稿数量有上限（如最多 5 个），超限时新建会失败
      alert(`新建失败：${msg || '草稿数量可能已达上限，请先删除部分草稿后再试'}`)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  })

  const publishMut = useMutation({
    mutationFn: (id: string) => publishCharacter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
    onError: (e) => {
      alert(`发布失败：${e instanceof Error ? e.message : '请稍后重试'}`)
    },
  })

  const isLoading = drafts.isLoading || published.isLoading
  const isError = drafts.isError || published.isError
  const draftList = drafts.data?.characters ?? []
  const publishedList = published.data?.characters ?? []
  const isEmpty = !isLoading && !isError && draftList.length === 0 && publishedList.length === 0

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f7f7]">
      <TopNav />

      <main className="min-h-0 flex-1 overflow-y-auto pb-[30px] pt-2">
        {isLoading && <FullscreenLoading />}

        {isError && (
          <div className="px-10">
          <CenterState
            title="加载失败"
            desc={drafts.error?.message || published.error?.message || '网络异常，请重试'}
            action={
              <PillButton
                onClick={() => {
                  drafts.refetch()
                  published.refetch()
                }}
              >
                重试
              </PillButton>
            }
          />
          </div>
        )}

        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <img
              src="/assets/empty-illustration.svg"
              alt=""
              className="h-[110px] w-[184px]"
            />
            <button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending}
              className="flex items-center justify-center gap-2 rounded-[2000px] bg-[#fdeab3] px-6 py-3 text-2xl font-black text-black transition hover:brightness-95 disabled:opacity-50"
            >
              {createMut.isPending && <Spinner size={22} />}
              {createMut.isPending ? '创建中…' : '创建'}
            </button>
          </div>
        )}

        {!isLoading && !isError && !isEmpty && (
          <div className="flex min-h-full w-full flex-col gap-10">
            {/* 草稿箱 */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-10 py-1.5">
                <h2 className="font-misans text-[16px] text-black/30">草稿箱 {draftList.length}</h2>
                {draftList.length > 3 && (
                  <button
                    onClick={() => navigate('/all?tab=draft')}
                    className="font-misans text-[14px] text-black/40 transition hover:text-black/60"
                  >
                    查看全部 &gt;
                  </button>
                )}
              </div>
              <div className="flex gap-4 overflow-x-auto px-10 pb-2">
                <button
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending}
                  className="flex h-[268px] w-[358px] shrink-0 items-center justify-center rounded-[20px] border border-black/[0.06] bg-white transition hover:bg-black/[0.02] disabled:opacity-50"
                  title="新建角色"
                >
                  {createMut.isPending ? (
                    <Spinner size={28} className="text-black/30" />
                  ) : (
                    <img src="/assets/icon-plus.svg" alt="新建角色" className="size-10" />
                  )}
                </button>
                {draftList.map((c) => (
                  <CharacterCard
                    key={c.id}
                    character={c}
                    variant="draft"
                    onOpen={() => navigate(`/character/${c.id}`)}
                    onEdit={() => navigate(`/character/${c.id}`)}
                    onPublish={() => publishMut.mutate(c.id)}
                    onDelete={() => deleteMut.mutate(c.id)}
                    publishing={publishMut.isPending && publishMut.variables === c.id}
                    deleting={deleteMut.isPending && deleteMut.variables === c.id}
                  />
                ))}
              </div>
            </section>

            {/* 已发布 */}
            <section className="flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-between px-10 py-1.5">
                <h2 className="font-misans text-[16px] text-black/30">已发布 {publishedList.length}</h2>
                {publishedList.length > 3 && (
                  <button
                    onClick={() => navigate('/all?tab=published')}
                    className="font-misans text-[14px] text-black/40 transition hover:text-black/60"
                  >
                    查看全部 &gt;
                  </button>
                )}
              </div>
              {publishedList.length === 0 ? (
                <div className="flex min-h-[200px] flex-1 items-center justify-center">
                  <p className="font-misans text-[14px] text-black/30">还没有发布的角色</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto px-10 pb-2">
                  {publishedList.map((c) => (
                    <CharacterCard
                      key={c.id}
                      character={c}
                      variant="published"
                      onOpen={() => navigate(`/character/${c.id}/page`)}
                      onEdit={() => navigate(`/character/${c.id}?tab=basic`)}
                      onDynamic={() => navigate(`/character/${c.id}?tab=dynamicNew`)}
                      onDelete={() => deleteMut.mutate(c.id)}
                      deleting={deleteMut.isPending && deleteMut.variables === c.id}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function CenterState({
  title,
  desc,
  action,
}: {
  title: string
  desc: string
  action: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm text-black/50">{desc}</p>
      <div className="mt-2">{action}</div>
    </div>
  )
}
