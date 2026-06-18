/**
 * 从 LLM 输出中提取 JSON
 * 兼容：纯 JSON / ```json 代码块 / <think> 思考块 / 前后杂讯 / LLM 输出不完整
 *
 * 策略：找到所有平衡的 JSON 块，尝试 parse 每一个
 */
export function extractJson<T = any>(text: string): T {
  if (!text) throw new Error('LLM 返回为空')

  // 1. 清理：移除 <think>...</think> 思考块
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  // 2. 尝试直接 parse
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      return JSON.parse(cleaned)
    } catch (e) {
      // 继续尝试
    }
  }

  // 3. 提取 ```json ... ``` 代码块（优先 json 类型）
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]+?)\s*```/i)
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock[1].trim())
    } catch (e) {
      // 继续
    }
  }

  // 4. 收集所有平衡的 JSON 块（从最长到最短尝试）
  const candidates: string[] = []

  // 4a. 平衡的 {...}
  collectBalancedJson(cleaned, '{', '}', candidates)
  // 4b. 平衡的 [...]
  collectBalancedJson(cleaned, '[', ']', candidates)

  // 按长度从大到小排序（更完整的优先）
  candidates.sort((a, b) => b.length - a.length)

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch (e) {
      // 试下一个
    }
  }

  // 5. 兜底：宽松正则
  const fallback = cleaned.match(/\{[\s\S]*\}/)
  if (fallback) {
    try {
      return JSON.parse(fallback[0])
    } catch (e) {
      // 继续
    }
  }

  throw new Error(`无法从 LLM 输出中提取 JSON: ${text.slice(0, 200)}`)
}

/**
 * 收集字符串中所有平衡的 JSON 块
 * 从后往前找，避免贪婪匹配错位
 */
function collectBalancedJson(text: string, openChar: string, closeChar: string, out: string[]) {
  // 找出所有 closeChar 的位置
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] !== closeChar) continue

    // 从 i 往前找匹配的 openChar
    let depth = 0
    let start = -1
    let inString = false
    let escape = false

    for (let j = i; j >= 0; j--) {
      const ch = text[j]

      // 处理字符串内的转义
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = !inString
        continue
      }
      // 字符串内不算
      if (inString) continue

      if (ch === closeChar) depth++
      else if (ch === openChar) {
        depth--
        if (depth === 0) {
          start = j
          break
        }
      }
    }

    if (start >= 0) {
      const candidate = text.slice(start, i + 1)
      // 只接受看起来像 JSON 的（不包含 LLM 的解释文本）
      if (candidate.length > 10 && candidate.includes('"')) {
        out.push(candidate)
      }
    }
  }
}
