# CLAUDE.md

Static Three.js site ("The Death of Mao" trailer). No build step — the repo
root is the deployable artifact. Test locally with `python3 -m http.server`.

## "push to vercel"

When the user says "push to vercel" (or similar), do this:

1. Commit any pending work and `git push -u origin <current-branch>`.
2. Deploy the repo root with the Vercel CLI using the `VERCEL_TOKEN`
   environment variable (configured in the Claude Code environment):

   ```sh
   npx -y vercel deploy --yes --token "$VERCEL_TOKEN"
   ```

   - First time in a project: run `npx -y vercel link --yes --project death-of-mao --token "$VERCEL_TOKEN"` before deploying.
   - This produces a **preview deployment** for the current branch.
   - If the user says "production" / "prod", add `--prod`.
3. Report the deployment URL back to the user.
4. If `VERCEL_TOKEN` is not set, do not improvise: tell the user to add it
   to the environment (Claude Code → environment settings → Environment
   variables) and stop.
