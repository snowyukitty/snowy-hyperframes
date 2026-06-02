# References

查證日期：2026-06-01。所有價格皆以官方頁面當日公開資訊為準；未公開的實際可用量、隱性限流和模型分配不在本專案中編造成固定數字。

## 官方已公開資訊

### OpenAI / Codex

- OpenAI Codex Pricing  
  https://developers.openai.com/codex/pricing  
  用途：Codex Free、Go、Plus、Pro 5x、Pro 20x 的月費與方案差異。

- OpenAI API Pricing  
  https://openai.com/api/pricing/  
  用途：GPT-5.5 / GPT-5.4 / GPT-5.4 mini token 價格、GPT-Image-2 圖片與文字 token 價格、web search `$10 / 1k calls`，以及 API 與 ChatGPT 訂閱分開計費的說明。

### GitHub Copilot / Pi

- GitHub Copilot Plans  
  https://github.com/features/copilot/plans  
  用途：Copilot Free、Pro、Pro+、Max 月費與方案功能；Free 2000 completions/month；Pro `$10/month`、Pro+ `$39/month`、Max `$100/month`。

- GitHub Copilot Models and Pricing  
  https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing  
  用途：GitHub AI Credits 以 token 價格計算，`1 AI credit = $0.01 USD`；code completions 和 next edit suggestions 在 paid plans 中不以 AI credits 計費。

- GitHub Copilot Usage-Based Billing for Individuals  
  https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-individuals  
  用途：Pro / Pro+ / Max 的 base credits、flex allotment 與 total monthly AI credits，以及 chat、CLI、cloud agent、third-party coding agents 等會消耗 AI credits。

- Pi Providers  
  https://pi.dev/docs/latest/providers  
  用途：Pi 支援 subscription providers via OAuth，包括 ChatGPT Plus/Pro (Codex)、Claude Pro/Max、GitHub Copilot；tokens 存在 `~/.pi/agent/auth.json`；也支援 API-key providers。

### Anthropic / Claude Code

- Claude Plan Selection  
  https://support.claude.com/en/articles/11049762-choose-a-claude-plan  
  用途：Claude Free、Pro `$20/month`、Max 5x `$100/month`、Max 20x `$200/month`。

- Use Claude Code with Pro or Max  
  https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan  
  用途：Claude Code 可連接 Pro/Max plan；`ANTHROPIC_API_KEY` 可能讓 Claude Code 使用 API key 而非訂閱；用量上限與 Claude app 共用；超限後可選擇 API credits。

- Claude API Pricing  
  https://platform.claude.com/docs/en/about-claude/pricing  
  用途：Claude Opus / Sonnet / Haiku token 價格、web search `$10 per 1,000 searches`、code execution free hours 與超額費用、Claude Managed Agents runtime pricing。

## 研究或社群背景

- Agentic Coding Assistants: Evidence from a Large-Scale Open-Source Study  
  https://arxiv.org/abs/2601.18341  
  用途：補充 agentic coding adoption 背景。這不是成本來源，也不是採用建議的唯一依據。

## 合理推估

本專案的成本區間是模型，不是官方承諾：

- 小型：2-3 分鐘、8-10 slides、12-25 sources、3-5 images。
- 中型：5 分鐘、12-18 slides、25-50 sources、8-12 images。
- 大型：10+ 分鐘、25+ slides、60+ sources、15-25 images。

推估原則：

- 訂閱方案只視為固定成本，不能等同於無限用量。
- API token、web search、image generation、TTS API、cloud render 都是可獨立計費的邊際成本。
- Edge-TTS 與 local HyperFrames render 的現金成本接近 0，但要記錄服務穩定性、授權風險、環境依賴與人工 QA 時間。
- 若使用 Pi，Pi 是 provider router / CLI harness；真正成本來自 GitHub Copilot、OpenAI、Anthropic、Tavily、Brave 或其他 provider。
