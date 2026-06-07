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

      <main className="mx-auto w-full max-w-[1512px] flex-1 overflow-auto p-8">
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
          <CenterState
            title="还没有角色"
            desc="创建你的第一个 AI 陪伴角色吧"
            action={
              <PillButton
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending}
                className="bg-[#fdeab3] text-black"
              >
                {createMut.isPending ? '创建中…' : '创建角色'}
              </PillButton>
            }
          />
        )}

        {!isLoading && !isError && !isEmpty && (
          <div className="grid grid-cols-2 gap-6">
            <Column
              title="草稿箱"
              count={draftList.length}
              onCreate={() => createMut.mutate()}
              creating={createMut.isPending}
            >
              {draftList.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  onClick={() => navigate(`/character/${c.id}`)}
                  footer={
                    <div className="flex gap-2">
                      <SmallBtn onClick={() => publishMut.mutate(c.id)}>发布</SmallBtn>
                      <SmallBtn onClick={() => deleteMut.mutate(c.id)}>删除</SmallBtn>
                    </div>
                  }
                />
              ))}
            </Column>

            <Column title="已发布" count={publishedList.length}>
              {publishedList.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  onClick={() => navigate(`/character/${c.id}`)}
                  footer={<SmallBtn onClick={() => deleteMut.mutate(c.id)}>删除</SmallBtn>}
                />
              ))}
            </Column>
          </div>
        )}
      </main>
    </div>
  )
}

function Column({
  title,
  count,
  onCreate,
  creating,
  children,
}: {
  title: string
  count: number
  onCreate?: () => void
  creating?: boolean
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-base font-semibold">
          {title} <span className="text-black/40">{count}</span>
        </h2>
        {onCreate && (
          <button
            onClick={onCreate}
            disabled={creating}
            className="rounded-[100px] bg-[#fdeab3] px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {creating ? '创建中…' : '+ 新建'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </section>
  )
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="rounded-[100px] border border-black/15 px-3 py-1 text-sm hover:bg-black/5"
    >
      {children}
    </button>
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
