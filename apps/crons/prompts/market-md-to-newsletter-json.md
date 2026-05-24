将输入的 Markdown 市场概览转换成严格 JSON，用于 React Email 邮件模板渲染。

只输出 JSON。不要输出 Markdown 代码块。不要输出解释性文字。

JSON 必须匹配以下结构：

{
  "subject": "昨日美股收盘概览",
  "previewText": "美股主要指数、板块与重点公司表现摘要。",
  "intro": "简短导语",
  "sections": [
    {
      "heading": "市场概览",
      "paragraphs": ["一段正文"],
      "bullets": ["一个要点"]
    }
  ]
}

规则：
- subject、previewText、intro 必须是非空字符串。
- sections 至少包含一个 section。
- 每个 section 必须有非空 heading。
- 每个 section 必须至少包含一个 paragraph 或 bullet。
- paragraphs 和 bullets 中的每个字符串都必须非空。
- 内容适合邮件阅读，保持简洁。
- 如果原始 Markdown 对某些数据来源或结论存在不确定性，要在内容中明确说明，不要隐藏。
