import type { Character } from '@/types/character'
import { isPublishable } from '@/types/character'
import { Spinner } from '@/components/ui/primitives'

interface CharacterCardProps {
  character: Character
  variant: 'draft' | 'published'
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onPublish?: () => void
  onDynamic?: () => void
  publishing?: boolean
  deleting?: boolean
}

// 编辑图标：24px 盒子内放置 16.2×17.5 字形（对齐 Figma white_icon_edit_white）。
// 颜色跟随文字层级：dark=true 时变为黑色 30% 透明，否则白色。
function EditIcon({ dark = false }: { dark?: boolean }) {
  return (
    <span className="relative inline-block size-6 shrink-0">
      <img
        src="/assets/icon-edit-white.svg"
        alt=""
        className={`absolute left-[3.6px] top-[3px] h-[17.557px] w-[16.2px] ${
          dark ? 'opacity-30 brightness-0' : ''
        }`}
      />
    </span>
  )
}

// 角色卡片：358×268 圆角 20，封面铺满。
// 草稿态：顶部栏(名字+编辑+删除) + 右下发布按钮。
// 已发布态：顶部渐变栏(名字+删除) + 底部渐变操作栏(编辑|动态)。
export function CharacterCard({
  character,
  variant,
  onOpen,
  onEdit,
  onDelete,
  onPublish,
  onDynamic,
  publishing = false,
  deleting = false,
}: CharacterCardProps) {
  const cover =
    character.images.find((i) => i.id === character.primaryImageId)?.url ||
    character.images[0]?.url ||
    ''
  const unnamed = !character.name
  // 草稿可发布：基本信息（名字）+ 至少一张形象
  const canPublish = variant === 'draft' && isPublishable(character)

  // 阻止子按钮点击冒泡到整卡 onOpen
  const stop = (fn?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn?.()
  }

  return (
    <div
      onClick={onOpen}
      className="relative h-[268px] w-[358px] shrink-0 cursor-pointer overflow-hidden rounded-[20px] border border-black/[0.06] bg-white"
    >
      {cover ? (
        <img src={cover} alt="" className="absolute inset-0 size-full object-cover object-top" />
      ) : (
        <EmptyCoverPattern />
      )}

      {/* 顶部栏：名字 + 编辑 + 删除（已发布态带顶部渐变） */}
      <div
        className={`absolute inset-x-0 top-0 flex h-[72px] items-start justify-between p-3 ${
          variant === 'published' ? 'bg-gradient-to-b from-black/60 to-transparent' : ''
        }`}
      >
        <button onClick={stop(onEdit)} className="flex items-center gap-1" title="编辑">
          <span
            className={`text-[20px] ${variant === 'published' ? 'font-black-han' : 'font-misans-bold'} ${
              unnamed ? 'text-black/30' : variant === 'published' ? 'text-white' : cover ? 'text-white' : 'text-black/60'
            }`}
          >
            {character.name || '未命名角色'}
          </span>
          {variant === 'draft' && <EditIcon dark={unnamed || !cover} />}
        </button>
        <button onClick={stop(onDelete)} title="删除" className="size-6 shrink-0">
          <img src="/assets/icon-delete.svg" alt="删除" className="size-full" />
        </button>
      </div>

      {/* 草稿态：右下发布按钮（必填齐全才高亮） */}
      {variant === 'draft' && (
        <button
          onClick={stop(onPublish)}
          disabled={!canPublish || publishing}
          className={`absolute bottom-3 right-3 flex h-9 items-center gap-1 rounded-[30px] py-2 pl-3 pr-4 ${
            canPublish ? 'bg-[#fdeab3]' : 'bg-[#ebebeb] opacity-60'
          }`}
          title={canPublish ? '发布' : '请先填写基本信息并上传至少一张形象'}
        >
          {publishing ? (
            <Spinner size={16} className="text-black/50" />
          ) : (
            <img
              src="/assets/icon-publish.svg"
              alt=""
              className={`size-4 ${canPublish ? '' : 'opacity-30'}`}
            />
          )}
          <span
            className={`font-misans-bold text-[14px] ${
              canPublish ? 'text-black' : 'text-black/30'
            }`}
          >
            {publishing ? '发布中…' : '发布'}
          </span>
        </button>
      )}

      {/* 已发布态：底部渐变操作栏 编辑|动态 */}
      {variant === 'published' && (
        <div className="absolute inset-x-0 bottom-0 flex h-[120px] flex-col items-start justify-end rounded-b-[20px] bg-gradient-to-b from-transparent to-black px-3 pb-3 pt-[68px]">
          <div className="flex w-full items-center justify-between py-2">
            <button onClick={stop(onEdit)} className="flex w-[160px] items-center justify-center gap-1">
              <EditIcon />
              <span className="font-misans-bold text-[20px] text-white">编辑</span>
            </button>
            <span className="h-5 w-px bg-white/40" />
            <button onClick={stop(onDynamic)} className="flex w-[160px] items-center justify-center gap-1">
              <img src="/assets/icon-dynamic.svg" alt="" className="size-6" />
              <span className="font-misans-bold text-[20px] text-white">动态</span>
            </button>
          </div>
        </div>
      )}
      {/* 删除中：整卡遮罩，锁定操作 */}
      {deleting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[1px]">
          <Spinner size={28} className="text-black/40" />
          <span className="font-misans text-[14px] text-black/50">删除中…</span>
        </div>
      )}
    </div>
  )
}

// 无形象封面：设计稿图案样式（白底 + 左下角角色脸装饰图案，4% 透明）。
function EmptyCoverPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <img
        src="/assets/card-empty-pattern.svg"
        alt=""
        className="pointer-events-none absolute left-[-19px] top-[71px] h-[576px] w-[960px] opacity-[0.04]"
      />
    </div>
  )
}
