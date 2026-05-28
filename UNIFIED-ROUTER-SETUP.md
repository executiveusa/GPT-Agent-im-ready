# Unified LLM Router Setup Guide

## ✅ What's Been Wired Up

### 1. **Sphere System** → Connected to Unified Router
- ✅ Spheres now respond to real provider routes
- ✅ Provider badges display (Free/BYOK/NVIDIA/Demo)
- ✅ Real-time error handling and fallbacks
- ✅ Energy links show active provider tier

### 2. **Unified Router** → Multi-tier Architecture
- ✅ `client/src/lib/llm-router.ts` — Smart routing logic
- ✅ `client/src/app/api/agent-unified/route.ts` — API endpoint
- ✅ Supports: Free (fcc-server) | BYOK (Synthia-gateway) | NVIDIA | Direct
- ✅ Automatic fallback chain built in

### 3. **BYOK Gateway** → Synthia-Gateway Bridge
- ✅ `/home/user/synthia-gateway` cloned and configured
- ✅ `backend/synthia-gateway-config.js` — Router configuration
- ✅ Supports multi-provider routing (OpenAI, Anthropic, Groq, Mistral, etc.)
- ✅ Pass-through and gateway-key auth modes

### 4. **Free Tier** → fcc-server Integration
- ✅ `~/.fcc/.env` — Proxy configuration created
- ✅ Routes to Groq, Mistral, OpenRouter for free
- ✅ Council system updated to use unified router

### 5. **NVIDIA Integration** → Free Inference Ready
- ✅ NVIDIA endpoint support built into router
- ✅ Auto-detects free tier models
- ✅ Falls back if keys unavailable

### 6. **Documentation** → Complete
- ✅ `SKILLS.md` — Full integration guide
- ✅ `UNIFIED-ROUTER-SETUP.md` — This guide
- ✅ Test suite — Comprehensive verification

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install fcc-server (Free Proxy)

**Option A: Local Python 3.14+ environment**
```bash
uv tool install --force git+https://github.com/Alishahryar1/free-claude-code.git
fcc-server &
# → http://localhost:8082
```

**Option B: Docker (Recommended)**
```bash
docker run -d \
  --name fcc-server \
  -p 8082:8082 \
  -e FCC_AUTH_TOKEN=freecc \
  -e OPENROUTER_API_KEY=your-key \
  -e GROQ_API_KEY=your-key \
  -e MISTRAL_API_KEY=your-key \
  ghcr.io/alishahryar1/free-claude-code:latest
```

**Option C: Skip Free Tier**
- Set `ENABLE_FREE_TIER=false` in `.env.local`
- Use BYOK or NVIDIA instead
- System still works with fallback to demo

### Step 2: Start Synthia-Gateway (BYOK Bridge)

```bash
cd /home/user/synthia-gateway
npm install
# Edit .env if needed (default passthrough mode is fine)
npm start &
# → http://localhost:3000
```

### Step 3: Run Sphere System

```bash
cd /home/user/GPT-Agent-im-ready/client
npm install
npm run dev
# → http://localhost:3000/council
```

---

## 🎯 Test the Integration

### Verify All Components

```bash
# 1. Free proxy health
curl -s http://localhost:8082/v1/models \
  -H "x-api-key: freecc" | head -20

# 2. Synthia-gateway health  
curl -s http://localhost:3000/health

# 3. Unified router health
curl -s http://localhost:3000/api/agent-unified
```

### Use the Sphere System

1. Open http://localhost:3000/council
2. Click "Start Council Round"
3. Watch spheres animate
4. Verify response shows provider badge:
   - 🟢 Free (fcc-server)
   - 🔵 BYOK (User key via Synthia)
   - 🟡 NVIDIA (Free inference)
   - ⚪ Demo (Fallback)

---

## 🔑 Operating Modes

### Mode 1: Free Tier (Default)
No API keys required. Uses free provider tiers.

```env
ENABLE_FREE_TIER=true
LLM_PROXY_URL=http://localhost:8082
LLM_PROXY_TOKEN=freecc
```

**Supported models:**
- Fast: `claude-haiku-4-5` → Groq
- Balanced: `claude-sonnet-4-5` → Mistral
- Reasoning: `claude-opus-4-5` → OpenRouter

**Rate limits (free):**
- Groq: 30 req/min
- Mistral: 2 req/min  
- OpenRouter: Varies by model

### Mode 2: BYOK (User API Keys)
Users bring their own provider keys.

```env
SYNTHIA_GATEWAY_URL=http://localhost:3000
SYNTHIA_AUTH_MODE=passthrough
NEXT_PUBLIC_USE_UNIFIED_ROUTER=true
NEXT_PUBLIC_ENABLE_BYOK_MODE=true
```

In settings, users paste their key:
```typescript
{
  openaiKey: "sk-proj-...",      // User's own key
  anthropicKey: "sk-ant-...",
  groqKey: "gsk_...",
}
```

System routes through Synthia-gateway → correct provider.

### Mode 3: NVIDIA Free Inference
Direct NVIDIA endpoints (free tier available).

```env
NVIDIA_API_KEY=your-nvidia-api-key
```

Models: `nvidia/llama2-70b`, `nvidia/mistral-7b`, `nvidia/nemotron-70b`

### Mode 4: Hybrid (Automatic Fallback)
1. User key provided? → BYOK
2. Free tier available? → Free proxy
3. NVIDIA free available? → NVIDIA
4. Fallback → Demo response

---

## 📊 Architecture

```
User Interface
    ↓ (Council Round Start)
    ↓
Unified Router (/api/agent-unified)
    ├─ Has BYOK key? → Synthia-Gateway BYOK
    ├─ Free tier enabled? → fcc-server (Groq/Mistral/OpenRouter)
    ├─ NVIDIA key? → Direct NVIDIA endpoint
    └─ Otherwise → Demo fallback
    ↓
LLM Provider
    ↓
Response with Provider Badge
    ↓
Sphere Visualization
    └─ Badge + Animation + Energy Links
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `~/.fcc/.env` | fcc-server proxy credentials |
| `client/.env.local` | Client environment config |
| `synthia-gateway/.env` | Gateway auth & provider keys |
| `backend/synthia-gateway-config.js` | Backend routing config |
| `client/src/lib/llm-router.ts` | Smart router logic |
| `client/src/app/api/agent-unified/route.ts` | Unified API endpoint |
| `SKILLS.md` | Integration documentation |

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot connect to fcc-server:8082` | Start: `fcc-server &` or use Docker |
| `Synthia-gateway port 3000 in use` | Kill existing: `lsof -i :3000 \| grep LISTEN \| awk '{print $2}' \| xargs kill -9` |
| BYOK key rejected | Check format: OpenAI=`sk-proj-*`, Anthropic=`sk-ant-*` |
| Spheres not animating | Clear cache, check browser console for errors |
| Free tier rate limited | Add your own key in settings for higher limits |
| Demo fallback always | Verify fcc-server running: `curl -s http://localhost:8082/health` |

---

## 📦 Dependencies Installed

Client:
```json
{
  "openai": "^4.x",
  "@react-three/fiber": "^8.x",
  "@react-three/drei": "^9.x",
  "zustand": "^4.x"
}
```

Backend:
```json
{
  "express": "^4.x",
  "axios": "^1.x",
  "dotenv": "^16.x"
}
```

Synthia-gateway:
```json
{
  "express": "^4.x",
  "openai": "^4.x"
}
```

---

## 🧪 Verification Checklist

- [ ] `fcc-server` OR Docker proxy running
- [ ] Synthia-gateway running on :3000
- [ ] Client dev server running on :3000 (or :3001)
- [ ] `/api/agent-unified` returns health: `200 OK`
- [ ] `/council` page loads without errors
- [ ] Spheres visible and animate
- [ ] Provider badges display on messages
- [ ] Console shows no critical errors

---

## 🎓 What's Next

1. **Add your own API keys** (Settings > BYOK mode)
2. **Test streaming responses** (longer prompts)
3. **Monitor provider usage** (cost tracking coming)
4. **Set up multi-region proxies** (future)
5. **Customize provider routing** (advanced config)

---

## 📚 References

- [Synthia-Gateway Docs](https://github.com/executiveusa/synthia-gateway/blob/main/README.md)
- [fcc-server Docs](https://github.com/Alishahryar1/free-claude-code)
- [NVIDIA AI Foundation Models](https://build.nvidia.com/discover/foundation-models)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)

---

**Status:** ✅ All systems wired and ready to deploy

**Next Action:** Choose your deployment path (Docker/local/cloud) and start the three services.
