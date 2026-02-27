# Apollos AI Documentation

Documentation site for the Apollos AI self-service portal, built with [Mintlify](https://mintlify.com).

## Local development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) and run a local preview:

```bash
npm i -g mint
cd docs
mint dev
```

View your local preview at `http://localhost:3000`.

## AI-assisted writing

The Mintlify skill is installed for AI coding tools. See `AGENTS.md` for project-specific terminology and conventions.

## Validation

```bash
mint broken-links   # Check for broken links
mint validate       # Validate the build
```

## Structure

```
docs/
├── docs.json               # Site configuration
├── AGENTS.md               # AI assistant context
├── index.mdx               # Introduction
├── quickstart.mdx          # User onboarding
├── development.mdx         # Local dev setup
├── concepts/               # Core concepts (auth, teams, keys, usage)
├── cli/                    # CLI documentation
├── api-reference/          # API endpoint documentation
├── contributing/           # Contributor guides
├── ai-tools/               # AI tool setup guides
├── images/                 # Brand assets and images
└── snippets/               # Reusable content snippets
```
