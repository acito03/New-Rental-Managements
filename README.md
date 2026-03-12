# Rental-Sys — Professional Rental Management System

A full-stack rental management system built with Next.js 14, PostgreSQL, and Prisma. Optimized for Docker deployment on a NAS.

## ✨ Features

- **RBAC**: Super Admin → Admin → User with strict access control
- **Inventory**: Track equipment by Brand/Type with status badges
- **Request Workflow**: Users submit requests → Admins approve/reject
- **Transactions**: Monthly tracking with one-click Return Item
- **PDF Documents**: Auto-generated Transmittal & Request Form
- **CSV Import/Export**: Bulk inventory upload + monthly report export
- **Calendar Dashboard**: Visual rental timeline using FullCalendar

## 🚀 Quick Start (Docker — Recommended)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd rental-sys
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:YourStrongPassword@db:5432/rental_sys
NEXTAUTH_URL=http://YOUR_NAS_IP:3000
NEXTAUTH_SECRET=change-this-to-a-random-32-char-string
POSTGRES_PASSWORD=YourStrongPassword
```

### 2. Build & Start

```bash
docker-compose up -d --build
```

### 3. Run Migrations & Seed (first run only)

```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

### 4. Login

Open `http://YOUR_NAS_IP:3000` and log in with:

| Field | Value |
|-------|-------|
| Email | `acito03@rental-sys.local` |
| Password | `Exact@2016` |
| Role | Super Admin |

---

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+

### Setup

```bash
npm install

# Configure .env for local DB
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rental_sys
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-key

# Run migrations and seed
npx prisma migrate dev --name init
npx prisma db seed

# Start dev server
npm run dev
```

---

## 👥 Role Permissions

| Feature | Super Admin | Admin | User |
|---------|-------------|-------|------|
| Create Admin/User accounts | ✅ | Users only | ❌ |
| Full Inventory CRUD | ✅ | ✅ | View only |
| Brand/Type CRUD | ✅ | ✅ | View only |
| Create Requests | ✅ | ✅ | ✅ (own) |
| Edit/Delete Requests | ✅ | ✅ | Own pending only |
| Approve/Reject Requests | ✅ | ✅ | ❌ |
| Create Transactions directly | ✅ | ✅ | ❌ |
| Return Items | ✅ | ✅ | ❌ |
| Download PDFs | ✅ | ✅ | ✅ |
| Export CSV | ✅ | ✅ | ✅ |
| Import CSV | ✅ | ✅ | ❌ |

---

## 📦 Project Structure

```
├── app/
│   ├── (dashboard)/           # Protected pages
│   │   ├── dashboard/         # Stats + calendar
│   │   ├── inventory/         # Equipment tracking
│   │   ├── brands/            # Brand/Type management
│   │   ├── requests/          # Request workflow
│   │   ├── transactions/      # Monthly transaction view
│   │   └── users/             # User management
│   ├── api/
│   │   ├── auth/              # NextAuth
│   │   ├── users/             # User CRUD
│   │   ├── brands/            # Brand CRUD
│   │   ├── inventory/         # Inventory CRUD + CSV
│   │   ├── requests/          # Request workflow + approve/reject
│   │   ├── transactions/      # Transaction CRUD + return + export
│   │   └── pdf/               # PDF generation
│   └── login/                 # Login page
├── components/
│   ├── ui/                    # Shadcn components
│   ├── layout/                # Sidebar
│   └── dashboard/             # Calendar component
├── lib/                       # Prisma client + utils
├── hooks/                     # useToast
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Super Admin + demo data
├── Dockerfile                 # Multi-stage production build
└── docker-compose.yaml        # App + PostgreSQL services
```

---

## 🐳 NAS Deployment Notes

- App runs on port **3000** (configurable in `docker-compose.yaml`)
- PostgreSQL data persists in Docker volume `postgres_data`
- Set `NEXTAUTH_URL` to your NAS's local IP or domain
- For HTTPS, place a reverse proxy (nginx/traefik) in front

## 📋 Workflow

```
User creates Request → Admin gets notified → Admin Approves
        ↓
Transaction is created automatically + Inventory marked "Out"
        ↓
Admin clicks "Return Item" → Inventory reset to "OK"
        ↓
Generate PDF Transmittal / Export Monthly CSV Report
```
