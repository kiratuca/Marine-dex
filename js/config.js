// ─────────────────────────────────────────────────────────────
//  CONFIGURACIÓ DE LA SINCRONITZACIÓ (Firebase · pla gratuït Spark)
// ─────────────────────────────────────────────────────────────
//  1. Crea un projecte a https://console.firebase.google.com
//  2. Afegeix una "app web" (icona </>) i copia l'objecte firebaseConfig aquí sota.
//  3. Crea la base de dades "Firestore Database" i enganxa les regles del README.
//  4. Canvia LOGBOOK_ID per un codi secret llarg (el mateix que posaràs a les regles).
//
//  Mentre FIREBASE_CONFIG sigui null, l'app funciona igualment però només
//  guarda les dades al mòbil (mode local). També pots enganxar la configuració
//  des de l'app: Inici → ⚙️ Ajustos → Sincronització.

export const FIREBASE_CONFIG = null;
/* Exemple:
export const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "el-teu-projecte.firebaseapp.com",
  projectId: "el-teu-projecte",
  storageBucket: "el-teu-projecte.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/

export const LOGBOOK_ID = 'canvia-aquest-codi-secret';

export const FIREBASE_VERSION = '10.12.2';
