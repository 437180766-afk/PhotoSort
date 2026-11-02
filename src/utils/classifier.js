export const CATEGORIES = ['票据', '证件', '医疗', '文档', '生活', '屏幕截图']

const SCREENSHOT_WORDS = ['截图', '验证码', '聊天记录', '聊天截图', '屏幕截图']
const RULES = [
  ['票据', ['增值税发票', '发票', '税号', '小写', '收款', '付款', '小票', '微信支付', '支付宝', '订单', '收据']],
  ['证件', ['身份证', '公民身份号码', '驾驶证', '银行卡', '卡号', '姓名', '民族', '住址']],
  ['医疗', ['化验单', '检验报告', 'ct', 'x 光', 'x光', '血常规', '肝功能', '病历', '处方', '药品']],
  ['文档', ['附件', '页码', '说明', '合同', '笔记', '纸质资料']]
]

export function classifyPhoto(ocrText, photo) {
  const text = String(ocrText || '').toLowerCase()
  if (photo && photo.isScreenshot) return '屏幕截图'
  if (SCREENSHOT_WORDS.some(word => text.includes(word.toLowerCase()))) return '屏幕截图'
  for (const [category, keywords] of RULES) {
    if (keywords.some(word => text.includes(word.toLowerCase()))) return category
  }
  if (photo && photo.documentLike) return '文档'
  return '生活'
}
