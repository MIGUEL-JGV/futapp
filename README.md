# FUTAPP

App de gestión de torneos de fútbol (React Native + Expo + Supabase). Permite crear torneos, equipos, jugadores, generar calendarios (todos contra todos), registrar resultados, calcular posiciones/estadísticas y difundir una vista pública del torneo por enlace.

Stack: Expo SDK 57 · React Native 0.86 · React 19 · Zustand + AsyncStorage · Supabase (Postgres + Auth + Storage) · TypeScript.

## Requisitos

1. Un proyecto de **Supabase** con el esquema en `supabase/setup_all.sql` aplicado (SQL Editor).
2. Variables de entorno (`.env`, no se versionan):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_SITE_URL` — ejemplo `https://futapp-black.vercel.app`
3. En **Supabase → Authentication → URL Configuration**: `Site URL` y `Redirect URLs` deben apuntar a tu sitio publicado (para confirmación de email por enlace).

## Local

```bash
npm install
npx expo start
```

## Web / deploy

```bash
npx expo export --platform web   # genera dist/
npx vercel --prod                # despliega a Vercel
```

La app es backend-first: cuando hay credenciales de Supabase configuradas, toda mutación escribe directamente en la nube y las vistas públicas (`/t/:id`) se leen desde API; sin credenciales funciona en modo demo local (AsyncStorage).

## Despliegue automático (GitHub + Vercel)

El proyecto está conectado a Vercel vía Git: **cada `git push` a `main` dispara un deploy automático** desde el repositorio, usando las variables `EXPO_PUBLIC_*` configuradas en el proyecto de Vercel (Settings → Environment Variables). El CLI solo se usa para deploys locales/manuales.

## Scripts útiles

- `npm run web` — dev en navegador
- `npx tsc --noEmit` — chequeo de tipos
- `npx expo export --platform web` — build estático para Vercel
- `npx vercel --prod` — deploy a producción