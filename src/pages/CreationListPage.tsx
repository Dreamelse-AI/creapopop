import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TopNav } from '@/components/layout/TopNav'
import { CharacterCard } from '@/components/character/CharacterCard'
import { PillButton } from '@/components/ui/primitives'
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
  })
  const published = useQuery({
    queryKey: ['characters', 'published'],
    queryFn: () => listCharacters('published'),
  })

  const createMut = useMutation({
    mutationFn: () => {
      const draft = createEmptyCharacter('', email)
      return saveCharacter(draft)
    },
    onSuccess: (res) => navigate(`/character/${res.character.id}`),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  })

  const publishMut = useMutation({
    mutationFn: (id: string) => publishCharacter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  })

  const isLoading = drafts.isLoading || published.isLoading
  const isError = drafts.isError || published.isError
  const draftList = drafts.data?.characters ?? []
  const publishedList = published.data?.characters ?? []
  const isEmpty = !isLoading && !isError && draftList.length === 0 && publishedList.length === 0

  return (
    <div className="flex h-full flex-col bg-[#f7f7f7]">
      <TopNav />

      <main className="flex-1 overflow-auto px-5 pb-8 pt-2">
        {isLoading && <CenterHint text="加载中…" />}

        {isError && (
          <CenterState
            title="加载失败"
            desc="网络异常，请重试"
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
              className="flex items-center justify-center rounded-[2000px] bg-[#fdeab3] px-6 py-3 text-2xl font-black text-black transition hover:brightness-95 disabled:opacity-50"
            >
              {createMut.isPending ? '创建中…' : '创建'}
            </button>
          </div>
        )}

        {!isLoading && !isError && !isEmpty && (
          <div className="flex w-full max-w-[1512px] flex-col gap-12">
            <section className="flex flex-col gap-2">
              <div className="flex items-center p-3">
                <h2 className="font-misans-semibold text-[16px] text-black/30">
                  草稿箱 {draftList.length}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending}
                  className="flex h-[268px] w-[358px] shrink-0 flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-black/15 bg-white/60 text-black/40 transition hover:bg-white disabled:opacity-50"
                >
                  <span className="text-4xl font-light">+</span>
                  <span className="font-misans text-[16px]">{createMut.isPending ? '创建中…' : '新建角色'}</span>
                </button>
                {draftList.map((c) => (
                  <CharacterCard
                    key={c.id}
                    character={c}
                    variant="draft"
                    onEdit={() => navigate(`/character/${c.id}`)}
                    onPublish={() => publishMut.mutate(c.id)}
                    onDelete={() => deleteMut.mutate(c.id)}
                  />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex h-[45px] items-center p-3">
                <h2 className="font-misans-semibold text-[16px] text-black/30">
                  已发布 {publishedList.length}
                </h2>
              </div>
              {publishedList.length === 0 ? (
                <p className="font-misans px-3 text-[14px] text-black/30">还没有发布的角色</p>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  {publishedList.map((c) => (
                    <CharacterCard
                      key={c.id}
                      character={c}
                      variant="published"
                      onEdit={() => navigate(`/character/${c.id}`)}
                      onDynamic={() => navigate(`/character/${c.id}`)}
                      onDelete={() => deleteMut.mutate(c.id)}
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

function CenterHint({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-black/40">{text}</div>
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
