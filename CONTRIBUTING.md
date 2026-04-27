# Contributing to Job Autofill Pro

Thank you for your interest in contributing!

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful and inclusive.

## How to Contribute

### Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** when opening new issues
3. **Include**:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/extension version
   - Console errors (if any)

### Suggesting Features

1. **Check Issues** for similar suggestions
2. **Open a Feature Request** with:
   - Clear use case
   - Proposed solution
   - Alternative approaches considered

### Pull Requests

#### Prerequisites

- Node.js ≥18.0.0
- npm ≥9.0.0
- Firefox or Chrome for testing

#### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/job-autofill-pro.git
cd job-autofill-pro

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/your-feature

# Run tests
npm test
```

#### PR Guidelines

- **Keep it small**: One feature or fix per PR
- **Write tests**: Add tests for new functionality
- **Update docs**: README, code comments, etc.
- **Follow style**: Match existing code conventions

#### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] No lint errors
- [ ] Code builds without errors
- [ ] Documentation updated
- [ ] Commit messages are clear

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `fix`: Bug fix
- `feat`: New feature
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

### Examples

```
fix(application-history): resolve cross-tab URL mixing

The extension was using getActiveTab() instead of sender.tab,
causing duplicate checks to run against the wrong job URL when
the user switched tabs during async operations.

Fixes #123
```

```
feat(proxy): add URL sanitization

- Reject non-http/https protocols
- Strip hash fragments
- Normalize query parameters
```

## Getting Help

- **GitHub Discussions**: For questions
- **GitHub Issues**: For bugs and features
- **Discord**: Link in README (if available)

---

## Recognition

Contributors will be acknowledged in:
- README.md "Credits" section
- GitHub release notes
- Project documentation

Thank you for making Job Autofill Pro better!
