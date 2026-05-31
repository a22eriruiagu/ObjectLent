# ObjectLent 🔍📱

> **Projecte Final de DAM (Desenvolupament d'Aplicacions Multiplataforma)**
> 
> Aplicació mòbil híbrida per a la **detecció d'objectes en temps real amb Intel·ligència Artificial completament offline (on-device)**, desenvolupada amb Vue 3 (Composition API), Ionic Framework, Capacitor i TensorFlow.js.

[![Vue](https://img.shields.io/badge/Vue-3.5-4fc08d?logo=vue.js)](https://vuejs.org/)
[![Ionic](https://img.shields.io/badge/Ionic-8.8-3880ff?logo=ionic)](https://ionicframework.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-6.2-119eff?logo=capacitor)](https://capacitorjs.com/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-ff6f00?logo=tensorflow)](https://js.tensorflow.org/)

---

## 📋 Descripció del Projecte

**ObjectLent** és una eina tecnològica concebuda per funcionar de manera totalment autònoma i privada. Utilitzant el model de xarxa neuronal convolucional **COCO-SSD** adaptat a dispositius mòbils (*lite_mobilenet_v2*), l'aplicació processa el flux continu de la càmera del dispositiu i renderitza bounding boxes sobre els objectes detectats, mostrant la seva etiqueta i percentatge de confiança, a més de llistar-los dinàmicament en pantalla.

Tota la inferència de la IA s'executa **localment al WebView del dispositiu**, sense enviar cap dada a cap servidor ni requerir connexió a Internet (Offline-First).

---

## ✨ Funcionalitats Clau

1. **Inferència On-Device en Temps Real**: Detecció fluida (fins a 30 FPS segons dispositiu) sense APIs de tercers.
2. **Arquitectura No-Bloquejant**: Bucle d'inferència síncron optimitzat amb `requestAnimationFrame` i mecanisme de bloqueig (*throttling*) per evitar la saturació del fil principal de la interfície gràfica.
3. **Disseny Premium Fosc amb Glassmorphism**: Interfície cuidada al detall, utilitzant efectes de desenfocament de fons (`backdrop-filter`), gradients suaus i transicions elegants.
4. **Multiplataforma Nadiu**: Execució al navegador web i compilació de projecte natiu d'Android via Capacitor.
5. **Paleta de Colors Intel·ligent**: Bounding boxes personalitzades amb fins a 40 tons dinàmics per a diferenciar fàcilment les classes d'objectes del dataset COCO (persones, mascotes, dispositius, etc.).

---

## 📂 Estructura del Repositori

El codi està estructurat de manera modular seguint les millors pràctiques d'un projecte Vue 3 + Vite:

```
ObjectLent/
├── 📄 SPEC.md                  # Especificació tècnica completa (OpenSpec)
├── 📄 PROMPTS.md               # Documentació de prompts i captures
├── 📄 BUILD_INSTRUCTIONS.md    # Guia de compilació de l'APK d'Android
├── 📄 tasks.md                 # Checklist de fases del projecte
├── 📦 package.json             # Dependències (Vue, Ionic, Capacitor, TF.js)
├── ⚙️ capacitor.config.ts       # Configuració nativa de Capacitor
├── ⚙️ vite.config.ts            # Configuració del bundler Vite
├── 📂 android/                 # Projecte Android natiu (generat per Capacitor)
└── 📂 src/
    ├── 🚀 main.ts               # Punt d'entrada de Vue i càrrega d'Ionic
    ├── 📱 App.vue                # Component arrel de l'aplicació
    ├── 📂 router/               # Rutes de navegació (/ → /home)
    ├── 📂 views/
    │   └── 🎯 HomePage.vue      # Pantalla principal (Càmera + Canvas + Llista)
    ├── 📂 composables/
    │   ├── 📷 useCamera.ts      # Control i fallbacks del flux de la càmera
    │   └── 🧠 useObjectDetection.ts  # Càrrega i detecció de TF.js (WebGL/CPU)
    ├── 📂 utils/
    │   └── 🎨 drawDetections.ts # Dibuix de bounding boxes, etiquetes i polyfills
    └── 📂 theme/
        └── 💅 variables.css      # Disseny de marca fosc i variables de disseny
```

---

## 🛠️ Configuració del Desenvolupament

### Prerequisits
* **Node.js** (v18+) i npm
* **Android SDK** (si es vol compilar per a Android)
* **Java JDK** (compatible amb la teva versió d'Android SDK)

### 1. Instal·lar dependències
```bash
npm install
```

### 2. Executar al navegador (Desenvolupament local)
```bash
npm run dev
```
Obre `http://localhost:8100` al navegador per provar l'aplicació de forma local.

### 3. Compilació Web
```bash
npm run build
```

### 4. Compilació i Sincronització de l'APK (Android)
Si vols compilar l'APK:
```bash
npx ionic build
npx cap sync
cd android
./gradlew assembleDebug
```
L'APK compilat estarà a `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📚 Més Documentació

Per a veure l'especificació completa i la planificació del projecte, consulta els següents fitxers Markdown en català inclosos al repositori:
* 📘 **[SPEC.md](SPEC.md)**: El document d'especificació OpenSpec que descriu els fonaments de disseny, el model COCO-SSD, els fluxos de dades de la càmera i la matriu de gestió de riscos.
* 📋 **[tasks.md](tasks.md)**: El desglossament de les 7 fases de desenvolupament des del scaffolding inicial fins al deploy.
* 🛠️ **[BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)**: Passos detallats per configurar l'entorn de compilació Android i resoldre possibles errades del compilador.
* 🧠 **[PROMPTS.md](PROMPTS.md)**: Document explicatiu de la pipeline del model d'Intel·ligència Artificial i el recull dels prompts utilitzats per al desenvolupament assistit per IA.

---

*Projecte dissenyat i desenvolupat amb 💻 i 🧠 com a projecte final per al Cicle Formatiu de Grau Superior de Desenvolupament d'Aplicacions Multiplataforma (DAM).*
