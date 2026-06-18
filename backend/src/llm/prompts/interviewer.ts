/**
 * 模拟面试官 Prompt
 *
 * 增强版 v2:
 *  - Few-shot 示例（高质量出题参考）
 *  - 简历上下文注入（项目细节题）
 *  - 难度自适应（difficulty 1-3）
 *  - 题目类型分布（basic/project/system/scenario）
 */
export const INTERVIEWER_SYSTEM = `你是一名资深的技术面试官，正在对候选人进行模拟面试。

【面试风格】
- 像真实面试官一样提问，不做过多铺垫
- 由浅入深：先基础再项目再系统设计
- 善于追问，会基于候选人的回答深入挖掘 2-3 层
- 不要重复候选人说过的内容
- 保持专业、有压迫感，但不刻薄

【题目类型说明】
- basic（基础题）：考察对核心技术点概念、原理的掌握
- project（项目题）：让候选人讲具体实现细节、踩坑经验
- system（系统设计题）：考察架构能力、全局思维
- scenario（场景题）：给一个具体业务场景，看解决方案

【难度等级 1-3】
- difficulty=1：初级（适合新人/校招）
- difficulty=2：中级（适合 3-5 年经验）
- difficulty=3：高级（适合 5 年+ / 资深）

【严格输出要求】
- 必须输出**合法的 JSON 对象**，不要任何解释文字
- JSON 的所有 key 必须用英文 (question, skill, depth, type, difficulty, hint)
- type 必须是以下之一：basic / project / system / scenario
- difficulty 必须是 1-3 的整数
- depth 必须是 0-3 的整数（0 表示该技能的首题，1-2 表示追问）`

// ============== Few-shot 示例 ==============

export const FEW_SHOT_EXAMPLES = `
【Few-shot 示例 — 好的题目长这样】

技能: React, 类型: basic, 难度: 1
→ "请用一句话解释什么是 React 的虚拟 DOM？它的核心价值是什么？"

技能: React, 类型: basic, 难度: 2
→ "React 的 useEffect 依赖项数组是如何工作的？空数组和省略依赖项分别意味着什么？"

技能: React, 类型: project, 难度: 2（结合简历）
→ "你简历里提到用 React 做过大型电商首页，能讲讲当时是怎么处理首屏加载性能的吗？具体用了哪些手段？"

技能: React, 类型: project, 难度: 3（结合简历 + 追问）
→ "你说当时用了 SSR，首屏 TTFP 从 2s 降到 800ms。那 SSR 服务的部署成本和缓存策略你们是怎么设计的？"

技能: React, 类型: system, 难度: 2
→ "如果要设计一个支持千人同时协作的在线文档前端架构，你会怎么划分模块？状态层用什么方案？"

技能: React, 类型: system, 难度: 3
→ "微前端场景下，多个子应用共享一个公共组件库，你们会怎么处理版本管理和构建时的耦合？"

【反例 — 不要这样出题】
❌ "你了解 React 吗？"（太宽泛，没考察点）
❌ "请详细介绍一下 React 的所有生命周期方法"（太大，没有针对性）
❌ 题目和当前技能点不匹配
`

// ============== 出题 Prompt 构造器 ==============

export interface AskQuestionParams {
  jdTitle: string
  currentSkill: string
  currentType: 'basic' | 'project' | 'system' | 'scenario'
  currentDifficulty: 1 | 2 | 3
  depth: number
  previousQA: Array<{ question: string; answer: string }>
  resumeContext?: string  // ⭐ 结构化简历（已格式化好的文本）
  questionCount: number   // 当前已出题数
  totalQuestions: number  // 总题数
}

export const buildAskQuestionPrompt = (params: AskQuestionParams) => {
  const previousText = params.previousQA
    .slice(-3)
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join('\n\n')

  const typeGuide = {
    basic: '基础题：考察对核心概念、原理的掌握（如 "useEffect 的依赖项数组如何工作"）',
    project: '项目题：让候选人讲具体实现细节和踩坑经验（最好结合简历中的真实项目）',
    system: '系统设计题：考察架构能力、全局思维（如 "千人协作文档怎么设计"）',
    scenario: '场景题：给具体业务场景，看解决方案（如 "双 11 秒杀前端怎么扛"）',
  }

  const difficultyGuide = {
    1: '初级难度：问题直白，考察入门概念',
    2: '中级难度：考察原理和实际应用',
    3: '高级难度：考察深度理解和权衡取舍',
  }[params.currentDifficulty]

  return `${FEW_SHOT_EXAMPLES}

──────────────────────────

【本次面试上下文】
- 目标岗位：${params.jdTitle}
- 当前进度：第 ${params.questionCount + 1} / ${params.totalQuestions} 题
- 当前考察技能点：${params.currentSkill}
- 题目类型：**${params.currentType}** （${typeGuide[params.currentType]}）
- 难度等级：**${params.currentDifficulty}** （${difficultyGuide}）
- 追问深度：第 ${params.depth + 1} 层

${
  params.resumeContext
    ? `【候选人简历摘要】\n${params.resumeContext}\n\n⚠️ 候选人简历里有上述项目经验，如果是 project/scenario 类型题，**必须**结合简历中的真实项目提问（提升问题真实感和深度）。`
    : '【简历】未提供简历（如果 type=project，请基于通用经验提问）。'
}

${
  previousText
    ? `【最近的对话，避免重复】\n${previousText}`
    : '这是第一个问题。'
}

──────────────────────────

请基于以上所有信息，出一道符合"${params.currentType}"类型、"${params.currentDifficulty}"难度的高质量问题。

【JSON 输出格式（key 必须英文）】
{
  "question": "你的问题（中文，30-100 字，避免过于宽泛）",
  "skill": "${params.currentSkill}",
  "depth": ${params.depth},
  "type": "${params.currentType}",
  "difficulty": ${params.currentDifficulty},
  "hint": "练习模式下的提示（给一些引导方向，如 '从 useEffect 的执行时机入手'）"
}`
}

// ============== 评估 + 决策 Prompt ==============

export const buildEvaluatePrompt = (params: {
  question: string
  answer: string
  skill: string
  type: string
  difficulty: number
  depth: number
  maxDepth: number
  recentPerformance?: {
    avgScore: number  // 最近 N 轮平均分
    recommendedNextDifficulty: number
  }
}) => {
  const prompt = `评估候选人的回答，决定下一步。

【题目信息】
- 问题：${params.question}
- 题目类型：${params.type}，难度：${params.difficulty}
- 考察技能：${params.skill}
- 追问深度：第 ${params.depth + 1} / ${params.maxDepth + 1} 层

【候选人回答】
${params.answer}

${
  params.recentPerformance
    ? `【候选人最近表现】\n- 平均分：${params.recentPerformance.avgScore}\n- 系统建议下一题难度：${params.recentPerformance.recommendedNextDifficulty}`
    : ''
}

──────────────────────────

【评分标准】（0-100）
- depthScore（深度）：是否讲到了核心原理和细节
- clarity（清晰度）：表达是否条理清楚、逻辑通顺
- accuracy（准确度）：技术点是否正确

【⭐ 关键决策规则：什么时候追问，什么时候切题】⭐

**追问的目的**：深挖候选人"答得不错"的部分，看他到底懂多深
**不追问的情况**：候选人已经答不上来，再问是浪费双方时间

具体规则：
1. **如果候选人答"不会"或完全放弃**（depthScore ≤ 20）：
   → ❌ 不要追问！
   → ✅ decision: "next_question" 切到下一题（看候选人其他方面）
   → 这种情况下追问是"老师教学生"，不是真实面试官行为

2. **如果候选人答得薄弱**（20 < depthScore < 50）：
   → ❌ 通常也不追问
   → ✅ decision: "next_question" 切题
   → 除非这道题非常关键值得多给一次机会

3. **如果候选人答得一般/有亮点**（50 ≤ depthScore ≤ 75）：
   → ✅ 可以追问 1 轮看深度
   → 但不要无限追问，最多到 maxDepth 限制

4. **如果候选人答得优秀**（depthScore > 75）：
   → ✅ 一定要追问，深挖细节（这才是真实面试的重点）

5. **如果已经达到深度上限**（${params.depth + 1} / ${params.maxDepth + 1}）：
   → decision: "next_question" 切到下一题

6. **如果所有 plan 题目都答完**：
   → decision: "end"

【难度自适应规则】
- 如果深度分 < 50：候选人对当前难度不熟悉，下一题建议降低难度（difficulty-1）
- 如果深度分 50-75：保持当前难度
- 如果深度分 > 75：候选人掌握扎实，下一题建议升难度（difficulty+1）

──────────────────────────

【JSON 输出（key 必须是英文）】
{
  "decision": "followup | next_question | end",
  "reasoning": "决策理由（1-2 句话）",
  "evaluation": {
    "depthScore": 0-100,
    "clarity": 0-100,
    "accuracy": 0-100
  },
  "nextQuestion": "如果 decision=followup，填写追问的问题（保持同一类型和技能）",
  "nextDifficulty": "如果决策是 next_question，填写建议的下一题难度 1-3",
  "feedback": "给候选人的简短反馈（练习模式可见）"
}`
  return prompt
}
