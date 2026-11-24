# Put the prototype online (free)

## 1. Supabase (stores the ratings)
1. Sign up at supabase.com and create a new project. The free plan needs no card.
2. Open **SQL Editor > New query**, paste all of `supabase.sql`, press **Run**.
3. Open **Project Settings > API**. Copy the **Project URL** and the **anon public** key (or the `sb_publishable_...` key).
4. Paste both into `config.js`. Never use the `service_role` key.

## 2. Netlify (hosts the site)
1. Go to app.netlify.com/drop and sign in.
2. Drag the whole `public-site` folder onto the page.
3. Netlify gives you a link such as `https://something.netlify.app`. Share that.

To update later, drag the folder onto the same site's Deploys tab.

## Check it works
Open your link, tap **Warmer** in the prototype, press **Helpful**, then open **See live results**. The numbers should move within seconds.

## Good to know
- Anyone can add rows (that is how public feedback works), so a determined person could inflate the numbers. Treat them as indicative.
- The free Supabase plan pauses a project after a week of no activity. Open the Supabase dashboard to resume it.
