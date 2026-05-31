# Documentació de la Pràctica: ObjectLent 🔍📱

## 1. Explicació de les funcionalitats de l’aplicació

**ObjectLent** és una aplicació mòbil dissenyada per solucionar de manera totalment privada, eficient i desconnectada (offline) la detecció i reconeixement d'objectes quotidians utilitzant la càmera nativa d'un dispositiu mòbil. L'aplicació aprofita els darrers avenços en intel·ligència artificial local integrant models de xarxes neuronals convolucionals directament a la memòria del telèfon, eliminant totalment qualsevol dependència de servidors al núvol o connexions a Internet.

### Principals Característiques:
* **Inferència IA local (On-Device Inference):** Tota la càrrega computacional d'intel·ligència artificial es realitza al dispositiu de l'usuari final a través de la GPU (WebGL) o, en defecte d'això, la CPU utilitzant la biblioteca **TensorFlow.js**. Això garanteix zero latència en la xarxa, privacitat absoluta de la imatge de la càmera i zero despesa en APIs al núvol.
* **Model COCO-SSD optimitzat:** Es fa servir el model base `lite_mobilenet_v2`, un model d'intel·ligència artificial compacte de ~4-5 MB especialment adaptat per a oferir elevades taxes de fotogrames per segon (FPS) en navegadors mòbils i webviews natius sense sacrificar precisió en l'anàlisi de 80 classes d'objectes comuns.
* **Interfície Gràfica Premium (Dark Theme i Glassmorphism):** S'ha dissenyat un tema visual exquisit recolzat per una paleta de colors foscos profunds, dissenys translúcids (*glassmorphism*) amb desenfocs de fons dinàmics, llistats detallats d'objectes detectats i un marcador flotant que monitoritza el rendiment de l'aplicació en temps real indicant els FPS.
* **Dibuix de Bounding Boxes Intel·ligents:** L'aplicació implementa un algorisme gràfic que superposa bounding boxes definides amb precisió de píxels, accents visuals en les cantonades per a una estètica de "visor futurista", etiquetes amb el percentatge de seguretat de la IA i colors dinàmics (més de 40 tonalitats diferents) segons la categoria de l'objecte detectat.

### Casos d'Ús Reals:
1. **Assistència visual per a persones amb discapacitat visual:** Identificació de l'entorn i objectes immediats a temps real sense connectivitat de dades.
2. **Inventariat ràpid de productes en magatzems:** Reconeixement en situacions industrials d'alta complexitat o llocs sense connectivitat externa.
3. **Sector educatiu i aprenentatge d'IA:** Demostració pràctica d'alta enginyeria de programari sobre com implementar xarxes neuronals offline en aplicacions híbrides.

---

## 2. Captures de l’aplicació

A continuació es detalla l'estructura gràfica i el comportament del producte final d'**ObjectLent**. L'aplicació compta amb un disseny de pantalla única optimitzat, cuidant la sensació de robustesa i rendiment gràfic.

> **[Nota per a l'edició a Google Docs]:** Pots esborrar aquests requadres de text i enganxar directament les captures de pantalla obtingudes del teu navegador o dispositiu mòbil.

### 📸 Captura 1: Pantalla de Càrrega i Inicialització
*Descripció:* Mostra el fons fosc premium d'ObjectLent amb l'overlay translúcid, un ion-spinner animat i el text indicatiu de descàrrega i inicialització del model TensorFlow.js.

*(Insereix aquí la captura de la pantalla de càrrega)*

### 📸 Captura 2: Detecció en Temps Real (Càmera + Canvas Overlay)
*Descripció:* Mostra el visor de la càmera activa amb els rectangles gràfics dibuixats sobre els objectes detectats (tassa, ordinador, persona, etc.) amb els seus percentatges i la llista dinàmica a sota.

*(Insereix aquí la captura de la detecció d'objectes)*

---

## 3. Procés d’especificació (Spec-Driven Development)

Per al desenvolupament d'**ObjectLent** s'ha seguit la metodologia de desenvolupament basada en especificacions (**Spec-Driven Development**) utilitzant el marc **OpenSpec**. Aquesta pràctica consisteix a formalitzar en tres fases molt clares els objectius, funcionaments i riscos abans de programar.

### a. Foundations (Fonaments)
Aquesta fase estableix les bases del projecte:
* **Context:** Pràctica del cicle de Desenvolupament d'Aplicacions Multiplataforma (DAM).
* **Objectiu Principal:** Desenvolupar una aplicació mòbil híbrida que executi IA de detecció d'objectes en temps real directament en el hardware local de l'usuari.
* **Límits i Abast:** L'aplicació s'ha de poder utilitzar en entorns totalment aïllats (sin Internet). No es permet enviar streams de vídeo ni dades a cap API en el núvol externa. Tota la lògica computacional es conté dins de l'aplicació webview nativa.

### b. Specify (Especificació)
Aquí es formalitza el contracte tècnic de l'aplicació:
* **Arquitectura del Model:** Es tria `COCO-SSD` versió `lite_mobilenet_v2` per la seva mida compacta (reduïda transferència de dades) i pel seu elevat rendiment computacional en telèfons intel·ligents de gamma mitjana.
* **Flux de Càmera Web:** Utilització de `navigator.mediaDevices.getUserMedia()` amb la restricció de la càmera posterior (`facingMode: 'environment'`) i resolució optimitzada de 640×480 píxels. S'ha previst un mecanisme de fallback a la càmera frontal per a portàtils o dispositius de desenvolupament sense càmera posterior.
* **Algorisme de Renderitzat:** Un `Canvas2D` s'ajusta dinàmicament per superposar-se sobre el component de vídeo utilitzant un `ResizeObserver` que garanteix una perfecta coordinació de mides. L'algorisme gràfic recalcula en cada fotograma les coordenades intrínseques del model a la mida en pantalla del Canvas.

### c. Planning (Planificació i Decisions Tècniques)
Planificació del desenvolupament dividida en fases estructurades:
* **Detecció no-bloquejant amb `requestAnimationFrame`:** En lloc d'usar bucles lents amb `setInterval`, el bucle s'acobla al rendiment de la pantalla. S'implementa un flag de control `isDetecting` que evita que es demanin noves inferències a TensorFlow.js abans que l'anterior hagi finalitzat, impedint bloquejos de la interfície gràfica.
* **Control de Fallback de Backends de TensorFlow.js:** Per garantir la compatibilitat màxima, l'aplicació intenta utilitzar acceleració de maquinari per WebGL. Si falla, l'aplicació utilitza de forma transparent la CPU, notificant-ho degudament als logs tècnics.
* **Mecanisme de Throttling d'Errors:** Si s'acumulen més de 5 errors seguits en el bucle d'inferència, l'aplicació deté el processament i mostra una finestra d'advertència amb opció de reiniciar l'aplicació per evitar bucles de fallada infinits.

---

## 4. Annex amb fitxers rellevants

Aquest apartat conté els fragments dels fitxers d'especificació i components més rellevants escrits en català que donen suport a l'arquitectura d'enginyeria d'**ObjectLent**.

### Annex A: Full de ruta i Fases (tasks.md)
```markdown
# ObjectLent — Fases de Desenvolupament

## Fase 1: Configuració de l'Entorn
- [x] Instal·lar Node.js (v18+) i npm
- [x] Configurar variables d'entorn i JDK
- [x] Descarregar i instal·lar Android SDK de forma nativa

## Fase 2: Scaffolding del Projecte
- [x] Crear projecte Ionic Vue amb template blank
- [x] Instal·lar dependències TensorFlow.js, COCO-SSD i Capacitor
- [x] Configurar "type": "vue-vite" a ionic.config.json

## Fase 3: Integració de la Càmera (useCamera.ts)
- [x] Implementar getUserMedia amb fallback a la càmera frontal
- [x] Gestionar permisos i alliberament de recursos en unmount

## Fase 4: Integració de TensorFlow.js (useObjectDetection.ts)
- [x] Carregar model COCO-SSD i inicialitzar el millor backend
- [x] Crear bucle de detecció asíncron i segur

## Fase 5: Visualització i Maqueta (HomePage.vue + drawDetections.ts)
- [x] Sincronitzar mides de vídeo i canvas amb ResizeObserver
- [x] Dibuixar bounding boxes futuristes i colors per classe
- [x] Mostrar llistat de deteccions dinàmic amb ion-list

## Fase 6: Compilació i Desplegament
- [x] Compilar el bundle web via "ionic build"
- [x] Sincronitzar Capacitor i crear entorn natiu d'Android
- [x] Generar el fitxer APK autocompilat a la terminal via gradlew
```

### Annex B: Bucle de Detecció Principal (HomePage.vue)
Aquest és el codi que gestiona el bucle d'inferència de forma optimitzada utilitzant el mètode de `requestAnimationFrame` i controlant els FPS de manera eficient:

```typescript
// HomePage.vue - Fragment del bucle de detecció
const isDetecting = ref(false);
const animationFrameId = ref<number | null>(null);

async function startDetectionLoop() {
  if (!videoRef.value || !canvasRef.value || !isModelReady.value) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  const runDetection = async () => {
    // Si ja hi ha una inferència en curs o la càmera no està llesta, saltem
    if (isDetecting.value || !isActive.value) {
      animationFrameId.value = requestAnimationFrame(runDetection);
      return;
    }

    try {
      isDetecting.value = true;
      
      // Executa inferència de TensorFlow.js offline
      const predictions = await detect(videoRef.value);
      
      // Filtra i actualitza la llista d'objectes reactius
      updateDetections(predictions);

      // Dibuixa els bounding boxes sobre el canvas
      drawDetections(
        ctx,
        predictions,
        canvasRef.value.width,
        canvasRef.value.height,
        videoRef.value.videoWidth,
        videoRef.value.videoHeight
      );

      // Càlcul dinàmic de FPS per a control de rendiment
      calculateFPS();
    } catch (err) {
      handleLoopError(err);
    } finally {
      isDetecting.value = false;
      animationFrameId.value = requestAnimationFrame(runDetection);
    }
  };

  animationFrameId.value = requestAnimationFrame(runDetection);
}
```

### Annex C: Integració de permisos d'Android (AndroidManifest.xml)
Es descriu la configuració dels permisos per a accedir a la càmera del dispositiu Android natiu des del fitxer de manifest:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Permisos requerits per a la càmera i gravació -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

</manifest>
```
