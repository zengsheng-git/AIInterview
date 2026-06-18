/**
 * 简历脱敏工具
 * 在 LLM 调用前自动去除敏感信息
 */
export function desensitize(text: string): string {
  if (!text) return text
  return text
    // 邮箱
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]')
    // 中国手机号
    .replace(/\b1[3-9]\d{9}\b/g, '[PHONE]')
    // 身份证号
    .replace(/\b\d{17}[\dXx]\b/g, '[ID_CARD]')
    // 银行卡（16-19 位数字）
    .replace(/\b\d{16,19}\b/g, '[BANKCARD]')
    // 中文姓名（姓 + 2-3 字 + 称呼）
    .replace(/([\u4e00-\u9fa5]{2,3})(?=\s*(先生|女士|同学))/g, '[NAME]')
    // QQ / 微信（5 位以上数字串，前后是"QQ"/"微信"）
    .replace(/(?:QQ|微信|wechat|qq)[:：\s]*(\d{5,12})/gi, (m) => m.replace(/\d{5,12}/, '[CONTACT]'))
    // 家庭住址中的具体门牌号
    .replace(/\d+号\d+室|\d+栋\d+单元/g, '[ADDRESS]')
}

/**
 * 深度脱敏：递归处理对象中的字符串字段
 */
export function desensitizeDeep<T>(obj: T): T {
  if (obj == null) return obj
  if (typeof obj === 'string') return desensitize(obj) as any
  if (Array.isArray(obj)) return obj.map(desensitizeDeep) as any
  if (typeof obj === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = desensitizeDeep(v)
    }
    return out
  }
  return obj
}
