import type { Character } from '@/types/character'

// 角色卡片：封面 + 名字 + 操作。封面取主图或首图，无图占位。
export function CharacterCard({
  character,
  onClick,
  footer,
}: {
  character: Character
  onClick?: () => void
  footer?: React.ReactNode
}) {
  const cover =
    character.images.find((i) => i.id === character.primaryImageId)?.url ||
    character.images[0]?.url ||
    ''

  return (
    <div className="overflow-hidden rounded-[16px] border border-black/[0.06] bg-white">
      <button
        onClick={onClick}
        className="block aspect-[358/268] w-full overflow-hidden bg-[#f0f0f0]"
      >
        {cover ? (
          <img src={cover} alt={character.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-black/20">
            暂无形象
          </div>
        )}
      </button>
      <div className="flex items-center justify-between px-3 py-3">
        <span className="truncate text-base font-medium">
          {character.name || '未命名角色'}
        </span>
        {footer}
      </div>
    </div>
  )
}
