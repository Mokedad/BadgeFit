# Put BadgeFit online

One small server runs everything: the app, the website, HTTPS, the community and Jarvis.
About 30 minutes, about A$10 a month.

## 1. Get a server (10 min)

Any cloud server with **Ubuntu 24.04**, **2 GB RAM** (1 GB works, but the first build is slow),
in **Sydney** so it is fast for Australian users:

| Provider | Plan | About |
|---|---|---|
| DigitalOcean | Basic Droplet, 2 GB, Sydney | US$12/mo |
| Vultr | Cloud Compute, 2 GB, Sydney | US$10/mo |
| Hetzner | CPX11 (no Australian region, slower here) | €5/mo |

Choose **SSH key** login if you can. Write down the server's **IP address**.

## 2. Get a domain and point it at the server (5 min, then wait)

Buy a domain, for example `badgefit.com.au` (needs an ABN) or `badgefit.app`. In the
registrar's DNS settings add two **A records**, both to your server's IP:

| Type | Name | Value |
|---|---|---|
| A | `@` | your server IP |
| A | `app` | your server IP |
| A | `www` | your server IP |

DNS can take from a few minutes to an hour to work.

## 3. Run the setup (10 min)

Log in to the server (`ssh root@YOUR_IP`) and run:

```bash
curl -fsSL https://raw.githubusercontent.com/Mokedad/Police-Training-App/claude/police-fitness-app-6cw4hy/deploy/setup.sh | sudo bash
```

If the GitHub repository is private, that link will not work: clone it with your GitHub login
instead, then run `sudo bash Police-Training-App/deploy/setup.sh`.

It asks for your website domain, your email and (optionally) a Spotify Client ID, then builds
and starts everything, sets up HTTPS, the firewall and a nightly backup.

## 4. Make yourself the admin (2 min)

Open `https://app.YOURDOMAIN` and **create your profile straight away**: the first profile
becomes the admin. Then, in the app: **BadgeFit → Build my programme**, set your **test date**,
and log your baseline tests.

On your phone: open the same address in Safari (iPhone) or Chrome (Android) → **Share → Add
to Home Screen**. It opens full-screen like a normal app.

## 5. Switch on Jarvis (5 min)

Jarvis's chat needs an AI provider. Get an API key (for example from console.anthropic.com,
platform.openai.com, or a free Google Gemini key from aistudio.google.com), then in the app:
**Settings → Admin dashboard → AI Coach**, choose the provider, paste the key, and connect.
You set a daily limit per person there, which keeps the cost under control.

The daily briefing, "Hear it" and everything else work without a key.

## 6. Continue with Google / Apple (optional)

The sign-in screen shows **Continue with Google / Apple** as soon as the keys are in
`/opt/badgefit/deploy/.env`. After adding them, run the setup command again.

**Google (free, about 10 min):** console.cloud.google.com → create a project → **APIs & Services
→ OAuth consent screen** (External, app name BadgeFit, your email) → **Credentials → Create
credentials → OAuth client ID → Web application**. Under *Authorised redirect URIs* add
`https://app.YOURDOMAIN/api/auth/google/callback`. Copy the **Client ID** and **Client secret**
into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

**Apple (needs an Apple Developer account, about A$149/year):** developer.apple.com → Certificates,
IDs & Profiles → **Identifiers → Services IDs** → new, tick *Sign in with Apple*, configure with
domain `app.YOURDOMAIN` and return URL `https://app.YOURDOMAIN/api/auth/apple/callback`. Then
**Keys** → new key with *Sign in with Apple* → download the `.p8` file. Fill in `APPLE_SERVICES_ID`
(the Services ID), `APPLE_TEAM_ID` (top right of the developer site), `APPLE_KEY_ID` and
`APPLE_PRIVATE_KEY` (the .p8 contents on one line, with `\n` where the line breaks were).

Accounts made with Google or Apple are separate from password accounts: someone who already has
a password account keeps signing in with the password.

## 7. Spotify remote control (optional, 5 min)

1. developer.spotify.com → Dashboard → **Create app**.
2. Redirect URI: `https://app.YOURDOMAIN/` (with the slash). API: **Web API**.
3. Copy the **Client ID**, put it in `/opt/badgefit/deploy/.env` as `SPOTIFY_CLIENT_ID=…`, and run
   the setup again (`sudo bash /opt/badgefit/deploy/setup.sh`).
4. While the Spotify app is in development mode, add each person's Spotify email under
   **User Management** (up to 25). For everyone, apply for an extended quota later.

Playlists work without any of this: paste a playlist link in BadgeFit → Today → Music.

## Running it

| What | Command (on the server) |
|---|---|
| Update to the latest code | `sudo bash /opt/badgefit/deploy/setup.sh` |
| See what is happening | `cd /opt/badgefit/deploy && docker compose logs -f` |
| Restart | `cd /opt/badgefit/deploy && docker compose restart` |
| Backup now | `/opt/badgefit/deploy/backup.sh` |
| Change settings | edit `/opt/badgefit/deploy/.env`, then run the setup again |

Backups are made every night into `/opt/badgefit/deploy/backups/` (the last 14). Copy them off
the server now and then: `scp root@YOUR_IP:/opt/badgefit/deploy/backups/*.tar.gz .`

**Restore**: stop (`docker compose down`), unpack a backup in `/opt/badgefit/deploy`
(`tar xzf backups/badgefit-….tar.gz`), start again (`docker compose up -d`).

## Things to know

- **Never change the app domain** once people have signed up: passkeys are tied to it.
- **The community is public to every member.** Moderate it from the app (admins see hidden,
  reported posts and can restore or delete them). For a closed group, set `INVITE_ONLY=1`.
- **Licence**: BadgeFit is built on openGym (AGPL-3.0). Running it for the public means the
  source code of your version must be available to users: the website footer links to it.
