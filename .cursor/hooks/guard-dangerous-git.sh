#!/bin/bash
# 危险命令硬闸门：在 shell 命令执行前扫描，命中危险模式则强制让用户确认。
# 系统级拦截，不依赖 agent 自觉，补 git-helper 规则只是软约束的漏洞。
#
# Cursor beforeShellExecution hook：stdin 收 JSON（含 .command），stdout 回 JSON。
# 返回 permission=ask 让 Cursor 弹确认；allow 放行。
#
# 采用 token 分词判断（比单一大正则可靠，避免贪婪/锚点踩坑）。

input=$(cat)
command=$(printf '%s' "$input" | jq -r '.command // empty' 2>/dev/null)

if [ -z "$command" ]; then
  printf '{ "permission": "allow" }'
  exit 0
fi

danger=""

# 把命令按空白拆成 token（仅用于标志判断，不执行）
read -ra toks <<< "$command"

# 是否 git 命令
is_git=no
for t in "${toks[@]}"; do
  if [ "$t" = "git" ]; then is_git=yes; break; fi
done

# 找出 git 子命令（git 后第一个非选项 token）
sub=""
seen_git=no
for t in "${toks[@]}"; do
  if [ "$seen_git" = yes ] && [ -n "$t" ]; then
    case "$t" in
      -*) ;;            # 跳过 git 全局选项
      *) sub="$t"; break ;;
    esac
  fi
  [ "$t" = "git" ] && seen_git=yes
done

has_flag_with() {
  # 参数1：要在短选项簇里查找的字母；在所有 token 里找 -xxx 形式
  local letter="$1" t
  for t in "${toks[@]}"; do
    case "$t" in
      --*) ;;                              # 长选项另处理
      -*"$letter"*) return 0 ;;            # 短选项簇含该字母，如 -f / -fd / -uf
    esac
  done
  return 1
}

has_long() {
  local needle="$1" t
  for t in "${toks[@]}"; do
    case "$t" in
      "$needle"|"$needle"=*) return 0 ;;
    esac
  done
  return 1
}

has_plus_ref() {
  local t
  for t in "${toks[@]}"; do
    case "$t" in
      "+") ;;
      +?*) return 0 ;;       # +main 强制推送
    esac
  done
  return 1
}

if [ "$is_git" = yes ]; then
  case "$sub" in
    reset)
      has_long --hard && danger="reset --hard（丢弃工作区/暂存区改动）"
      has_long --merge && danger="reset --merge"
      has_long --keep && danger="reset --keep"
      ;;
    push)
      has_long --force && danger="push --force（覆盖远程历史）"
      has_long --force-with-lease && danger="push --force-with-lease"
      has_flag_with f && danger="push -f（强制推送，覆盖远程历史）"
      has_plus_ref && danger="push +ref（强制推送）"
      ;;
    clean)
      { has_flag_with f || has_flag_with d || has_flag_with x; } && danger="clean（删除未追踪文件）"
      ;;
    branch)
      has_flag_with D && danger="branch -D（强制删除分支）"
      ;;
    checkout)
      { has_long --force || has_flag_with f; } && danger="checkout --force（覆盖本地改动）"
      # checkout -- <path> 覆盖工作区文件
      for t in "${toks[@]}"; do [ "$t" = "--" ] && danger="checkout -- <path>（丢弃文件改动）"; done
      ;;
    restore)
      danger="restore（丢弃工作区文件改动）"
      ;;
    stash)
      case " ${toks[*]} " in
        *" drop "*|*" clear "*|*" pop "*) danger="stash drop/clear/pop（可能丢弃暂存）" ;;
      esac
      ;;
    reflog)
      case " ${toks[*]} " in
        *" expire "*|*" delete "*) danger="reflog expire/delete（清理可恢复对象）" ;;
      esac
      ;;
    gc)
      has_long --prune && danger="gc --prune（清理可恢复对象）"
      ;;
    filter-branch)
      danger="filter-branch（改写历史）"
      ;;
    update-ref)
      has_flag_with d && danger="update-ref -d（删除引用）"
      ;;
  esac
fi

# 非 git：rm -rf / -fr
if [ -z "$danger" ]; then
  is_rm=no
  for t in "${toks[@]}"; do [ "$t" = "rm" ] && is_rm=yes; done
  if [ "$is_rm" = yes ]; then
    has_r=no; has_f=no
    for t in "${toks[@]}"; do
      case "$t" in
        --recursive) has_r=yes ;;
        --force) has_f=yes ;;
        -*r*) has_r=yes ;;
      esac
      case "$t" in -*f*) [ "${t:0:2}" != "--" ] && has_f=yes ;; esac
    done
    [ "$has_r" = yes ] && [ "$has_f" = yes ] && danger="rm -rf（递归强制删除，不可恢复）"
  fi
fi

if [ -n "$danger" ]; then
  jq -n --arg cmd "$command" --arg why "$danger" '{
    permission: "ask",
    user_message: ("⚠️ 检测到可能破坏数据的命令，请先确认再执行：\n\n" + $cmd + "\n\n命中：" + $why + "\n（此类操作会丢失未提交改动或覆盖历史，多数不可撤销）"),
    agent_message: ("此命令命中危险模式：" + $why + "。按 git-helper 规则，破坏性操作必须先经用户明确确认。优先改用安全替代（git pull --ff-only、git stash、git revert 等）。")
  }'
  exit 0
fi

printf '{ "permission": "allow" }'
exit 0
