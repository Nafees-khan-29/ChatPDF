# 🚀 Deployment Guide - AI Document Analyzer

## 📋 Overview

This guide covers deploying your AI Document Analyzer application to various platforms. The application is designed to work seamlessly across different hosting environments.

## 🎯 Deployment Options

### 1. Vercel (Recommended)
- **Best for:** Next.js applications
- **Pros:** Zero-config deployment, automatic HTTPS, global CDN
- **Cons:** Serverless limitations, cold starts

### 2. Railway
- **Best for:** Full-stack applications with databases
- **Pros:** Easy database integration, persistent storage
- **Cons:** Limited free tier

### 3. Netlify
- **Best for:** Static sites and serverless functions
- **Pros:** Great for frontend, easy setup
- **Cons:** Limited backend capabilities

### 4. DigitalOcean App Platform
- **Best for:** Production applications
- **Pros:** Full control, scalable, cost-effective
- **Cons:** More complex setup

## 🚀 Vercel Deployment (Recommended)

### Step 1: Prepare Your Application

1. **Ensure your app builds successfully:**
   ```bash
   npm run build
   ```

2. **Test locally:**
   ```bash
   npm start
   ```

3. **Verify all environment variables are documented:**
   - Create a `.env.example` file with all required variables
   - Document optional variables

### Step 2: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Follow the prompts:**
   - Link to existing project or create new
   - Set up project settings
   - Configure build settings

### Step 3: Configure Environment Variables

1. **Go to Vercel Dashboard:**
   - Navigate to your project
   - Go to Settings → Environment Variables

2. **Add all required variables:**
   ```env
   # Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...

   # Database
   DATABASE_URL=postgresql://...

   # AI APIs
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GEMINI_API_KEY=...

   # Cloud Storage
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=...

   # Vector Database
   PINECONE_API_KEY=...
   PINECONE_ENVIRONMENT=...
   PINECONE_INDEX_NAME=...
   ```

3. **Set environment scope:**
   - Production: `production`
   - Preview: `preview`
   - Development: `development`

### Step 4: Configure Custom Domain (Optional)

1. **Add domain in Vercel Dashboard:**
   - Go to Settings → Domains
   - Add your custom domain

2. **Update DNS records:**
   - Add CNAME record pointing to Vercel
   - Wait for SSL certificate generation

### Step 5: Set Up Database

#### Option A: Neon (Recommended)

1. **Create Neon account:**
   - Go to [neon.tech](https://neon.tech)
   - Create new project

2. **Get connection string:**
   - Copy PostgreSQL connection string
   - Add to Vercel environment variables

3. **Run migrations:**
   ```bash
   npx drizzle-kit push
   ```

#### Option B: Supabase

1. **Create Supabase project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project

2. **Get connection string:**
   - Go to Settings → Database
   - Copy connection string

3. **Run migrations:**
   ```bash
   npx drizzle-kit push
   ```

### Step 6: Configure Clerk for Production

1. **Update Clerk settings:**
   - Go to Clerk Dashboard
   - Navigate to your application
   - Go to Settings → API Keys

2. **Update allowed origins:**
   - Add your production domain
   - Add Vercel preview URLs

3. **Configure webhooks (optional):**
   - Set up user sync webhooks
   - Point to your production API endpoints

## 🚂 Railway Deployment

### Step 1: Prepare for Railway

1. **Create `railway.json`:**
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "healthcheckPath": "/api/health"
     }
   }
   ```

2. **Add health check endpoint:**
   ```typescript
   // src/app/api/health/route.ts
   export async function GET() {
     return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
   }
   ```

### Step 2: Deploy to Railway

1. **Connect GitHub repository:**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub account
   - Select your repository

2. **Configure environment:**
   - Add all environment variables
   - Set up PostgreSQL database

3. **Deploy:**
   - Railway will automatically deploy
   - Monitor build logs

## 🌐 Netlify Deployment

### Step 1: Configure for Netlify

1. **Create `netlify.toml`:**
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [build.environment]
     NODE_VERSION = "18"

   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. **Create API functions:**
   - Move API routes to `netlify/functions/`
   - Update imports and exports

### Step 2: Deploy to Netlify

1. **Connect repository:**
   - Go to [netlify.com](https://netlify.com)
   - Connect your GitHub repository

2. **Configure build settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`

3. **Set environment variables:**
   - Add all required environment variables
   - Configure external services

## 🐳 Docker Deployment

### Step 1: Create Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Step 2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/chatpdf
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
      - CLERK_SECRET_KEY=sk_live_...
      - OPENAI_API_KEY=sk-...
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=chatpdf
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Step 3: Deploy with Docker

```bash
# Build and run
docker-compose up -d

# Or with Docker Swarm
docker stack deploy -c docker-compose.yml chatpdf
```

## 🔧 Production Configuration

### 1. Environment Variables

Create a production `.env.production` file:

```env
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Cloud Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=...

# Vector Database
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=...

# Security
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

### 2. Database Migration

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate

# Or push schema directly
npx drizzle-kit push
```

### 3. SSL Configuration

Most platforms handle SSL automatically, but for custom deployments:

```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoring and Analytics

### 1. Error Tracking

Add Sentry for error monitoring:

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### 2. Performance Monitoring

Add Vercel Analytics:

```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 3. Logging

Set up structured logging:

```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

export default logger;
```

## 🔒 Security Checklist

### 1. Environment Security
- [ ] All secrets are in environment variables
- [ ] No secrets in code or version control
- [ ] Different keys for development/production
- [ ] Regular key rotation

### 2. Application Security
- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection protection

### 3. Infrastructure Security
- [ ] Database access restricted
- [ ] S3 bucket permissions minimal
- [ ] API keys have limited scope
- [ ] Regular security updates

## 🚨 Troubleshooting

### Common Issues

#### 1. Build Failures

**Error:** `Module not found`
**Solution:** Check all imports and dependencies

**Error:** `TypeScript errors`
**Solution:** Fix type errors or add type assertions

#### 2. Runtime Errors

**Error:** `Database connection failed`
**Solution:** Check DATABASE_URL format and credentials

**Error:** `Authentication failed`
**Solution:** Verify Clerk keys and configuration

**Error:** `File upload failed`
**Solution:** Check AWS S3 configuration and permissions

#### 3. Performance Issues

**Issue:** Slow page loads
**Solution:** Enable caching, optimize images, use CDN

**Issue:** High memory usage
**Solution:** Optimize database queries, implement pagination

### Debug Mode

Enable debug logging in production:

```env
DEBUG=true
LOG_LEVEL=debug
```

### Health Checks

Add health check endpoints:

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    storage: await checkStorage(),
    ai: await checkAI(),
  };

  const isHealthy = Object.values(checks).every(check => check.status === 'ok');

  return Response.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
}
```

## 📈 Scaling Considerations

### 1. Database Scaling
- Use read replicas for read-heavy operations
- Implement connection pooling
- Consider database sharding for large datasets

### 2. File Storage Scaling
- Use CDN for static assets
- Implement file compression
- Consider multiple storage regions

### 3. AI API Scaling
- Implement request queuing
- Use multiple AI providers
- Cache common responses

## 🎉 Go Live Checklist

Before going live, ensure:

- [ ] All environment variables configured
- [ ] Database migrated and tested
- [ ] Authentication working
- [ ] File uploads functional
- [ ] AI responses working
- [ ] Error handling in place
- [ ] Monitoring configured
- [ ] SSL certificate active
- [ ] Performance optimized
- [ ] Security measures active
- [ ] Backup strategy implemented
- [ ] Documentation updated

**🚀 Your AI Document Analyzer is ready for production!**
