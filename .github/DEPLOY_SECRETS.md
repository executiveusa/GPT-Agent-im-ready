# GitHub Actions Secrets Setup

Add these to **Settings → Secrets and variables → Actions** in each repo.

## Required for Vercel
| Secret | Where to get it |
|--------|----------------|
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | `team_xxx` from Vercel team settings |
| `VERCEL_PROJECT_ID` | `prj_xxx` from Vercel project settings |

## Required for Coolify
| Secret | Where to get it |
|--------|----------------|
| `COOLIFY_WEBHOOK_URL` | Coolify app → Webhooks tab → copy URL |
| `COOLIFY_TOKEN` | Coolify → API Tokens |

## Required for Hostinger VPS
| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP, e.g. `185.x.x.x` |
| `VPS_USER` | SSH user, e.g. `root` or `ubuntu` |
| `VPS_SSH_KEY` | Full private key content (PEM), generate with: `ssh-keygen -t ed25519` |
| `VPS_APP_DIR` | App root on server, e.g. `/var/www/myapp` |
| `VPS_PM2_NAME` | PM2 process name (leave blank if static site) |

**Add public key to VPS:**
```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-vps-ip
```

## Required for Cloudflare Pages
| Secret | Where to get it |
|--------|----------------|
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com → My Profile → API Tokens → Create Token (Pages:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | dash.cloudflare.com → right sidebar |
| `CLOUDFLARE_PROJECT_NAME` | Your Pages project name in Cloudflare |

## Optional
| Secret | Purpose |
|--------|---------|
| `PRODUCTION_URL` | Live URL used by post-deploy smoke test (fallback) |

## Auto-merge setup
The `auto-merge.yml` workflow merges PRs automatically when CI passes.
To opt a PR in, **no label is required** — every PR merges on green CI.
To opt a specific PR out, close it without merging.

Branch protection rule recommended:
- Require status checks: `Lint & Auto-fix`, `Build`, `Check for 404s`
- Require branches to be up to date before merging
- Enable `Allow auto-merge` in repo settings
