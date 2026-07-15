# Optional: the `ship-prototype` Claude Code skill

If you use [Claude Code](https://claude.com/claude-code), this skill turns "add this
prototype to the Hub" into one command. It packages the HTML you just built, copies it into
your Hub repo, snapshots it as a new version with a change note, and (if your Hub deploys
from git) commits and pushes.

Everyone else can ignore this folder: adding a prototype by hand is just as supported
(`node new.js`, edit, `node release.js` — see the main README).

## Install

1. Copy this folder into your Claude Code skills directory:
   - macOS / Linux: `~/.claude/skills/ship-prototype/`
   - Windows: `%USERPROFILE%\.claude\skills\ship-prototype\`

   ```bash
   cp -r examples/claude-skill ~/.claude/skills/ship-prototype
   ```

2. Tell the skill where your Hub repo lives. Either:
   - copy `config.example.json` to `config.json` in that folder and set `hubDir` to the
     absolute path of your cloned Hub, or
   - set the `PROTOTYPE_HUB_DIR` environment variable instead.

3. Optional: set `hubHost` in `config.json` (e.g. `prototypes.example.com`) so the skill
   reports the real deployed link. Leave it `""` to report only the local URL.

## Use

From any folder where you built a prototype, in Claude Code:

```
/ship-prototype
```

It checks the file is self-contained, asks for any metadata it does not know plus a change
note, copies it into the Hub, releases the next version, and publishes.

## Per-folder defaults

Drop a `.prototype-hub.json` in a folder where you build prototypes so the skill stops asking
for the same fields:

```json
{
  "product": "Growth",
  "owner": "Your Name",
  "tags": ["web"]
}
```
