# 參考資料與來源整理

查找日期：2026-06-01。

## 1. 官方已公開資訊

| 主張 | 來源 |
| --- | --- |
| ChatGPT Images 2.0 開放給所有方案；Images with thinking 開放給 Plus、Pro、Business。 | OpenAI Help Center: Images in ChatGPT https://help.openai.com/en/articles/11084440-chatgpt-images-faq |
| Free 為有限且較慢的 image generation；Plus 有更複雜且更準確的 image creation；Pro 有 unlimited and faster image creation，但受 abuse guardrails 限制。 | ChatGPT Pricing https://chatgpt.com/pricing/ |
| Pro $100 為 Plus 的 5x 使用量，Pro $200 為 Plus 的 20x 使用量；可能因濫用防護而暫時限制。 | OpenAI Help Center: About ChatGPT Pro tiers https://help.openai.com/en/articles/9793128-about-chatgpt-pro-plans |
| GPT Image 2 是 API 的圖片生成與編輯模型；API Free tier 不支援 gpt-image-2，付費 tier 以 IPM 顯示速率限制。 | OpenAI API Docs: GPT Image 2 https://developers.openai.com/api/docs/models/gpt-image-2 |
| Image Generation API rate limits 依模型與 usage tier 而定，應以帳戶 limits page 為準。 | OpenAI Help Center: Image Generation Rate Limits https://help.openai.com/en/articles/6696591-what-are-the-rate-limits-for-image-generation |
| ChatGPT Images 2.0 有多層安全阻擋與模型級防護。 | OpenAI Deployment Safety System Card https://deploymentsafety.openai.com/chatgpt-images-2-0/chatgpt-images-2-0.pdf |

## 2. 社群實測或使用者回報

| 回報 | 來源 | 使用方式 |
| --- | --- | --- |
| 有使用者提到舊 workflow 曾被理解為 40 prompts / 3 hours、約 200 images / day，並回報隱藏月度限制。 | OpenAI Developer Community https://community.openai.com/t/image-generation-monthly-limits/1321913 | 僅作為舊模型或舊 UI 的社群線索。 |
| 有 Plus 使用者回報每天 60-70 張，也有 Free 3/day 或 6/day 的回報。 | Reddit r/OpenAI https://www.reddit.com/r/OpenAI/comments/1jqr16w/what_is_the_daily_limit_for_image_generation_for/ | 僅作為不可保證的使用者經驗。 |
| 有 Pro/Basic 使用者討論 Basic 約 5-10/day、Pro 是否更高。 | Reddit r/OpenAI https://www.reddit.com/r/OpenAI/comments/1tfte1n/chatgpt_pro_image_creation_rates/ | 低可信度，不能當方案承諾。 |
| 有 Plus 使用者回報 50/24h、30 天鎖定或疑似 bug。 | Reddit r/ChatGPT https://www.reddit.com/r/ChatGPT/comments/1mdoep4/plus_plan_image_generation_limit_bug/ | 用於提醒動態限制與誤判風險。 |

## 3. 合理推估

| 方案 | 可行估算 | 相對安全建議 | 標記 |
| --- | --- | --- | --- |
| Free | 3-10/day | 1-3/day | 估算值 |
| Plus | 10-60/day | 10-30/day | 估算值 |
| Pro | 50-200+/day | 50-150/day | 估算值 |

這些數字不是 OpenAI 官方配額。它們是以官方相對方案描述、API/ChatGPT 區隔、社群回報分布與濫用防護風險做出的保守工作流建議。
