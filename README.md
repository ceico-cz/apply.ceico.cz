# CEICO Academic Applications

Public React frontend for the CEICO academic recruitment portal, deployed at [apply.ceico.cz](https://apply.ceico.cz).

All applicant data, authentication, email delivery, and uploaded documents are handled by the separately deployed API. This repository must not contain backend credentials, applicant data, or `.env` files.

## Development

```bash
npm install
npm run dev
```

The local frontend uses `http://localhost:8000` by default. To use another backend:

```bash
VITE_API_URL=https://api.apply.ceico.cz npm run dev
```

## Deployment

Pushes to `main` are linted, built, and deployed through GitHub Actions. `VITE_API_URL` supplies the public API origin. `VITE_BASE_PATH` is `/` because Pages serves this repository through the `apply.ceico.cz` custom domain.
