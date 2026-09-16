# Scaffold

Create and update projects from versioned Git templates.

## Usage

```bash
pnpm dlx github:NickVolkov/scaffold create NickVolkov/nest-backend-template my-api
cd my-api

pnpm dlx github:NickVolkov/scaffold status
pnpm dlx github:NickVolkov/scaffold update --dry-run
pnpm dlx github:NickVolkov/scaffold update
```

After the package is published to npm, `github:NickVolkov/scaffold` can be
replaced with `@nickvolkov/scaffold`.

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
