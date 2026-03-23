# Pre-Flight Checklist

Personal to-do list before handing the build to Copilot.
Work top to bottom — each section unlocks the next.

---

## 1. Local Tooling

Verify or install everything first so nothing blocks you mid-setup.

```bash
node --version        # must be >= 20 — if not: brew install node@20
pnpm --version        # if missing: npm install -g pnpm
supabase --version    # if missing: brew install supabase/tap/supabase
vercel --version      # if missing: npm install -g vercel@latest
gh --version          # if missing: brew install gh && gh auth login
```

---

## 2. Domain — Switch DNS to Vercel + Email Forwarding

> Do this first so DNS propagates while you finish everything else.
> Vercel manages all DNS — no Cloudflare access needed.

### 2a. Point nameservers to Vercel

1. Log in to wherever you **registered** `stopone.club` (GoDaddy, Namecheap, Google Domains, etc.)
2. Find the nameserver settings for the domain
3. In Vercel dashboard → **Domains** → Add `stopone.club` → choose **"Add nameservers"**
4. Vercel gives you two nameservers, e.g.:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
5. Replace the existing nameservers (Cloudflare's) with Vercel's at your registrar
6. Save — propagation takes 10 min to a few hours

> Once propagated, Vercel controls all DNS for `stopone.club` and automatically
> handles the A record pointing to your deployment. No CNAME needed manually.

### 2b. ImprovMX — free email forwarding

ImprovMX forwards `@stopone.club` emails to your personal Gmail. Free, works with any DNS.

1. [improvmx.com](https://improvmx.com) → Sign up → **Add a domain** → `stopone.club`
2. ImprovMX gives you two MX records to add
3. In Vercel dashboard → Domains → `stopone.club` → **DNS Records** → Add:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | `@` | `mx1.improvmx.com` | `10` |
| MX | `@` | `mx2.improvmx.com` | `20` |

4. Back in ImprovMX → **Aliases** tab → create:

| Alias | Forward to |
|-------|-----------|
| `hello` | your personal Gmail |
| `admin` | your personal Gmail |

5. Optional: enable **Catch-all** → your Gmail (catches anything else sent to `@stopone.club`)

**Test it:** send an email to `admin@stopone.club` — should arrive in your Gmail within a minute.

### 2c. Gmail "Send As" *(optional — reply from @stopone.club)*

> Come back after step 5 (Resend) — you need the API key first.

Gmail → Settings → Accounts → **Add another email address**

| Field | Value |
|-------|-------|
| Name | Stop One |
| Email | `hello@stopone.club` |
| SMTP host | `smtp.resend.com` |
| Port | `587` (TLS) |
| Username | `resend` |
| Password | your `RESEND_API_KEY` |

---

## 3. GitHub Repository

```bash
cd /Users/pete/Code/clubstack-events/stop1

git init
git branch -M main
git remote add origin git@github.com:[YOUR_ORG]/stop1.git

# Stage planning docs only — no code yet
git add CLAUDE.md AGENTS.md ISSUES.md PREFLIGHT.md docs/
git commit -m "chore: project planning docs and issue structure"
git push -u origin main
```

GitHub → repo → **Settings → Branches → Add branch protection rule** for `main`:
- [x] Require a pull request before merging
- [x] Require status checks to pass *(add `build` check after issue #27 merges)*
- [x] Do not allow bypassing the above settings

---

## 4. Supabase Project

1. [supabase.com](https://supabase.com) → New project
2. Name: `stop1` · Region: **US East 1**
3. Set a strong DB password and save it

**Copy these to your notes:**

| Env var | Where to find it |
|---------|-----------------|
| `PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Settings → API → Project API keys |
| `SUPABASE_SERVICE_KEY` ⚠️ | Settings → API → Project API keys (reveal) |
| `SUPABASE_PROJECT_ID` | URL bar: `supabase.com/project/`**`<this-part>`** |

```bash
supabase login
supabase link --project-ref <SUPABASE_PROJECT_ID>
```

**Create admin user:**
Supabase → Authentication → Users → **Add user**
Email: `admin@stopone.club` · set a strong password → save it

---

## 5. Resend (Transactional Email)

Handles RSVP confirmations + day-of reminders. Separate from the team forwarding inbox.

1. [resend.com](https://resend.com) → Sign up
2. Dashboard → **Domains → Add Domain** → `stopone.club`
3. Resend gives you DNS records. Add them in **Vercel dashboard → Domains → stopone.club → DNS Records**:

| Type | Name | Content | Notes |
|------|------|---------|-------|
| TXT | `resend._domainkey` | `p=MIGf…` *(Resend provides)* | DKIM signing |
| TXT | `@` | `v=spf1 include:amazonses.com ~all` | SPF — merge if one already exists |

> Resend may also add a `_dmarc` TXT record — add that too if prompted.

4. Click **Verify** in Resend *(usually < 5 min)*
5. **API Keys → Create** (Full access) → copy it

**Save:**
- `RESEND_API_KEY` = key from above
- `EMAIL_FROM` = `noreply@stopone.club`

---

## 6. Stripe

1. [dashboard.stripe.com](https://dashboard.stripe.com)
2. Toggle to **Test mode** (top-right)
3. **Developers → API keys:**
   - Publishable key → `PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key (click Reveal) → `STRIPE_SECRET_KEY`

No webhook needed — door payments use client-side confirmation.
Switch to live mode keys only when going live.

---

## 7. Vercel Project

The domain is already added from step 2. Now link the project:

1. [vercel.com](https://vercel.com) → New Project → Import from GitHub → `stop1`
2. Framework preset: **Astro**
3. Skip env vars for now
4. Click Deploy *(will fail — fine, no code yet)*

```bash
cd /Users/pete/Code/clubstack-events/stop1
vercel link
cat .vercel/project.json   # note orgId + projectId for step 12
```

Vercel dashboard → stop1 → **Settings → Domains** → confirm `stopone.club` is connected
(it should already be there from step 2 — just verify the deployment is assigned to it).

---

## 8. Vercel Blob (Expense Receipts)

Vercel dashboard → stop1 → **Storage → Create Database → Blob**
Name: `stop1-receipts` · Connect to project → auto-adds `BLOB_READ_WRITE_TOKEN`

```bash
vercel env pull .env.local
# Pulls BLOB_READ_WRITE_TOKEN + any other vars already on the project
```

---

## 9. Generate COOKIE_SECRET

Signs door session and collaborator session cookies. Generate once, never change.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 10. Complete `.env.local`

After step 8, `.env.local` has `BLOB_READ_WRITE_TOKEN` pre-filled. Add the rest:

```
PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_PROJECT_ID=xxxxxxxxxxxx

COOKIE_SECRET=<64-char hex from step 9>

STRIPE_SECRET_KEY=sk_test_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

RESEND_API_KEY=re_...
EMAIL_FROM=noreply@stopone.club

BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Optional — Twilio SMS (leave commented until needed)
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_FROM_NUMBER=
```

```bash
grep -E "^[A-Z]" .env.local | grep -v "^#" | wc -l   # should be >= 9
```

> `.env.local` must be in `.gitignore` — never commit it.

---

## 11. Push Env Vars to Vercel

```bash
vercel env add PUBLIC_SUPABASE_URL
vercel env add PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add SUPABASE_PROJECT_ID
vercel env add COOKIE_SECRET
vercel env add STRIPE_SECRET_KEY
vercel env add PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add RESEND_API_KEY
vercel env add EMAIL_FROM
# BLOB_READ_WRITE_TOKEN already there from step 8
```

Each command asks which environments — select all three.

---

## 12. GitHub Actions Secrets

GitHub → stop1 repo → **Settings → Secrets and variables → Actions**

| Secret | Source |
|--------|--------|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create ("GitHub Actions") |
| `VERCEL_ORG_ID` | `cat .vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | `cat .vercel/project.json` → `projectId` |
| `PUBLIC_SUPABASE_URL` | `.env.local` |
| `PUBLIC_SUPABASE_ANON_KEY` | `.env.local` |
| `SUPABASE_PROJECT_ID` | `.env.local` |

---

## 13. GitHub Labels

```bash
cd /Users/pete/Code/clubstack-events/stop1

gh label create foundation    --color 6366f1 --description "Project setup, scaffolding"
gh label create admin         --color f59e0b --description "Admin-only features"
gh label create auth          --color ef4444 --description "Authentication flows"
gh label create events        --color 3b82f6 --description "Event CRUD"
gh label create rsvp          --color 10b981 --description "RSVP module"
gh label create door          --color f97316 --description "Door app"
gh label create payments      --color 8b5cf6 --description "Stripe + payment flows"
gh label create budget        --color 14b8a6 --description "Budget / P&L"
gh label create collaborators --color ec4899 --description "Collaborator management"
gh label create notifications --color 6b7280 --description "Email / SMS"
gh label create tooling       --color 374151 --description "Scripts, CI, types"
gh label create ci            --color 1d4ed8 --description "CI/CD pipelines"
gh label create database      --color 92400e --description "Migrations, schema"
gh label create ui            --color 065f46 --description "UI components, layouts"
gh label create public        --color 0e7490 --description "Public-facing pages"
gh label create stripe        --color 5850ec --description "Stripe-specific work"
```

---

## 14. GitHub Milestones

```bash
REPO="[YOUR_ORG]/stop1"

gh api repos/$REPO/milestones --method POST -f title="0 — Foundation"      -f state=open
gh api repos/$REPO/milestones --method POST -f title="1 — Admin Auth"      -f state=open
gh api repos/$REPO/milestones --method POST -f title="2 — Events CRUD"     -f state=open
gh api repos/$REPO/milestones --method POST -f title="3 — Collaborators"   -f state=open
gh api repos/$REPO/milestones --method POST -f title="4 — RSVP Module"     -f state=open
gh api repos/$REPO/milestones --method POST -f title="5 — Door App"        -f state=open
gh api repos/$REPO/milestones --method POST -f title="6 — Budget"          -f state=open
gh api repos/$REPO/milestones --method POST -f title="7 — Notifications"   -f state=open
gh api repos/$REPO/milestones --method POST -f title="8 — CI/CD & Tooling" -f state=open
```

---

## 15. Create GitHub Issues

Open `ISSUES.md` and create each of the 28 issues in GitHub.
Use title, body, labels, and milestone from each entry.

GitHub → stop1 → Issues → **New issue** → copy/paste × 28.

---

## 16. Seed Data *(after Foundation milestone merges)*

```bash
supabase db push

# Generate bcrypt hash for test PIN "1234"
node -e "const b = require('bcryptjs'); b.hash('1234', 10).then(h => console.log(h))"
```

Supabase dashboard → SQL editor:
```sql
INSERT INTO events (title, slug, date, venue_name, door_price, door_pin, status)
VALUES (
  'Test Event', 'test-event',
  NOW() + INTERVAL '7 days',
  'Test Venue', 20.00,
  '<paste bcrypt hash here>',
  'published'
);
```

---

## Readiness Checklist

**Domain & Email**
- [ ] Nameservers changed to Vercel at registrar
- [ ] `stopone.club` added and verified in Vercel Domains
- [ ] ImprovMX set up — MX records added in Vercel DNS, aliases created
- [ ] Test email to `admin@stopone.club` arrives in Gmail
- [ ] Resend domain verified (green checkmark)
- [ ] *(optional)* Gmail Send As for `hello@stopone.club`

**Accounts & Services**
- [ ] Supabase project created, CLI linked
- [ ] Supabase admin user created (`admin@stopone.club`)
- [ ] Vercel project created, domain connected, CLI linked
- [ ] Vercel Blob store created and connected
- [ ] Stripe test mode keys obtained
- [ ] Resend API key obtained

**Local Environment**
- [ ] `.env.local` — all 9+ vars filled
- [ ] `vercel env pull` ran successfully
- [ ] All CLI tools installed

**GitHub**
- [ ] Repo pushed with planning docs
- [ ] Branch protection on `main`
- [ ] 6 Actions secrets set
- [ ] 16 labels created
- [ ] 9 milestones created
- [ ] 28 issues created

**Build ready**
- [ ] Seed event inserted (after Foundation merges)

**When all boxes checked → hand Wave 1 to Copilot: issues #1, #4, #27 in parallel.**
