# Contributing to LinkDAO

## Welcome Contributors!

Thank you for your interest in contributing to LinkDAO! This guide will help you get started with contributing to our open-source project.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read and follow our [Code of Conduct](https://github.com/linkdao/linkdao/blob/main/CODE_OF_CONDUCT.md).

## Getting Started

### 1. Fork the Repository

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/linkdao.git
cd linkdao
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### 3. Create a Branch

```bash
# Create a new branch for your feature
git checkout -b feature/your-feature-name
```

## Development Workflow

### Making Changes

1. **Write Code** - Follow our coding standards
2. **Test** - Ensure all tests pass
3. **Commit** - Use conventional commit messages
4. **Push** - Push to your fork
5. **Pull Request** - Create a PR to main repository

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples:**
```
feat(marketplace): add NFT listing functionality
fix(auth): resolve wallet connection timeout
docs(readme): update installation instructions
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type when possible
- Use meaningful variable names

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Follow React best practices

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Write self-documenting code
- Add comments for complex logic

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

- Write tests for new features
- Maintain test coverage above 80%
- Test edge cases
- Use descriptive test names

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes
```

### Review Process

1. **Automated Checks** - CI/CD runs tests
2. **Code Review** - Maintainers review code
3. **Feedback** - Address review comments
4. **Approval** - Get approval from maintainers
5. **Merge** - PR is merged to main

## Areas to Contribute

### Good First Issues

Look for issues labeled `good first issue` - these are great for newcomers!

### High Priority Areas

- **Documentation** - Improve docs and guides
- **Testing** - Increase test coverage
- **Bug Fixes** - Fix reported bugs
- **Features** - Implement new features
- **Performance** - Optimize performance

## Community

### Communication Channels

- **Discord** - [Join our Discord](https://discord.gg/linkdao)
- **GitHub Discussions** - Ask questions and discuss ideas
- **Twitter** - [@LinkDAO](https://twitter.com/linkdao)

### Getting Help

- Check existing documentation
- Search GitHub issues
- Ask in Discord #dev channel
- Create a GitHub discussion

## Recognition

Contributors are recognized in:
- README contributors section
- Release notes
- Community highlights
- NFT contributor badges (coming soon!)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Questions?

Have questions? Reach out:
- Discord: #dev channel
- Email: dev@linkdao.io
- GitHub Discussions

Thank you for contributing to LinkDAO! 🚀
