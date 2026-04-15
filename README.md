# pi-statusline

Custom pi statusline/footer experiments.

## Files

- `extensions/chaos-footer.ts` — custom animated footer extension
- `bot-blurts.txt` — rotating footer blurts, one per line
- `install.sh` — installs runtime copies into `~/.pi/agent`
- `uninstall.sh` — removes installed runtime files

## Install flow

Source in this repo stays canonical. Pi runtime uses installed file copies.

Runtime targets:

- `extensions/chaos-footer.ts` -> `~/.pi/agent/extensions/chaos-footer.ts`
- `bot-blurts.txt` -> `~/.pi/agent/bot-blurts.txt`

Install:

```bash
./install.sh
```

Installer behavior:

- creates target dirs with `mkdir -p`
- copies repo files into `~/.pi/agent`
- safe to rerun
- replaces existing target symlinks with real files
- does not depend on repo staying at fixed path after install
- prints installed paths
- reminds you to run `/reload`

## Workflow

1. Edit source files in this repo.
2. Run installer:
   ```bash
   ./install.sh
   ```
3. Run `/reload` in pi.
4. Test.

Do not edit runtime files in `~/.pi/agent` directly. They are installed artifacts, not source of truth.

## Uninstall

Remove installed runtime files:

```bash
./uninstall.sh
```

Then run `/reload` in pi.

## Local development

Commit locally:

```bash
git add .
git commit -m "Update pi statusline"
```

Push after adding remote.
