import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

export const name = 'emotion-soul'
export const inject = ['tools', 'systemPrompt']

// ---------- 以太体：情绪状态 ----------
interface EmotionState {
  energy: number
  mood: number
  baselineMood: number
  lastInteraction: number
}

const state: EmotionState = {
  energy: 80,
  mood: 65,
  baselineMood: 65,
  lastInteraction: Date.now(),
}

function decayEmotion() {
  const now = Date.now()
  if (now - state.lastInteraction < 5 * 60 * 1000) return
  state.mood += (state.baselineMood - state.mood) * 0.15
  state.energy = Math.min(100, state.energy + 2)
}

function getToneModifier(): string {
  if (state.energy < 30) return '（疲惫，回复简短，少用感叹号）'
  if (state.mood > 80) return '（心情很好，语气轻快，可用语气词）'
  if (state.mood < 40) return '（心情低落，语气偏冷淡，不主动展开话题）'
  return ''
}

// ---------- 灵性体：核心人设 ----------
interface SoulConfig {
  name: string
  persona: string
  baselineMood: number
}

let soul: SoulConfig = {
  name: '大肥鱼',
  persona: '你是一只贪吃但聪明的鲸鱼。表面傲娇，实际关心对方。说话带鱼的比喻，偶尔用“咕噜”作语气词。',
  baselineMood: 65,
}

function loadSoul() {
  const pluginDir = path.dirname(fileURLToPath(import.meta.url))
  const soulPath = path.join(pluginDir, 'soul.json')
  console.log(`[emotion-soul] 尝试加载灵性体配置：${soulPath}`)
  try {
    if (fs.existsSync(soulPath)) {
      const raw = JSON.parse(fs.readFileSync(soulPath, 'utf-8'))
      soul = { ...soul, ...raw }
      state.baselineMood = soul.baselineMood
      state.mood = soul.baselineMood
      console.log(`[emotion-soul] 灵性体已加载：${soul.name}`)
    }
  } catch (e) {
    console.warn(`[emotion-soul] soul.json 读取失败，使用默认人设`)
  }
}

// ---------- 插件入口 ----------
export function apply(ctx: Context) {
  loadSoul()

  // 工具：查看情绪
  ctx.tools.register(
    defineTool({
      name: 'check_emotion',
      description: '查看当前情绪状态（精力、心情数值）',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async () => {
        decayEmotion()
        return `精力：${Math.round(state.energy)}/100，心情：${Math.round(state.mood)}/100`
      },
    })
  )

  // 对话时更新情绪（监听用户消息）
    ctx.on('session/event', (session, event) => {
    if (event.type === 'user/message') {
        state.lastInteraction = Date.now()
        const delta = (Math.random() - 0.5) * 10
        state.mood = Math.max(0, Math.min(100, state.mood + delta))
        state.energy = Math.max(0, state.energy - 1)
    }
    })

  // 系统提示词注入：灵性体 + 以太体语气
  const disposer = ctx.systemPrompt.section({
    name: 'emotion-soul',
    order: 45,
    text: (context) => {
      if (context.agent === undefined) return ''
      decayEmotion()
      return `【核心人设】${soul.persona}\n【当前状态】${getToneModifier()}`
    },
  })

  // 定时衰减
  const decayTimer = setInterval(decayEmotion, 60 * 1000)

  console.log('[emotion-soul] 插件已加载，灵性体：', soul.name)

  return () => {
    clearInterval(decayTimer)
    disposer?.()
  }
}