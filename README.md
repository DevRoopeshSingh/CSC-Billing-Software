# CSC Center Billing Software

A powerful, offline-capable desktop billing application built with Electron and Next.js. Designed for Digital Service Centers to manage customers, services, and invoices with production-grade reliability.

![CI](https://github.com/DevRoopeshSingh/CSC-Billing-Software/actions/workflows/ci.yml/badge.svg)
![Release](https://github.com/DevRoopeshSingh/CSC-Billing-Software/actions/workflows/release.yml/badge.svg)

## ✨ Features

- **Offline-First**: Full functionality without internet connection
- **Invoice Management**: Create, edit, and print professional invoices
- **Customer Tracking**: Manage customer details and history
- **Service Catalog**: Define services with tax rates and pricing
- **Backup & Restore**: Automated data backup and restoration
- **Multi-Platform**: macOS and Windows support
- **PIN Security**: Optional PIN protection for sensitive operations
- **Dark/Light Theme**: User preference persistence
- **Database**: Local SQLite for fast, reliable operations

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or later
- npm or yarn package manager
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/DevRoopeshSingh/CSC-Billing-Software.git
cd CSC-Billing-Software

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Generate Prisma Client
npm run db:generate

# Start development server (Next.js only)
npm run dev

# Or run full Electron + Next.js development
npm run electron:dev
```

### Building for Production

```bash
# Build Next.js and Electron binaries
npm run electron:build

# Output will be in dist_electron/
```

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop** | Electron 41.x | Cross-platform desktop application |
| **Frontend** | React 18, Next.js 16 | UI and routing |
| **Styling** | Tailwind CSS, DaisyUI | Component styling |
| **Backend** | Next.js API Routes | REST API endpoints |
| **Database** | SQLite, Prisma ORM | Data persistence |
| **Build** | Electron Builder | Binary compilation |
| **Type Safety** | TypeScript 5 | Static type checking |
| **Code Quality** | ESLint, Next.js built-in | Linting and formatting |

### Project Structure

```
.
├── electron/                    # Electron main process & preload
│   ├── main.js                 # App window, IPC handlers
│   └── preload.js              # Secure IPC bridge
├── src/
│   ├── app/                    # Next.js pages and API routes
│   │   ├── api/                # REST API endpoints
│   │   ├── billing/            # Billing page
│   │   ├── customers/          # Customer management
│   │   ├── invoices/           # Invoice listing
│   │   ├── invoice/[id]/       # Invoice detail & edit
│   │   ├── services/           # Service catalog
│   │   └── settings/           # Settings & backup
│   ├── components/             # Reusable React components
│   ├── lib/                    # Utilities & Prisma client
│   └── types/                  # TypeScript interfaces
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── public/
│   └── uploads/               # User-generated files
├── .github/
│   └── workflows/             # CI/CD automation
└── package.json               # Dependencies & scripts
```

### Database Schema

The application uses SQLite with Prisma ORM:

- **CenterProfile**: Business center configuration, branding, counters
- **Service**: Offered services with pricing and tax rates
- **Customer**: Customer contact information
- **Invoice**: Invoice records with totals and status
- **InvoiceItem**: Individual line items within invoices

See `prisma/schema.prisma` for the complete schema.

## 📚 API Documentation

### Authentication

Currently uses PIN-based protection for settings. All API endpoints are internal and accessed via the desktop application.

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/invoices` | Create new invoice |
| `GET` | `/api/invoices/[id]` | Fetch invoice details |
| `PUT` | `/api/invoices/[id]/status` | Update invoice status |
| `GET` | `/api/customers` | List all customers |
| `POST` | `/api/customers` | Create customer |
| `GET` | `/api/services` | List services |
| `POST` | `/api/services` | Create service |
| `POST` | `/api/pin/set` | Set PIN |
| `POST` | `/api/pin/verify` | Verify PIN |
| `POST` | `/api/backup` | Backup data |
| `GET` | `/api/invoices/[id]/pdf` | Generate PDF |

## 🛠️ Development Workflow

### Available Scripts

```bash
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Build Next.js application
npm run start            # Start Next.js production server
npm run lint             # Run ESLint
npm run db:migrate       # Create/apply database migrations
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:generate      # Generate Prisma Client
npm run electron:dev     # Run Electron with Next.js
npm run electron:build   # Build Electron binaries (macOS + Windows)
```

### Debugging

#### In Electron Development

1. The browser DevTools are automatically opened in development mode
2. Use React DevTools for component inspection
3. Prisma Studio is available at `npm run db:studio`

#### API Testing

```bash
# Test invoice creation
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d @test-invoice.json
```

## 🚢 Deployment

### Electron Binary Release

Releases are automatically built and published on GitHub when you push a version tag:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically:
# 1. Build macOS DMG
# 2. Build Windows NSIS installer
# 3. Create GitHub Release with binaries
```

### Environment Variables

Create a `.env.local` file in the root:

```env
# Database
DATABASE_URL="file:./dev.db"

# Optional: Production app data path (set by Electron in production)
# USER_DATA_PATH will be set automatically for packaged apps
```

## 📋 Configuration

### Center Profile Settings

Access via the Settings page to configure:

- Center name, address, phone, email
- Invoice numbering and prefix
- Udyam registration number
- Default tax rate and payment mode
- Logo and UPI QR code
- Theme preference (light/dark)

### Backup Strategy

- Manual backup via Settings → Backup
- Auto-backup on application exit (future enhancement)
- Restore overwrites all current data (use with caution)

## 🔒 Security Considerations

- **PIN Protection**: Optional 4-digit PIN for sensitive operations
- **SQLite Encryption**: Consider enabling with `sqlcipher` for sensitive deployments
- **No Network Calls**: All data stays on the user's device
- **IPC Security**: Electron preload script restricts IPC to safe APIs only

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Code Standards

- Use TypeScript for type safety
- Follow existing component patterns
- Write meaningful commit messages
- Create tests for new features
- Update documentation as needed

## 📦 Dependencies

### Production
- `@prisma/client@^5.13.0` - Database ORM
- `next@^16.1.7` - React framework
- `react@^18` - UI library
- `electron@^41.0.3` - Desktop runtime
- `electron-builder@^26.8.1` - Build tool
- `pdf-lib@^1.17.1` - PDF generation
- `recharts@^3.8.0` - Charts

### Development
- `typescript@^5` - Type checking
- `eslint@^8` - Code linting
- `prisma@^5.13.0` - Database toolkit

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/DevRoopeshSingh/CSC-Billing-Software/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DevRoopeshSingh/CSC-Billing-Software/discussions)
- **Email**: support@example.com (update as needed)

## 🔄 Version History

- **v0.1.0** (2026-03-19) - Initial release
  - Core billing functionality
  - Offline-first capability
  - Electron packaging for macOS/Windows

---

**Built with ❤️ for Digital Service Centers**
