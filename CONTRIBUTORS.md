# 🤝 Contributing to Rita Protocol

Welcome to the Rita Protocol team! This document outlines the workflow and rules we follow to keep our codebase clean, avoid merge conflicts, and maintain high code quality across the monorepo.

## 🚀 Getting Started (Forking & Setup)

If you are new to the project or an external contributor, you will need to fork the repository before making changes:

1. **Fork the Repository:** Click the "Fork" button at the top right of this repository's GitHub page to create a copy in your own account.
2. **Clone your Fork:** Clone the repository to your local machine.
   ```bash
   git clone https://github.com/YOUR_USERNAME/Rita.git
   cd rita
   ```
3. **Add Upstream Remote:** Link your local repository to the original (upstream) repository so you can pull the latest changes.
   ```bash
   git remote add upstream https://github.com/Evangel90/Rita.git
   ```
4. **Install Dependencies:**
   ```bash
   pnpm install
   ```

## 🌿 Branching Strategy

To keep our Git history clean and our production environment stable, please adhere to the following rules:

- **The `main` branch is locked:** 🛑 **Nobody** is allowed to push directly to the `main` branch. It is strictly reserved for production-ready code and is only updated via approved Pull Requests.
- **The `dev` branch:** This is our primary development branch. All active development happens here. 
- **Personalized Feature Branches:** When starting new work (features, bug fixes, or chores), create a new branch from `dev`. You **must** append your name to the end of the branch name.
  - **Format:** `<type>/<short-description>-<your-name>`
  - **Examples:**
    - `feat/add-guardian-ui-alice`
    - `fix/reaper-contract-bug-bob`
    - `chore/update-dependencies-charlie`

## 🔄 Development Workflow

Please follow this exact cycle for your daily work to minimize conflicts:

### 1. Always Pull Before Starting (Syncing with Upstream)
**Frequency:** You should pull from the upstream repository **every day** before you start working, and ideally anytime you step away and come back to your computer.

Before creating a new branch or resuming work, always sync your local `dev` branch with the `upstream` repository so you aren't working on outdated code:
```bash
git checkout dev
git pull upstream dev
git push origin dev  # Update your fork's dev branch too!
```

### 2. Create Your Branch
Create your personalized branch from the updated `dev` branch:
```bash
git checkout -b feat/my-awesome-feature-name
```

### 3. Work and Push
Make your changes, test them locally across the monorepo (using `pnpm dev`), and push your branch:
```bash
git add .
git commit -m "feat: implemented my awesome feature"
git push origin feat/my-awesome-feature-name
```

## 🔀 Pull Requests & Merge Conflicts

- **Fix Conflicts Before PR:** Before opening a Pull Request, pull the latest `dev` branch from upstream into your current working branch. If there are any merge conflicts, **you must resolve them locally** on your machine.
  ```bash
  git pull upstream dev
  # Resolve any conflicts in your code editor, then:
  git add .
  git commit -m "chore: resolve merge conflicts with upstream dev"
  ```
- **No Conflict PRs:** Do not open a PR if GitHub flags it as having unresolved merge conflicts.
- **Target the Right Branch:** Always open your Pull Requests against the `dev` branch, **never** `main`.

## 🛠️ Quick Reminders
- Run `pnpm install` if someone else updated the dependencies.
- If you modify the smart contracts (`packages/contracts`), remember to run `pnpm sync-abis` from the root to update the shared TypeScript definitions, and commit the changes.
- Ensure all apps start successfully without errors (`pnpm dev`) before asking for a teammate's review.

Happy building! 🚀
