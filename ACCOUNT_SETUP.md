# HomeFlix Accounts setup

HomeFlix now includes email/password sign-up, sign-in, sign-out, and account-based syncing for profiles, My List/favorites, and Continue Watching progress. Existing local data remains on the device when signed out.

## 1. Create the Supabase project

1. Create a project at https://supabase.com.
2. In **Project Settings → API**, copy the **Project URL** and the **anon/public key**. Never use the `service_role` key in a browser or desktop client.
3. In **Authentication → URL Configuration**, add your deployed HomeFlix website URL to the allowed redirect/site URLs. For the current site, add `https://homeflix-cyber-node.vercel.app`. Add your local development URL too if you use one.
4. If email confirmation is enabled, users must confirm their email before signing in.

## 2. Create the data table

Open **SQL Editor** in Supabase and run the contents of [supabase/homeflix-accounts.sql](supabase/homeflix-accounts.sql). Row Level Security limits each account to its own data row.

## 3. Configure HomeFlix

Edit `supabase-config.js` and replace the two placeholders:

```js
window.HOMEFLIX_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_PUBLIC_KEY"
};
```

The anon/public key is intended for client applications; database security depends on the included Row Level Security policies. Do not add a service-role key.

Commit the configured file and redeploy the website. For the Windows/Electron app, rebuild the installer after configuring it so `supabase-config.js` is packaged with the app.

## 4. Use accounts

Open **NODE TOOLS → Account & Cloud Sync**, create an account or sign in, then wait for the account data to load. Profiles, favorites, and watch progress will be saved to the signed-in account and become available on other HomeFlix installs using the same Supabase project.

The video files themselves are not uploaded or synced. This feature syncs only HomeFlix profile metadata and playback progress.
