# pi-statusline

Custom pi statusline/footer experiments.

## Files

- `extensions/chaos-footer.ts` — custom animated footer extension
- `bot-blurts.txt` — rotating footer blurts, one per line

## Live runtime wiring

Pi loads these through symlinks:

- `~/.pi/agent/extensions/chaos-footer.ts` -> `extensions/chaos-footer.ts`
- `~/.pi/agent/bot-blurts.txt` -> `bot-blurts.txt`

## Workflow

1. Edit files in this repo.
2. Run `/reload` in pi.
3. Test.
4. Commit locally:
   ```bash
   git add .
   git commit -m "Update pi statusline"
   ```
5. Push after adding a remote.
