# 🚀 Vercel Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository connected (✅ Already done: vidica-ai/prospeccao-levidica)
- Environment variables from `.env.local`

## 📝 Environment Variables Required

You'll need to add these environment variables in Vercel Dashboard:

### Supabase Variables (Required)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Optional Variables
```
HUNTER_API_KEY=your_hunter_api_key (for contact enhancement)
OPENAI_API_KEY=your_openai_key (if using AI features)
V0_API_KEY=your_v0_key (if using V0)
```

## 🔧 Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Select "Yes" to link to existing project or create new
   - Choose scope (your account)
   - Link to existing project or set up new

3. **Set Environment Variables:**
   ```bash
   # Add each variable
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add HUNTER_API_KEY
   ```

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub Integration

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Click "Add New Project"
   - Import from GitHub

2. **Select Repository:**
   - Choose `vidica-ai/prospeccao-levidica`
   - Click "Import"

3. **Configure Project:**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add each variable from `.env.local`
   - Make sure to add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `HUNTER_API_KEY` (if available)

5. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete

## 🔍 Post-Deployment Checklist

1. **Test Authentication:**
   - Visit your-app.vercel.app
   - Try logging in with Leticia's credentials

2. **Test Database Connection:**
   - Check if leads load properly
   - Test creating new prospects

3. **Test Email Composer:**
   - Navigate to Organizers page
   - Try generating an email

4. **Check API Routes:**
   - `/api/leads` - Should return leads
   - `/api/organizers` - Should return organizers
   - `/api/generate-email` - Should generate emails

## 🐛 Troubleshooting

### Build Errors
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors: `npm run build` locally

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check Supabase dashboard for connection limits
- Ensure service role key has proper permissions

### API Routes Not Working
- Check environment variables are set correctly
- Verify API routes have proper error handling
- Check Vercel function logs

### Authentication Issues
- Ensure Supabase Auth is configured
- Check redirect URLs in Supabase dashboard
- Verify anon key is correct

## 📊 Monitoring

1. **Vercel Dashboard:**
   - View deployments: https://vercel.com/dashboard
   - Check function logs
   - Monitor usage and performance

2. **Supabase Dashboard:**
   - Monitor database queries
   - Check authentication logs
   - View real-time subscriptions

## 🔄 Continuous Deployment

Your app is now set up for automatic deployments:
- **Production:** Pushes to `main` branch auto-deploy to production
- **Preview:** Pull requests create preview deployments

## 🌐 Custom Domain (Optional)

1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## 📱 Environment-Specific Settings

The app automatically detects the environment:
- **Development:** Uses `.env.local`
- **Production:** Uses Vercel environment variables

## 🚨 Important Notes

1. **Never commit `.env.local` to Git**
2. **Keep service role key secret**
3. **Use preview deployments for testing**
4. **Monitor usage to stay within limits**

## 📞 Support

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs

---

Last Updated: August 2024