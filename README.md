# Familiens dashboard

Første version: rullende syvdageskalender med Supabase-login, filtre og automatisk opdatering.

## Opsætning

1. Hent **Publishable key** (eller legacy **anon key**) under Supabase → Project Settings → API Keys. **Aldrig** `service_role`, `secret` eller service account JSON.
2. Erstat `INDSAET_SUPABASE_PUBLISHABLE_KEY` i `config.js` med denne offentlige nøgle.
3. Upload `index.html`, `style.css`, `app.js`, `config.js` til roden af dit GitHub-repository.
4. Aktivér GitHub Pages under Settings → Pages → Deploy from a branch → `main` → `/ (root)` (hvis tilgængeligt på din GitHub-plan).
5. Log ind med den bruger, du oprettede i Supabase Authentication.

**Privatliv:** GitHub Pages er en offentligt tilgængelig hjemmeside, også selv om repositoryet er privat. Adgang til kalenderdata håndhæves af Supabase Auth og RLS. Offentlig klientnøgle er ikke en hemmelighed. Undlad at publicere hemmelige nøgler.

**Bemærk:** Google Familie-kalenderen identificeres automatisk, hvis dens `calendar_id` indeholder `familie` eller `family`. Ellers kan du sætte dens eksakte kalender-ID i `config.js` under `familyCalendarId`. Uden dette kan dens aftaler stå under Cathrine.

**Dubletter:** Kun aftaler med identisk normaliseret titel, start og slut på tværs af personer samles. Usikre dubletter vises separat, så ingen aftaler skjules ved en fejl.

**Tidszoner:** Kalenderen vises i `Europe/Copenhagen` og ruller automatisk ved midnat.
