<template>
  <!-- 
    HomePage.vue
    Pàgina principal de l'aplicació ObjectLent.
    Mostra la càmera en temps real amb detecció d'objectes superposada,
    una llista dels objectes detectats, i un comptador de FPS.
  -->
  <ion-page>
    <!-- Capçalera de l'aplicació amb títol i badge de FPS -->
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>
          <div class="app-title">
            <span class="app-title-icon">🔍</span>
            <span class="app-title-text">ObjectLent</span>
          </div>
        </ion-title>
        <!-- Badge de FPS amb animació de pulsació quan està actiu -->
        <ion-buttons slot="end">
          <ion-badge v-if="fps > 0" class="fps-badge" color="success">
            {{ fps }} FPS
          </ion-badge>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- Contingut principal de la pàgina -->
    <ion-content :fullscreen="true" class="home-content">
      <!-- Secció de la càmera amb el visor i el canvas de deteccions -->
      <div class="camera-container">
        <div class="camera-viewport" ref="viewportRef">
          <!-- Element de vídeo: mostra el flux de la càmera -->
          <video
            ref="videoRef"
            class="camera-video"
            playsinline
            muted
            autoplay
          />
          <!-- Canvas de deteccions: superposat al vídeo per dibuixar els rectangles -->
          <canvas ref="canvasRef" class="detection-canvas" />

          <!-- Superposició de càrrega: es mostra mentre el model es descarrega -->
          <div v-if="isModelLoading" class="loading-overlay">
            <ion-spinner name="crescent" />
            <p>{{ loadingText }}</p>
          </div>

          <!-- Superposició d'error: es mostra si la càmera o el model fallen -->
          <div v-if="errorMessage" class="error-overlay">
            <ion-icon :icon="warningOutline" class="error-icon" />
            <p>{{ errorMessage }}</p>
            <ion-button size="small" @click="initialize">Reintentar</ion-button>
          </div>

          <!-- Indicador de gravació: punt vermell pulsant quan la càmera està activa -->
          <div v-if="isCameraActive && !isModelLoading && !errorMessage" class="recording-indicator">
            <span class="rec-dot"></span>
            <span class="rec-text">EN VIU</span>
          </div>
        </div>
      </div>

      <!-- Secció de resultats: llista dels objectes detectats -->
      <div class="results-section">
        <div class="results-header">
          <h2>Objectes Detectats</h2>
          <!-- Badge amb el nombre d'objectes detectats -->
          <ion-badge :color="detections.length > 0 ? 'primary' : 'medium'">
            {{ detections.length }}
          </ion-badge>
        </div>

        <!-- Estat buit: es mostra quan no hi ha deteccions -->
        <div v-if="detections.length === 0 && isModelReady" class="empty-state">
          <ion-icon :icon="scanOutline" class="scan-icon" />
          <p>Enfoca la càmera cap a algun objecte...</p>
        </div>

        <!-- Llista de deteccions: mostra cada objecte amb barra de confiança -->
        <ion-list v-else lines="none" class="detection-list">
          <ion-item
            v-for="(det, index) in detections"
            :key="`${det.class}-${index}`"
            class="detection-item"
          >
            <!-- Indicador de color de la classe -->
            <div
              class="class-color-dot"
              :style="{ backgroundColor: getClassColor(det.class) }"
              slot="start"
            ></div>
            <div class="detection-info">
              <!-- Nom de la classe de l'objecte -->
              <span class="detection-class">{{ det.class }}</span>
              <!-- Barra de confiança visual -->
              <div class="confidence-bar">
                <div
                  class="confidence-fill"
                  :style="{
                    width: `${Math.round(det.score * 100)}%`,
                    backgroundColor: getConfidenceColor(det.score),
                  }"
                />
              </div>
            </div>
            <!-- Badge amb el percentatge de confiança -->
            <ion-badge
              slot="end"
              :style="{ backgroundColor: getConfidenceColor(det.score), color: '#fff' }"
              class="confidence-badge"
            >
              {{ Math.round(det.score * 100) }}%
            </ion-badge>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
/**
 * Script principal de la pàgina HomePage.
 * 
 * Coordina la càmera, el model de detecció, el bucle de renderització,
 * i l'actualització de la interfície d'usuari en temps real.
 */

import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBadge,
  IonSpinner,
  IonIcon,
  IonButton,
  IonList,
  IonItem,
} from '@ionic/vue';
import { warningOutline, scanOutline } from 'ionicons/icons';

// Importar els composables de càmera i detecció d'objectes
import { useCamera } from '@/composables/useCamera';
import { useObjectDetection, type DetectedObject } from '@/composables/useObjectDetection';

// Importar les utilitats de dibuix sobre canvas
import { drawDetections, clearCanvas } from '@/utils/drawDetections';

// --- Inicialització dels composables ---

// Composable de càmera: gestiona el flux de vídeo i els permisos
const {
  isActive: isCameraActive,
  error: cameraError,
  startCamera,
  stopCamera,
} = useCamera();

// Composable de detecció: gestiona el model TF.js i les inferències
const {
  isLoading: isModelLoading,
  isReady: isModelReady,
  error: modelError,
  loadingProgress,
  loadModel,
  detect,
  dispose: disposeModel,
} = useObjectDetection();

// --- Referències a elements del DOM ---

// Referència al element <video> de la càmera
const videoRef = ref<HTMLVideoElement | null>(null);

// Referència al element <canvas> per dibuixar les deteccions
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Referència al contenidor del visor de la càmera (per ResizeObserver)
const viewportRef = ref<HTMLDivElement | null>(null);

// --- Estat reactiu de la pàgina ---

// Llista d'objectes detectats en el fotograma actual
const detections = ref<DetectedObject[]>([]);

// Fotogrames per segon (FPS) del bucle de detecció
const fps = ref(0);

// Text de progrés de càrrega mostrat a la superposició
const loadingText = ref('');

// Missatge d'error combinat (càmera o model)
const errorMessage = ref<string | null>(null);

// --- Control del bucle de detecció ---

// ID del requestAnimationFrame per poder cancel·lar-lo en desmuntar
let animationFrameId: number | null = null;

// Bandera per evitar crides solapades a detect() (prevé sobrecàrrega de GPU)
let isDetecting = false;

// Variables per al càlcul de FPS amb mitjana mòbil
let frameCount = 0;
let lastFpsTime = performance.now();

// Referència al ResizeObserver per actualitzar les dimensions del canvas
let resizeObserver: ResizeObserver | null = null;

/**
 * Paleta de colors per a les classes d'objectes.
 * Reutilitzem la mateixa paleta que drawDetections per consistència visual.
 */
const CLASS_COLORS: Record<string, string> = {
  person: '#6c5ce7',
  car: '#00cec9',
  truck: '#0984e3',
  bus: '#e17055',
  motorcycle: '#fdcb6e',
  bicycle: '#00b894',
  dog: '#fd79a8',
  cat: '#ffeaa7',
  chair: '#e056fd',
  bottle: '#303952',
  cup: '#e15f41',
  tv: '#3dc1d3',
  laptop: '#e77f67',
  'cell phone': '#786fa6',
  book: '#f19066',
  default: '#74b9ff',
};

/**
 * Obté el color assignat a una classe d'objecte.
 * 
 * @param className - Nom de la classe de l'objecte
 * @returns Color hexadecimal
 */
function getClassColor(className: string): string {
  return CLASS_COLORS[className] || CLASS_COLORS.default;
}

/**
 * Retorna un color basat en la puntuació de confiança de la detecció.
 * Serveix per donar retroalimentació visual ràpida de la fiabilitat:
 * - Verd: confiança alta (>80%)
 * - Groc: confiança bona (>60%)
 * - Taronja: confiança moderada (>40%)
 * - Vermell: confiança baixa (≤40%)
 * 
 * @param score - Puntuació de confiança (0.0 a 1.0)
 * @returns Color hexadecimal
 */
function getConfidenceColor(score: number): string {
  if (score > 0.8) return '#00b894';   // Verd — alta confiança
  if (score > 0.6) return '#fdcb6e';   // Groc — bona confiança
  if (score > 0.4) return '#e17055';   // Taronja — confiança moderada
  return '#d63031';                     // Vermell — baixa confiança
}

/**
 * Actualitza les dimensions del canvas perquè coincideixin amb el vídeo.
 * 
 * Utilitzem les dimensions intrínseques del vídeo (videoWidth/videoHeight)
 * en comptes de getBoundingClientRect() per evitar desajustos amb object-fit.
 * Això garanteix que les coordenades de COCO-SSD es mapegen correctament.
 */
function updateCanvasSize(): void {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  if (!video || !canvas) return;

  // Usem les dimensions intrínseques del vídeo (resolució real de la càmera)
  // Si videoWidth/videoHeight encara no estan disponibles, usem el rect CSS
  const w = video.videoWidth || video.clientWidth || 640;
  const h = video.videoHeight || video.clientHeight || 480;
  
  canvas.width = w;
  canvas.height = h;
  
  console.log(`[ObjectLent] Canvas actualitzat: ${w}x${h} (vídeo: ${video.videoWidth}x${video.videoHeight})`);
}

/**
 * Bucle principal de detecció d'objectes.
 * 
 * S'executa contínuament via requestAnimationFrame:
 * 1. Comprova que no hi hagi una detecció en curs (evita solapaments)
 * 2. Executa la detecció sobre el fotograma actual
 * 3. Dibuixa els resultats al canvas
 * 4. Actualitza el comptador de FPS
 * 5. Programa el següent fotograma
 * 
 * La bandera isDetecting garanteix que no s'executin deteccions en paral·lel,
 * ja que cada detect() pot trigar 50-150ms i no volem saturar la GPU.
 */
function detectionLoop(): void {
  animationFrameId = requestAnimationFrame(async () => {
    const video = videoRef.value;
    const canvas = canvasRef.value;

    // Assegurem que el vídeo té fotogrames disponibles (readyState >= 2)
    if (video && canvas && isModelReady.value && !isDetecting && video.readyState >= 2) {
      // Marquem que una detecció està en curs
      isDetecting = true;

      try {
        // Executar la inferència del model sobre el fotograma actual
        const predictions = await detect(video);

        // Log de depuració (útil per diagnosticar problemes)
        if (predictions.length > 0 && detections.value.length === 0) {
          console.log(`[ObjectLent] Primeres deteccions! ${predictions.length} objectes trobats:`,
            predictions.map(p => `${p.class} (${Math.round(p.score * 100)}%)`).join(', ')
          );
        }

        // Actualitzar les deteccions reactives
        detections.value = predictions;

        // Dibuixar els rectangles de detecció al canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawDetections(
            ctx,
            predictions,
            canvas.width,
            canvas.height,
            video.videoWidth,
            video.videoHeight
          );
        }

        // Calcular els FPS amb actualització cada segon
        frameCount++;
        const now = performance.now();
        const elapsed = now - lastFpsTime;
        if (elapsed >= 1000) {
          // Calculem els FPS del darrer segon
          fps.value = Math.round((frameCount * 1000) / elapsed);
          frameCount = 0;
          lastFpsTime = now;
        }
      } catch (err) {
        // Registrem l'error però continuem el bucle
        console.error('[ObjectLent] Error al bucle de detecció:', err);
      } finally {
        // Alliberem la bandera per permetre la propera detecció
        isDetecting = false;
      }
    }

    // Programar el proper fotograma del bucle
    detectionLoop();
  });
}

/**
 * Funció d'inicialització principal.
 * 
 * Coordina l'inici de la càmera i la càrrega del model:
 * 1. Inicia la càmera (sol·licita permisos si cal)
 * 2. Carrega el model COCO-SSD (descarrega ~4-5 MB)
 * 3. Configura el ResizeObserver per al canvas
 * 4. Inicia el bucle de detecció
 * 
 * Si qualsevol pas falla, mostra un missatge d'error en català.
 */
async function initialize(): Promise<void> {
  // Reiniciar l'estat d'error
  errorMessage.value = null;
  detections.value = [];
  fps.value = 0;

  // Esperar que els elements del DOM estiguin disponibles
  await nextTick();

  const video = videoRef.value;
  if (!video) {
    errorMessage.value = 'No s\'ha pogut accedir a l\'element de vídeo.';
    return;
  }

  try {
    // Pas 1: Iniciar la càmera
    loadingText.value = 'Iniciant la càmera...';
    await startCamera(video);
    console.log('[ObjectLent] Càmera iniciada correctament.');

    // Pas 2: Configurar les dimensions del canvas quan el vídeo estigui llest
    // Usem 'loadedmetadata' i 'playing' per cobrir tots els escenaris
    video.addEventListener('loadedmetadata', () => {
      console.log(`[ObjectLent] Metadades del vídeo carregades: ${video.videoWidth}x${video.videoHeight}`);
      updateCanvasSize();
    });
    video.addEventListener('playing', () => {
      console.log(`[ObjectLent] Vídeo reproduint-se: ${video.videoWidth}x${video.videoHeight}`);
      updateCanvasSize();
    });

    // Configurar el ResizeObserver per actualitzar el canvas si el visor canvia de mida
    if (viewportRef.value) {
      resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });
      resizeObserver.observe(viewportRef.value);
    }

    // Pas 3: Carregar el model COCO-SSD
    loadingText.value = loadingProgress.value || 'Carregant el model de detecció...';

    // Actualitzar el text de progrés dinàmicament
    const progressInterval = setInterval(() => {
      if (loadingProgress.value) {
        loadingText.value = loadingProgress.value;
      }
    }, 100);

    await loadModel();
    clearInterval(progressInterval);
    console.log(`[ObjectLent] Model carregat. isReady: ${isModelReady.value}`);

    // Pas 4: Iniciar el bucle de detecció
    if (isModelReady.value) {
      // Esperem que el vídeo tingui fotogrames disponibles
      // Alguns navegadors tarden una mica a tenir readyState >= 2
      let waitAttempts = 0;
      while (video.readyState < 2 && waitAttempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitAttempts++;
      }
      console.log(`[ObjectLent] Vídeo readyState: ${video.readyState} (després de ${waitAttempts * 100}ms)`);
      updateCanvasSize();
      detectionLoop();
      console.log('[ObjectLent] Bucle de detecció iniciat!');
    } else {
      errorMessage.value = 'El model no s\'ha pogut carregar. Comprova la connexió a internet.';
    }
  } catch (err: any) {
    // Mostrar l'error de càmera o model
    errorMessage.value = cameraError.value || modelError.value || `Error d'inicialització: ${err.message}`;
  }
}

/**
 * Inicialitzar quan el component es munta al DOM.
 * Cridem initialize() per engegar tot el procés.
 */
onMounted(() => {
  initialize();
});

/**
 * Neteja de recursos quan el component es desmunta.
 * 
 * Important alliberar tots els recursos per evitar fuites de memòria:
 * - Cancel·lar el bucle de requestAnimationFrame
 * - Aturar la càmera i alliberar el flux de vídeo
 * - Alliberar el model de TensorFlow.js i els seus tensors
 * - Desconnectar el ResizeObserver
 * - Netejar el canvas
 */
onUnmounted(() => {
  // Cancel·lar el bucle d'animació
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Aturar la càmera (ja gestionat pel composable amb onUnmounted,
  // però ho fem explícitament per seguretat)
  stopCamera();

  // Alliberar el model de TensorFlow.js
  disposeModel();

  // Desconnectar el ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // Netejar el canvas
  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      clearCanvas(ctx, canvas.width, canvas.height);
    }
  }
});
</script>

<style scoped>
/**
 * Estils de la pàgina principal.
 * 
 * Disseny fosc premium amb efectes de glassmorfisme,
 * animacions suaus, i tipografia moderna amb la font Inter.
 */

/* Importar la font Inter per a una tipografia moderna i neta */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* --- Contingut principal amb gradient fosc --- */
.home-content {
  --background: linear-gradient(180deg, #0a0a1a 0%, #121228 50%, #1a1a3e 100%);
  font-family: 'Inter', sans-serif;
}

/* --- Capçalera: Títol de l'aplicació amb efecte gradient --- */

/* Barra d'eines amb fons semitransparent */
ion-toolbar {
  --background: rgba(10, 10, 26, 0.85);
  --border-color: rgba(108, 92, 231, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Icona del títol amb animació subtil de rotació */
.app-title-icon {
  font-size: 1.4rem;
  animation: titlePulse 3s ease-in-out infinite;
}

/* Text del títol amb gradient de color */
.app-title-text {
  font-weight: 700;
  font-size: 1.2rem;
  background: linear-gradient(135deg, #6c5ce7, #a29bfe, #74b9ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* --- Badge de FPS amb animació de pulsació --- */
.fps-badge {
  font-family: 'Inter', monospace;
  font-weight: 600;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 12px;
  animation: fpsPulse 2s ease-in-out infinite;
  letter-spacing: 0.5px;
}

/* Animació de pulsació per al badge de FPS */
@keyframes fpsPulse {
  0%, 100% {
    box-shadow: 0 0 6px rgba(0, 184, 148, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 14px rgba(0, 184, 148, 0.7);
    transform: scale(1.05);
  }
}

/* Animació subtil per a la icona del títol */
@keyframes titlePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1) rotate(5deg); }
}

/* --- Contenidor de la càmera --- */
.camera-container {
  padding: 16px;
  display: flex;
  justify-content: center;
}

/* Visor de la càmera amb brillantor i ombra */
.camera-viewport {
  position: relative;
  width: 100%;
  max-width: 640px;
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  overflow: hidden;
  /* Ombra amb brillantor violeta subtil */
  box-shadow:
    0 0 30px rgba(108, 92, 231, 0.3),
    0 0 60px rgba(108, 92, 231, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.5);
  /* Vora subtil amb gradient */
  border: 2px solid rgba(108, 92, 231, 0.3);
  background: #000;
}

/* Element de vídeo: ocupa tot el visor */
/* Usem object-fit: contain per garantir que les coordenades de COCO-SSD
   coincideixin exactament amb la posició visual. 'cover' retallaria el vídeo
   i els bounding boxes no coincidirien amb els objectes reals. */
.camera-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

/* Canvas de deteccions: superposat exactament sobre el vídeo */
.detection-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Permet clics a través del canvas */
}

/* --- Superposició de càrrega amb glassmorfisme --- */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  /* Efecte de glassmorfisme */
  background: rgba(10, 10, 26, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 10;
}

.loading-overlay ion-spinner {
  --color: #a29bfe;
  width: 48px;
  height: 48px;
}

.loading-overlay p {
  color: #a29bfe;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  padding: 0 20px;
  animation: fadeInUp 0.4s ease-out;
}

/* --- Superposició d'error --- */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(10, 10, 26, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 10;
}

.error-icon {
  font-size: 48px;
  color: #e17055;
}

.error-overlay p {
  color: #fab1a0;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  padding: 0 24px;
  max-width: 300px;
}

.error-overlay ion-button {
  --background: rgba(108, 92, 231, 0.3);
  --border-radius: 12px;
  --color: #a29bfe;
  font-weight: 600;
  margin-top: 8px;
}

/* --- Indicador de gravació (EN VIU) --- */
.recording-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 5;
}

/* Punt vermell pulsant de l'indicador EN VIU */
.rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d63031;
  animation: recPulse 1.5s ease-in-out infinite;
}

.rec-text {
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1px;
}

@keyframes recPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px #d63031; }
  50% { opacity: 0.4; box-shadow: 0 0 8px #d63031; }
}

/* --- Secció de resultats amb glassmorfisme --- */
.results-section {
  margin: 16px;
  padding: 20px;
  border-radius: 20px;
  /* Efecte de glassmorfisme */
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

/* Capçalera de la secció de resultats */
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.results-header h2 {
  color: #e0e0ff;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.results-header ion-badge {
  font-weight: 700;
  font-size: 0.85rem;
  padding: 4px 12px;
  border-radius: 12px;
}

/* --- Estat buit: quan no hi ha deteccions --- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
}

/* Icona d'escaneig amb animació */
.scan-icon {
  font-size: 48px;
  color: rgba(162, 155, 254, 0.5);
  animation: scanPulse 2.5s ease-in-out infinite;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
}

/* Animació d'escaneig per a l'estat buit */
@keyframes scanPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.9;
  }
}

/* --- Llista de deteccions --- */
.detection-list {
  background: transparent;
  padding: 0;
}

/* Element individual de detecció amb glassmorfisme */
.detection-item {
  --background: rgba(255, 255, 255, 0.05);
  --border-radius: 14px;
  --padding-start: 12px;
  --padding-end: 12px;
  --inner-padding-end: 0;
  margin-bottom: 8px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s ease;
  animation: fadeInUp 0.3s ease-out;
  animation-fill-mode: backwards;
}

/* Efecte hover/focus per als elements de detecció */
.detection-item:hover,
.detection-item:focus {
  --background: rgba(255, 255, 255, 0.08);
  border-color: rgba(108, 92, 231, 0.3);
  transform: translateX(4px);
  box-shadow: 0 2px 12px rgba(108, 92, 231, 0.15);
}

/* Punt de color de la classe de l'objecte */
.class-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

/* Informació de la detecció (nom + barra) */
.detection-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  margin-left: 8px;
}

/* Nom de la classe de l'objecte detectat */
.detection-class {
  color: #e0e0ff;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: capitalize;
}

/* Barra de confiança (fons) */
.confidence-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

/* Barra de confiança (ompliment amb transició suau) */
.confidence-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease, background-color 0.4s ease;
  /* Brillantor subtil a la barra */
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.2);
}

/* Badge de percentatge de confiança */
.confidence-badge {
  font-family: 'Inter', monospace;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 10px;
  min-width: 52px;
  text-align: center;
}

/* --- Animacions globals --- */

/* Animació d'entrada des de baix */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- Disseny responsiu per a pantalles petites --- */
@media (max-width: 380px) {
  .camera-container {
    padding: 8px;
  }

  .results-section {
    margin: 8px;
    padding: 14px;
  }

  .results-header h2 {
    font-size: 1rem;
  }

  .detection-class {
    font-size: 0.8rem;
  }

  .confidence-badge {
    font-size: 0.7rem;
    padding: 3px 8px;
  }
}

/* --- Mida mitjana de pantalla --- */
@media (min-width: 381px) and (max-width: 768px) {
  .camera-container {
    padding: 12px;
  }
}

/* --- Animació escalonada per als elements de la llista --- */
.detection-item:nth-child(1) { animation-delay: 0ms; }
.detection-item:nth-child(2) { animation-delay: 50ms; }
.detection-item:nth-child(3) { animation-delay: 100ms; }
.detection-item:nth-child(4) { animation-delay: 150ms; }
.detection-item:nth-child(5) { animation-delay: 200ms; }
.detection-item:nth-child(6) { animation-delay: 250ms; }
.detection-item:nth-child(7) { animation-delay: 300ms; }
.detection-item:nth-child(8) { animation-delay: 350ms; }
.detection-item:nth-child(9) { animation-delay: 400ms; }
.detection-item:nth-child(10) { animation-delay: 450ms; }
</style>
