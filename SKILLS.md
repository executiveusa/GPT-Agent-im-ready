# AI Agent Council — Skills & Integration Guide

## Unified LLM Router with BYOK Gateway

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Sphere Visualization System                      │
│    (Real-time agent interaction & responses)             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│         Council Engine with Smart Routing                │
│    (/api/agent-unified for free+BYOK+NVIDIA)            │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    ┌────────┐   ┌───────────────┐  ┌────────┐
    │ Free   │   │ BYOK Gateway  │  │ NVIDIA │
    │ Proxy  │   │  (Synthia)    │  │ (Free) │
    │(fcc)   │   │               │  │        │
    └────────┘   └───────────────┘  └────────┘
        │              │                 │
        ▼              ▼                 ▼
    ┌─────────────────────────────────────────┐
    │  Multi-Provider LLM Routing              │
    │  OpenAI, Anthropic, Groq, Mistral,      │
    │  Together AI, Ollama, Gemini            │
    └─────────────────────────────────────────┘
```

### Running the Complete System

#### 1. Start Free LLM Proxy

```bash
# Install fcc-server if needed
uv tool install --force git+https://github.com/Alishahryar1/free-claude-code.git

# Start proxy (loads ~/.fcc/.env)
fcc-server &
# → Listening on http://localhost:8082
```

#### 2. Start Synthia-Gateway (BYOK Bridge)

```bash
cd /home/user/synthia-gateway
cp .env.example .env
# Edit .env:
# PORT=3000
# SYNTHIA_GATEWAY_KEY=your-shared-secret
# (optional) Add OPENAI_API_KEY, ANTHROPIC_API_KEY, etc for gateway-key mode

npm install
npm start
# → Listening on http://localhost:3000
```

#### 3. Run the Sphere System

```bash
cd /home/user/GPT-Agent-im-ready/client
npm install
npm run dev
# → http://localhost:3000 (App Router)
```

### Operating Modes

#### Free Tier (Default)

Uses `fcc-server` proxy with free provider tiers:
- Fast tasks → Groq (llama-3.3-70b)
- Balanced → Mistral (mistral-small)
- Reasoning → OpenRouter (gpt-oss-20b)

**Activation:** `ENABLE_FREE_TIER=true` + `fcc-server` running

#### BYOK Mode (Bring Your Own Key)

Users provide their own API keys; routed through `synthia-gateway`:

```typescript
// In settings, user enters their key
// System stores in browser localStorage (encrypted recommended)
// Sent to /api/agent-unified with userKey param
// Synthia-gateway routes to correct provider

const response = await fetch('/api/agent-unified', {
  method: 'POST',
  body: JSON.stringify({
    agentId: 'marco',
    prompt: 'Debate the topic',
    userKey: 'sk-proj-user-provided-key', // User's OpenAI key
    model: 'gpt-4o',
  }),
});
```

**Configuration:**
```env
SYNTHIA_GATEWAY_URL=http://localhost:3000
SYNTHIA_GATEWAY_KEY=your-shared-secret  # Only if using gateway-key mode
SYNTHIA_AUTH_MODE=passthrough           # User provides key in request
NEXT_PUBLIC_USE_UNIFIED_ROUTER=true
NEXT_PUBLIC_ENABLE_BYOK_MODE=true
```

#### NVIDIA Free Inference

Direct NVIDIA endpoints for free model inference:

```env
NVIDIA_API_KEY=your-nvidia-api-key
```

Supported models:
- `nvidia/llama2-70b`
- `nvidia/mistral-7b`
- `nvidia/nemotron-70b`

#### Hybrid Mode

Automatically falls back between tiers:
1. User key provided? → Route through BYOK gateway
2. Free tier available? → Use fcc-server proxy
3. NVIDIA free available? → Use NVIDIA endpoint
4. Fallback to demo response

### API Endpoints

#### `/api/agent-unified` (New)

Smart routing endpoint supporting free, BYOK, and NVIDIA.

```bash
# Free tier (default)
curl -X POST http://localhost:3000/api/agent-unified \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "marco",
    "prompt": "Hello!",
    "model": "claude-sonnet-4-5"
  }'

# BYOK mode (user provides key)
curl -X POST http://localhost:3000/api/agent-unified \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "luna",
    "prompt": "Analyze this",
    "userKey": "sk-proj-user-key",
    "model": "gpt-4o"
  }'

# Streaming
curl -X POST http://localhost:3000/api/agent-unified \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "marco",
    "prompt": "Stream response",
    "stream": true
  }'
```

#### `/api/agent-unified?GET` (Health)

```bash
curl http://localhost:3000/api/agent-unified

# Response
{
  "ok": true,
  "status": "operational",
  "providers": {
    "free-proxy": true,
    "synthia-gateway": true,
    "nvidia": true
  }
}
```

### Integration with Sphere Visualization

The sphere system automatically:

1. **Displays provider badge** on each agent message
   - 🟢 Free (Groq/Mistral/OpenRouter via fcc-server)
   - 🔵 BYOK (User key via Synthia-gateway)
   - 🟡 NVIDIA (Free inference)
   - ⚪ Demo (Fallback)

2. **Color-codes agent orbs** by speaking state:
   - Bright glow = Currently responding
   - Dim = Idle
   - Pulsing = Thinking

3. **Shows energy links** between agents during debate/podcast modes

4. **Real-time error display** in chat:
   - Invalid key → "Please add valid API key in settings"
   - Provider down → "Free tier temporarily unavailable, using demo"
   - Rate limit → "Too many requests, try again in 30s"

### Settings UI

Users can configure:

```typescript
interface UserSettings {
  // Provider selection
  defaultProvider: 'free' | 'byok' | 'nvidia' | 'auto';

  // BYOK mode keys
  openaiKey?: string;
  anthropicKey?: string;
  groqKey?: string;
  mistralKey?: string;

  // Advanced
  synthiaGatewayUrl?: string;
  nvidiaApiKey?: string;

  // Display
  showProviderBadges: boolean;
  enableReducedMotion: boolean;
}
```

### Testing the Setup

```bash
# 1. Check free proxy health
curl -s http://localhost:8082/v1/models -H "x-api-key: freecc" | jq .

# 2. Check Synthia-gateway health
curl -s http://localhost:3000/health | jq .

# 3. Test unified router (free tier)
npm run test:router

# 4. Test sphere visualization
# Open http://localhost:3000/council in browser
# Start a debate round
# Verify spheres animate and show provider badges

# 5. Test BYOK mode (with your key)
# Go to /settings, enter your OpenAI key
# Start a new council round
# Verify response shows "BYOK" provider badge
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `fcc-server: command not found` | `uv tool install git+https://github.com/Alishahryar1/free-claude-code.git` |
| `Cannot connect to http://localhost:8082` | Check `fcc-server` is running: `ps aux \| grep fcc-server` |
| `Synthia-gateway responds 502` | Ensure `.env` PORT is set correctly and no other service on :3000 |
| BYOK key rejected | Verify key format matches provider (e.g., `sk-proj-*` for OpenAI) |
| Free tier timing out | Check provider rate limits (Groq: 30req/min free) |
| Spheres not animating | Check browser console for errors; verify Chrome/Chromium |

### Architecture Files

- **Client Router:** `client/src/lib/llm-router.ts`
- **Council Integration:** `client/src/lib/council.ts`
- **API Endpoint:** `client/src/app/api/agent-unified/route.ts`
- **Backend Config:** `backend/synthia-gateway-config.js`
- **Sphere System:** `client/src/world/spheres/*`
- **Settings Store:** `client/src/lib/settings-store.ts`

### Next Steps (Future)

- [ ] Full E2E test suite for all provider tiers
- [ ] Auto-retry with fallback provider on rate limit
- [ ] Key encryption in localStorage
- [ ] Streaming performance optimizations
- [ ] Multi-region proxy support
- [ ] Cost tracking per provider/model
- [ ] Provider availability dashboard
- [ ] Custom model routing rules UI

---

**Status:** ✅ Free tier working | ✅ BYOK gateway integrated | ✅ NVIDIA support ready | ✅ Spheres wired
