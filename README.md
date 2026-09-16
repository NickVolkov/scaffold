# Scaffold

Create and update projects from versioned Git templates.

## Usage

```bash
npx scaffoldrr create NickVolkov/nest-backend-template my-api
cd my-api

npx scaffoldrr status
npx scaffoldrr update --dry-run
npx scaffoldrr update
```

`create` clones a GitHub template with Degit and records its source commit in `.scaffold.json`. `update` fetches the template and applies the difference from that recorded commit using Git's three-way merge. It requires a clean working tree and never creates a commit.

## Template manifest

A template can define `.scaffold/template.json`:

```json
{
  "schemaVersion": 1,
  "excludeFromUpdates": ["generated/**"],
  "afterCreate": ["pnpm install"],
  "afterUpdate": ["pnpm install", "pnpm typecheck", "pnpm test"]
}
```

Commands in a template manifest are trusted code and run with the user's permissions. Use templates only from sources you trust.

## Releasing

The `publish.yml` workflow publishes stable GitHub Releases to npm through
Trusted Publishing. The release tag must match the version in `package.json`,
for example `v0.2.0` for version `0.2.0`.

To release, update the version, push the commit and tag, then publish a GitHub
Release for that tag.
