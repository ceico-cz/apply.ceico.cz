# Frontend deployment

The frontend is deployed from `main` to GitHub Pages by
`.github/workflows/pages.yml` and served at `https://apply.ceico.cz`.

## One-time GitHub configuration

In repository settings:

1. Select **GitHub Actions** as the Pages source.
2. Set the Pages custom domain to `apply.ceico.cz` and enforce HTTPS.
3. Define Actions variable `VITE_API_URL=https://api.apply.ceico.cz`.
4. Define Actions variable `VITE_BASE_PATH=/`.

The organization DNS record for `apply.ceico.cz` must target the repository's
GitHub Pages site. No API credentials or applicant data belong in this
repository or in frontend build variables.

## Routine deployment

Before pushing, verify the exact production build locally:

```bash
npm ci
npm run lint
VITE_API_URL=https://api.apply.ceico.cz VITE_BASE_PATH=/ npm run build
git push origin main
```

Watch the deployment and confirm the public site:

```bash
gh run list --workflow pages.yml --limit 3
gh run watch <run-id> --exit-status
curl -fsS https://apply.ceico.cz/
```

Manually test sign-in and the route changed by the release. GitHub Pages uses
`dist/404.html` as the single-page application fallback.

## Rollback

Revert the faulty commit on `main` and push the revert. This preserves history
and triggers the same tested Pages workflow:

```bash
git revert <faulty-commit>
git push origin main
```

