Redirecting Global npx/npm for Claude Code Installation
When installing Claude Code globally using npm or npx, you may encounter issues related to global npm permissions or environment variables, especially if your global npm directory is not user-writable or if conflicting environment variables (like BUN_INSTALL) are set.

Recommended Solution: Change Global npm Prefix
To safely redirect where global npm/npx commands (including Claude Code) are installed and executed, follow these steps:

Create a user-writable directory for global npm packages:

text
mkdir -p ~/.npm-global
Configure npm to use this directory for global installs:

text
npm config set prefix ~/.npm-global
Add the new directory to your PATH (replace .bashrc with your shell config as needed):

text
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
Now, install Claude Code globally:

text
npm install -g @anthropic-ai/claude-code