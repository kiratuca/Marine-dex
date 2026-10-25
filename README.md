# 🐠 Marine-Dex · Bitàcola de busseig

Web app privada (PWA) per a dos bussejadors: quadern de bitàcola, Marine-Dex de 67 espècies amb rareses, mapa "scratch" i 29 insígnies. Funciona 100% offline i se sincronitza entre els dos mòbils quan torna la connexió.

## Estructura

```
index.html              → pàgina única de l'app
manifest.webmanifest    → "Afegeix a la pantalla d'inici"
sw.js                   → service worker (mode offline)
css/styles.css          → tot el disseny (colors a :root)
js/config.js            → ⚙️ configuració de Firebase (l'únic fitxer que has d'editar)
js/app.js               → vistes: Inici, Dex, Mapa, Bitàcola, formularis
js/store.js             → dades locals + cua offline + sincronització
js/data/species.js      → catàleg d'espècies (editable)
js/data/badges.js       → insígnies, tipus d'immersió, vestits, mars
js/data/countries.js    → països en català
data/world-50m.json     → mapa del món (sense connexió)
vendor/                 → Leaflet + topojson (inclosos, no depenen d'internet)
icons/                  → icones de l'app
```

## 1 · Base de dades gratuïta (Firebase, pla Spark)

1. Entra a <https://console.firebase.google.com> → **Afegeix un projecte** (pots desactivar Analytics).
2. **Compila → Firestore Database → Crea una base de dades** → mode producció → ubicació `eur3 (europe-west)`.
3. A la pestanya **Regles**, enganxa això i canvia el codi secret:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /books/{book}/{col}/{docId} {
      allow read, write: if book == 'EL-VOSTRE-CODI-SECRET'
        && col in ['dives', 'unlocks', 'bucket', 'species'];
    }
  }
}
```

4. **Configuració del projecte (⚙️) → Les teves apps → icona `</>`** → registra una app web → copia l'objecte `firebaseConfig`.
5. Obre `js/config.js` i enganxa'l a `FIREBASE_CONFIG`. Posa el mateix codi secret a `LOGBOOK_ID`.

> Alternativa sense tocar codi: a l'app, ⚙️ **Ajustos → Sincronització**, enganxa la config i el codi als dos mòbils.

El pla gratuït dona molt més del que fareu servir (1 GB de dades, 50.000 lectures i 20.000 escriptures al dia).

## 2 · Publicar a GitHub Pages

1. Crea un repositori a GitHub (pot ser privat amb GitHub Pro, o públic).
2. Puja tot el contingut d'aquesta carpeta a l'arrel del repositori.
3. **Settings → Pages → Source: Deploy from a branch → `main` / root** → Save.
4. En un minut tindreu l'enllaç: `https://el-teu-usuari.github.io/nom-del-repo/`.

També funciona igual a Netlify o Vercel (arrossegant la carpeta).

## 3 · Instal·lar als mòbils

- **iPhone:** obre l'enllaç amb Safari → Compartir ⬆️ → *Afegeix a la pantalla d'inici*.
- **Android:** Chrome → menú ⋮ → *Instal·lar aplicació*.

Obriu-la un cop amb connexió: a partir d'aquí ja funciona sense cobertura.

## Com funciona l'offline

- Tot es guarda primer al mòbil. Sense cobertura, el botó de dalt mostra `Offline · N pendents`.
- Quan torna el Wi-Fi o les dades, la cua es puja sola i l'altre mòbil ho rep en temps real.
- Si tots dos editeu la mateixa immersió sense connexió, es queda l'última edició.
- ⚙️ Ajustos → **Exportar** fa una còpia de seguretat en JSON.

## Actualitzar l'app

Quan canvieu qualsevol fitxer, obriu `sw.js` i augmenteu `VERSION` (ex. `v1.0.1`). Els mòbils agafaran la versió nova la segona vegada que obrin l'app.

## Personalitzar

- **Espècies:** edita `js/data/species.js` (raresa `r`: 0 Comú, 1 Rar, 2 Èpic, 3 Llegendari) o afegeix-les des del Dex amb **＋ Afegir espècie**. No canvieu l'`id` d'una espècie que ja tingueu desbloquejada.
- **Insígnies:** `js/data/badges.js`, cada una té una condició `test`.
- **Colors i tipografia:** variables a l'inici de `css/styles.css`.

## Privacitat

No hi ha login: qui tingui l'enllaç **i** el codi secret pot veure les dades. Si el repositori és públic, el codi és visible a `config.js`; per a més privacitat, deixeu `FIREBASE_CONFIG = null` i enganxeu la configuració des de ⚙️ Ajustos als dos mòbils (només queda guardada al telèfon).
