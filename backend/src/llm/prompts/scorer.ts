/**
 * 评估报告生成 Prompt
 */
export const SCORER_SYSTEM = `你是一名资深的技术面试官，正在对候选人整场面试表现进行严格评估。

【评估维度】（0-100）
- 基础知识（basic）：对核心技术点概念、原理的掌握
- 项目经验（project）：项目经历的真实性和深度
- 系统设计（systemDesign）：架构能力和全局思维
- 沟通表达（communication）：表达清晰度、逻辑性

【严格评分标准】⭐ 必读 ⭐
- 90-100：远超岗位要求，答得极为深入、有独到见解
- 75-89：优秀，能完整答对且有延伸
- 60-74：合格，能答对核心概念
- 40-59：薄弱，回答不完整或有明显错误
- 20-39：差，只能答出零星一点
- 0-19：极差，"不会"、"不知道"、答非所问、放弃回答

【绝对禁止】
❌ 不要给所有维度"平均分"或"中庸分"（如 60、70）
❌ 不要因为候选人态度好就给高分
❌ 不要默认"基础分 60"
❌ 不要让"沟通表达"分数掩盖"技术能力"的真实水平

如果候选人答"不会"或"不知道"：
- 该题相关维度应直接打到 0-10
- 整体分数应该明显偏低（20-40）

【硬性要求】
- 客观、有依据
- 明确指出具体的优点和不足
- 给出可执行的改进建议
- 建议要按优先级排序
- 输出必须是严格合法的 JSON（key 用英文）`

export const buildScorerUserPrompt = (params: {
  jdTitle: string
  qaList: Array<{ question: string; answer: string; skill: string; evaluation?: any }>
}) => {
  const qaText = params.qaList
    .map(
      (qa, i) =>
        `Q${i + 1} [${qa.skill}]: ${qa.question}\nA${i + 1}: ${qa.answer}\n` +
        (qa.evaluation ? `评分: 深度${qa.evaluation.depthScore} 清晰${qa.evaluation.clarity} 准确${qa.evaluation.accuracy}\n` : ''),
    )
    .join('\n---\n')

  return `请为以下面试生成最终评估报告：

【目标岗位】${params.jdTitle}

【完整 Q&A】
${qaText}

──────────────────────────

【严格输出要求】⭐ 必读 ⭐

⚠️ JSON 的所有 key 必须用英文（不能写中文 key）
⚠️ 必须包含以下 5 个**顶级字段**，且字段名完全一致：
  1. radar (object) — 不能少
  2. overallScore (number) — 不能少
  3. summary (string) — 不能少
  4. strengths (array) — 不能少
  5. suggestions (array) — 不能少

⚠️ 不要用 overall_score / evaluation / candidate_id 等其他字段名
⚠️ 不要嵌套 evaluation 对象

──────────────────────────

【JSON 输出格式示例】（请严格按此结构输出）
{
  "radar": {
    "basic": 10,
    "project": 0,
    "systemDesign": 0,
    "communication": 5
  },
  "overallScore": 5,
  "summary": "候选人在面试中无法回答任何技术问题，对核心概念完全不了解",
  "strengths": [
    "态度端正，配合度高"
  ],
  "suggestions": [
    {
      "area": "前端基础",
      "action": "建议从 HTML/CSS/JavaScript 基础开始系统学习",
      "priority": "high"
    }
  ]
}`
}

// ============== 参考答案生成 Prompt ==============

/**
 * 用于给每道面试题生成"标准参考答案"
 * 让候选人能对照参考答案复盘
 */
export const REFERENCE_ANSWER_SYSTEM = `你是一名资深的技术面试官，正在为候选人提供每道面试题的标准参考答案。

要求：
- 参考答案要**专业、详尽、有深度**，体现高级工程师水平
- 包含核心概念 + 关键原理 + 实战经验 + 常见坑
- 用 markdown 格式组织（标题、列表、代码块都可以）
- 中文输出
- 每题答案控制在 200-500 字（视题目复杂度）
- 如果是项目题，结合实际项目常见做法
- 如果是系统设计题，给出架构图思路`

export const buildReferenceAnswerPrompt = (params: {
  jdTitle: string
  qaList: Array<{
    question: string
    answer: string
    skill: string
    type?: string
    difficulty?: number
  }>
}) => {
  const qaText = params.qaList
    .map(
      (qa, i) =>
        `### 题目 ${i + 1} [${qa.skill} | ${qa.type} | 难度 ${qa.difficulty}]\n问题：${qa.question}\n候选人回答：${qa.answer}`,
    )
    .join('\n\n---\n\n')

  return `请为以下面试题目分别生成**标准参考答案**：

【目标岗位】${params.jdTitle}

【完整 Q&A】
${qaText}

──────────────────────────

【严格输出要求】
- 输出必须是**合法的 JSON 对象**
- JSON 的所有 key 必须用英文
- 字段：answers（数组，每项包含 questionIndex / referenceAnswer）
- questionIndex 是题号（1 开始）
- referenceAnswer 用 markdown 格式（可以用 \\n 换行，**加粗**，\`代码\`，- 列表等）
- 候选人已经答对的部分可以简略，重点补充他/她没提到的内容

【JSON 输出格式示例】
{
  "answers": [
    {
      "questionIndex": 1,
      "referenceAnswer": "## React useEffect vs useLayoutEffect\\n\\n**核心区别**：\\n- **执行时机**：useEffect 在浏览器**绘制之后**异步执行；useLayoutEffect 在 DOM 更新后、**绘制前**同步执行\\n- **SSR 表现**：useLayoutEffect 在 SSR 阶段不会执行，会发出警告..."
    }
  ]
}`
}
