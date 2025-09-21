# 🔧 Environment Setup Guide - AI Document Analyzer

## 📋 Prerequisites

Before setting up the environment, ensure you have:

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Git** installed ([Download here](https://git-scm.com/))
- **Code Editor** (VS Code recommended)
- **Terminal/Command Prompt** access

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-document-analyzer

# Install dependencies
npm install

# Install additional dependencies for enhanced features
npm install @clerk/nextjs drizzle-orm @neondatabase/serverless @aws-sdk/client-s3 @pinecone-database/pinecone @langchain/openai pdf-parse mammoth react-dropzone gsap lucide-react
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# ===========================================
# AUTHENTICATION (Required)
# ===========================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# ===========================================
# DATABASE (Required)
# ===========================================
# For development (SQLite)
DATABASE_URL="file:./dev.db"

# For production (PostgreSQL/Neon)
# DATABASE_URL="postgresql://username:password@host:port/database"

# ===========================================
# AI PROVIDERS (At least one required)
# ===========================================
# OpenAI (Primary - Recommended)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Anthropic Claude (Optional - Enhanced accuracy)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Google Gemini (Optional - Multimodal analysis)
GEMINI_API_KEY=your-gemini-api-key-here

# ===========================================
# CLOUD STORAGE (Optional - for production)
# ===========================================
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# ===========================================
# VECTOR DATABASE (Optional - for advanced search)
# ===========================================
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=your-pinecone-index-name

# ===========================================
# APPLICATION SETTINGS (Optional)
# ===========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEBUG=false
LOG_LEVEL=info
```

## 🔑 API Keys Setup

### 1. Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Choose authentication methods (Email, Google, GitHub, etc.)
4. Copy the keys from the API Keys section
5. Add them to your `.env.local` file

**Required Keys:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### 2. OpenAI API

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new secret key
5. Copy the key and add to `.env.local`

**Required Key:**
- `OPENAI_API_KEY`

### 3. Anthropic Claude (Optional)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key and add to `.env.local`

**Optional Key:**
- `ANTHROPIC_API_KEY`

### 4. Google Gemini (Optional)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Create a new API key
4. Copy the key and add to `.env.local`

**Optional Key:**
- `GEMINI_API_KEY`

### 5. AWS S3 (Optional - for production)

1. Go to [AWS Console](https://aws.amazon.com/)
2. Create an S3 bucket
3. Create IAM user with S3 permissions
4. Generate access keys
5. Add keys to `.env.local`

**Optional Keys:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`

### 6. Pinecone (Optional - for vector search)

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new project
3. Create an index
4. Get API key and environment
5. Add to `.env.local`

**Optional Keys:**
- `PINECONE_API_KEY`
- `PINECONE_ENVIRONMENT`
- `PINECONE_INDEX_NAME`

## 🗄️ Database Setup

### Option 1: SQLite (Development - Default)

No additional setup required. The app will automatically create a SQLite database file (`dev.db`) in your project root.

### Option 2: PostgreSQL (Production)

#### Using Neon (Recommended)

1. Go to [Neon Console](https://neon.tech/)
2. Create a new project
3. Copy the connection string
4. Update `DATABASE_URL` in `.env.local`

#### Using Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database
3. Update `DATABASE_URL` in `.env.local`

```env
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
```

## 🚀 Running the Application

### Development Mode

```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:3000
```

### Production Build

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## 🔧 Database Migration

After setting up your database, run migrations:

```bash
# Generate migration files
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Or push schema directly (for development)
npx drizzle-kit push
```

## 🧪 Testing the Setup

### 1. Check Environment Variables

Create a test script to verify your environment:

```bash
# Create test-env.js
node -e "
console.log('🔍 Environment Check:');
console.log('Clerk Publishable Key:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
console.log('Clerk Secret Key:', process.env.CLERK_SECRET_KEY ? '✅ Set' : '❌ Missing');
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('Database URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('AWS S3:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
console.log('Pinecone:', process.env.PINECONE_API_KEY ? '✅ Set' : '❌ Missing');
"
```

### 2. Test Database Connection

```bash
# Run database test
node -e "
const { db, isDbConnected } = require('./src/lib/db/index.ts');
console.log('Database connected:', isDbConnected ? '✅ Yes' : '❌ No');
"
```

### 3. Test API Endpoints

```bash
# Test upload endpoint
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-document.pdf" \
  -H "Authorization: Bearer your-clerk-token"

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-clerk-token" \
  -d '{"message": "Hello, test message"}'
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Database not connected" Error

**Solution:**
- Check `DATABASE_URL` format
- Ensure database service is running
- Verify connection string

#### 2. "Unauthorized" Error

**Solution:**
- Verify Clerk keys are correct
- Check middleware configuration
- Ensure user is signed in

#### 3. "File upload failed" Error

**Solution:**
- Check AWS S3 configuration
- Verify file size limits
- Check CORS settings

#### 4. "AI response failed" Error

**Solution:**
- Verify OpenAI API key
- Check API quota/limits
- Ensure proper API key format

### Debug Mode

Enable debug logging:

```env
DEBUG=true
LOG_LEVEL=debug
```

### Logs Location

- **Development:** Console output
- **Production:** Check your hosting platform logs

## 📊 Performance Optimization

### 1. Database Indexing

The application automatically creates indexes for optimal performance:

- User lookups
- Chat queries
- Message retrieval
- Document searches

### 2. Caching

- Static assets are cached
- API responses can be cached
- Database queries are optimized

### 3. File Upload Optimization

- Files are chunked for large uploads
- S3 multipart uploads for efficiency
- Image optimization (if applicable)

## 🔒 Security Considerations

### 1. Environment Variables

- Never commit `.env.local` to version control
- Use different keys for development/production
- Rotate keys regularly

### 2. API Security

- All API routes are protected with Clerk authentication
- File uploads are validated
- SQL injection protection via Drizzle ORM

### 3. Data Privacy

- User data is encrypted
- Documents are processed securely
- No data is stored permanently without user consent

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Other Platforms

- **Netlify:** Similar to Vercel
- **Railway:** Good for full-stack apps
- **DigitalOcean:** More control over infrastructure

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review the main README
3. Check GitHub issues
4. Create a new issue with detailed error information

---

## ✅ Checklist

Before going live, ensure:

- [ ] All environment variables are set
- [ ] Database is connected and migrated
- [ ] Authentication is working
- [ ] File upload is functional
- [ ] AI responses are working
- [ ] Chat history is saving
- [ ] Error handling is in place
- [ ] Security measures are active
- [ ] Performance is optimized
- [ ] Production environment is configured

**🎉 You're ready to launch your AI Document Analyzer!**
