# 🔧 Troubleshooting Chat History Error

## Error: "Failed to fetch chat history"

This error occurs when the ChatHistory component cannot successfully fetch chat data from the `/api/chats` endpoint.

## 🔍 Quick Diagnosis

### 1. Check Server Status
```bash
# Make sure your development server is running
npm run dev

# Check if the server is accessible
curl http://localhost:3000/api/health
```

### 2. Test Database Connection
```bash
# Run the debug script
node debug-api.js
```

### 3. Check Browser Console
Open browser DevTools (F12) and look for:
- Network errors in the Network tab
- JavaScript errors in the Console tab
- Authentication errors

## 🛠️ Step-by-Step Fix

### Step 1: Verify Environment Variables

Check your `.env.local` file has all required variables:

```env
# Required for authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Required for database
DATABASE_URL="file:./dev.db"

# Optional but recommended
OPENAI_API_KEY=sk-...
```

### Step 2: Check Database Connection

1. **Verify database file exists:**
   ```bash
   ls -la dev.db
   ```

2. **Test database connection:**
   ```bash
   node -e "
   const { db, isDbConnected } = require('./src/lib/db/index.ts');
   console.log('Database connected:', isDbConnected);
   console.log('Database instance:', db ? 'Available' : 'Not available');
   "
   ```

3. **If database is not connected:**
   ```bash
   # Recreate database
   rm dev.db
   npm run dev
   ```

### Step 3: Check API Endpoints

1. **Test health endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Test chats endpoint (requires authentication):**
   ```bash
   # This will return 401 if not authenticated
   curl http://localhost:3000/api/chats
   ```

### Step 4: Verify Authentication

1. **Check if user is signed in:**
   - Look for Clerk user button in the UI
   - Check browser console for auth errors

2. **Test authentication in browser:**
   ```javascript
   // In browser console
   console.log('User signed in:', !!window.Clerk?.user);
   ```

### Step 5: Check Database Schema

1. **Verify tables exist:**
   ```bash
   # Check if tables are created
   sqlite3 dev.db ".tables"
   ```

2. **If tables don't exist:**
   ```bash
   # Generate and apply migrations
   npx drizzle-kit generate
   npx drizzle-kit push
   ```

## 🐛 Common Issues & Solutions

### Issue 1: Database Not Connected

**Symptoms:**
- "Database not available" error
- Empty chat list
- Health check shows database as disconnected

**Solution:**
```bash
# 1. Check DATABASE_URL
echo $DATABASE_URL

# 2. Recreate database
rm dev.db
npm run dev

# 3. Check database file
ls -la dev.db
```

### Issue 2: Authentication Required

**Symptoms:**
- 401 Unauthorized error
- "Please sign in" message
- User button not visible

**Solution:**
1. Check Clerk configuration
2. Verify environment variables
3. Clear browser cache and cookies
4. Sign in again

### Issue 3: Database Schema Issues

**Symptoms:**
- SQL errors in console
- "Table doesn't exist" errors
- Migration failures

**Solution:**
```bash
# 1. Reset database
rm dev.db

# 2. Regenerate schema
npx drizzle-kit generate

# 3. Apply migrations
npx drizzle-kit push

# 4. Restart server
npm run dev
```

### Issue 4: CORS or Network Issues

**Symptoms:**
- Network errors in browser
- CORS errors
- Request timeout

**Solution:**
1. Check if server is running on correct port
2. Clear browser cache
3. Check firewall settings
4. Try incognito mode

### Issue 5: TypeScript/Import Errors

**Symptoms:**
- Build errors
- Module not found errors
- Type errors

**Solution:**
```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Check TypeScript
npx tsc --noEmit

# 3. Rebuild
npm run build
```

## 🔧 Advanced Debugging

### Enable Debug Logging

Add to your `.env.local`:
```env
DEBUG=true
LOG_LEVEL=debug
```

### Check Database Queries

Add logging to your API routes:
```typescript
// In src/app/api/chats/route.ts
console.log('Fetching chats for user:', userId);
console.log('Database connected:', isDbConnected);
console.log('Search conditions:', searchConditions);
```

### Test Individual Components

1. **Test database connection:**
   ```typescript
   // Create test-db.js
   const { db, isDbConnected } = require('./src/lib/db/index.ts');
   
   async function testDB() {
     try {
       const result = await db.execute('SELECT 1');
       console.log('Database test successful:', result);
     } catch (error) {
       console.error('Database test failed:', error);
     }
   }
   
   testDB();
   ```

2. **Test API endpoint directly:**
   ```bash
   # With authentication header
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/chats
   ```

## 📊 Monitoring & Logs

### Check Application Logs

1. **Server logs:**
   ```bash
   # Check terminal where npm run dev is running
   # Look for error messages
   ```

2. **Browser logs:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

### Database Logs

```bash
# Enable SQLite logging
sqlite3 dev.db ".log stderr"
```

## 🚀 Prevention

### Best Practices

1. **Always check environment variables on startup**
2. **Implement proper error handling**
3. **Add health checks for all services**
4. **Use TypeScript for type safety**
5. **Test API endpoints regularly**

### Monitoring Setup

1. **Add health check endpoint**
2. **Implement error tracking (Sentry)**
3. **Add performance monitoring**
4. **Set up database monitoring**

## 📞 Getting Help

If the issue persists:

1. **Check the main README.md**
2. **Review the comprehensive guide**
3. **Check GitHub issues**
4. **Create a new issue with:**
   - Error message
   - Steps to reproduce
   - Environment details
   - Console logs

## ✅ Success Checklist

- [ ] Server is running (`npm run dev`)
- [ ] Database is connected (health check passes)
- [ ] User is authenticated (Clerk user visible)
- [ ] API endpoints return data
- [ ] No console errors
- [ ] Chat history loads successfully

---

**🎉 Once all items are checked, your chat history should work perfectly!**

