# Local setup — running the admin with `npm run dev`

This guide gets the project running on a fresh Windows computer so you can use the
**admin** at `http://localhost:3000/admin`. Editing here saves straight to the live
Supabase database.

> You only run the site **locally** — you don't deploy. Deploying to the live website
> is done separately (see *Publishing changes* at the bottom).

---

## 1. Install Node.js (this also installs npm)

Pick **one** method.

**Option A — Installer (simplest)**
1. Go to <https://nodejs.org>
2. Click the big **LTS** button (Node 20 or newer). It downloads a `.msi`.
3. Run the `.msi`, keep all defaults, click **Install**.
   - Leave the "Automatically install the necessary tools…" checkbox **unchecked** —
     it isn't needed.
4. **Close every open terminal**, then open a new one.

**Option B — One command (PowerShell)**
```powershell
winget install OpenJS.NodeJS.LTS
```
Then close and reopen PowerShell.

**Verify** (in a *new* terminal):
```powershell
node -v
npm -v
```
You should see two version numbers. If `node` is "not recognized", you opened the
terminal before installing — close it and open a fresh one.

---

## 2. Get the project

Either clone with Git, or download the repo as a ZIP from GitHub and unzip it.
Open a terminal **inside the project folder** for the next steps.

---

## 3. Create `.env.local`

Double-click **`setup-env.cmd`** in the project folder (or run `setup-env.cmd` in the
terminal). It creates the `.env.local` file the app needs. That's it — no values to type.

---

## 4. Install dependencies

```powershell
npm install
```
First run takes a few minutes.

> **If you see "running scripts is disabled on this system":** run this once, then
> retry `npm install`:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

---

## 5. Start the dev server

```powershell
npm run dev
```
Then open <http://localhost:3000/admin/login> and sign in with the admin account you
were given.

To stop the server, press **Ctrl+C** in the terminal. To start again later, just run
`npm run dev` from the project folder (steps 1–4 are one-time only).

---

## Publishing changes to the live website

Edits you make in the local admin are saved to the database **immediately**, but the
public website at ryokotackle.com is cached and **won't show them until it is
redeployed**. Ask the site owner to publish (trigger a deploy) when your edits are
ready to go live.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `node`/`npm` not recognized | Open a **new** terminal after installing Node |
| `running scripts is disabled` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then retry |
| Admin login bounces / "forbidden" | Your account must be granted admin access — contact the owner |
| Site loads but shows no products | `.env.local` missing — run `setup-env.cmd` again |
| `npm run dev` port in use | Something is already on port 3000 — close it, or it will pick another port |
