/**
 * useObjectDetection.ts
 * 
 * Composable de Vue 3 que encapsula la detecció d'objectes en temps real
 * utilitzant TensorFlow.js amb el model COCO-SSD.
 * 
 * Característiques principals:
 * - Càrrega del model COCO-SSD amb backend WebGL per acceleració per GPU
 * - Utilitza lite_mobilenet_v2 com a base (el més ràpid, ~4-5 MB)
 * - Inferència asíncrona que no bloqueja la interfície d'usuari
 * - Gestió completa del cicle de vida del model (càrrega, detecció, alliberament)
 * - Estat reactiu per a la interfície (progrés de càrrega, errors, disponibilitat)
 * 
 * El model COCO-SSD pot detectar 80 categories d'objectes comuns:
 * persones, vehicles, animals, mobles, aliments, etc.
 */

import { ref, shallowRef } from 'vue';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

/**
 * Interfície que defineix un objecte detectat.
 * 
 * @property bbox - Coordenades del rectangle delimitador [x, y, amplada, alçada]
 * @property class - Nom de la classe de l'objecte detectat (en anglès, del dataset COCO)
 * @property score - Puntuació de confiança de la detecció (0.0 a 1.0)
 */
export interface DetectedObject {
  bbox: [number, number, number, number]; // [x, y, amplada, alçada] en píxels del vídeo
  class: string;   // Classe de l'objecte (ex: 'person', 'car', 'dog')
  score: number;   // Confiança de la predicció (0.0 - 1.0)
}

/**
 * Composable useObjectDetection
 * 
 * Proporciona tota la funcionalitat necessària per a la detecció d'objectes:
 * - Càrrega i inicialització del model amb seguiment del progrés
 * - Execució d'inferències sobre fotogrames de vídeo
 * - Alliberament de recursos del model
 * 
 * @returns Estat reactiu i funcions per gestionar la detecció d'objectes
 */
export function useObjectDetection() {
  // Referència al model COCO-SSD carregat (usant shallowRef per evitar Proxies profunds)
  const model = shallowRef<cocoSsd.ObjectDetection | null>(null);

  // Indica si el model s'està carregant (per mostrar spinner/progrés)
  const isLoading = ref(false);

  // Indica si el model està llest per fer deteccions
  const isReady = ref(false);

  // Missatge d'error si la càrrega o la detecció falla (en català)
  const error = ref<string | null>(null);

  // Text descriptiu del progrés de càrrega (en català, per mostrar a l'usuari)
  const loadingProgress = ref('');

  /**
   * Carrega i inicialitza el model COCO-SSD.
   * 
   * Procés de càrrega:
   * 1. Configura el backend WebGL per aprofitar l'acceleració per GPU
   * 2. Descarrega el model lite_mobilenet_v2 (~4-5 MB)
   * 3. Inicialitza el model per a inferència
   * 
   * El backend WebGL és preferit perquè:
   * - Utilitza la GPU del dispositiu per a operacions de tensors
   * - Ofereix millor rendiment que el backend CPU pur
   * - És compatible amb la majoria de navegadors i WebViews moderns
   * 
   * El model lite_mobilenet_v2 s'escull perquè:
   * - És el més lleuger (~4-5 MB vs ~20 MB del mobilenet_v2 complet)
   * - Ofereix el millor equilibri entre velocitat i precisió en dispositius mòbils
   * - Temps d'inferència típic: 50-150ms per fotograma en mòbils moderns
   */
  async function loadModel(): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;

      // Pas 1: Inicialitzar TensorFlow.js amb el millor backend disponible
      loadingProgress.value = 'Inicialitzant TensorFlow.js...';
      
      // Deixem que TF.js auto-detecti el millor backend (WebGL > WASM > CPU)
      // No forcem 'webgl' perquè pot fallar en alguns navegadors/WebViews
      await tf.ready();
      
      let currentBackend = tf.getBackend();
      console.log(`[ObjectLent] Backend TF.js detectat: ${currentBackend}`);
      
      // Si no hi ha backend, intentem establir-ne un explícitament
      if (!currentBackend) {
        console.warn('[ObjectLent] Cap backend detectat, intentant WebGL...');
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          currentBackend = tf.getBackend();
        } catch (webglErr) {
          console.warn('[ObjectLent] WebGL no disponible, usant CPU...');
          await tf.setBackend('cpu');
          await tf.ready();
          currentBackend = tf.getBackend();
        }
      }
      
      console.log(`[ObjectLent] Backend final: ${currentBackend}`);
      loadingProgress.value = `Backend: ${currentBackend}. Descarregant model...`;

      // Pas 2: Descarregar i inicialitzar el model COCO-SSD
      loadingProgress.value = 'Descarregant model COCO-SSD...';

      // Carreguem el model amb la base lite_mobilenet_v2 (la més ràpida)
      model.value = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
      });

      console.log('[ObjectLent] Model COCO-SSD carregat. Executant warmup...');
      loadingProgress.value = 'Preparant el model (warmup)...';

      // Pas 3: Warmup — executem una detecció en blanc per inicialitzar els tensors interns
      // Això preveu errors de 'backend' undefined durant les primeres inferències reals
      try {
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 320;
        dummyCanvas.height = 240;
        const dummyCtx = dummyCanvas.getContext('2d');
        if (dummyCtx) {
          dummyCtx.fillStyle = '#808080';
          dummyCtx.fillRect(0, 0, 320, 240);
        }
        await model.value.detect(dummyCanvas);
        console.log('[ObjectLent] Warmup completat correctament.');
      } catch (warmupErr) {
        console.warn('[ObjectLent] Warmup ha fallat (pot funcionar igualment):', warmupErr);
      }

      // El model s'ha carregat correctament
      isReady.value = true;
      loadingProgress.value = 'Model carregat correctament!';
    } catch (err: any) {
      // Error durant la càrrega del model - informem l'usuari en català
      console.error('[ObjectLent] Error carregant model:', err);
      error.value = `Error en carregar el model: ${err.message}`;
      isReady.value = false;
    } finally {
      // Sempre marquem que la càrrega ha finalitzat (amb èxit o error)
      isLoading.value = false;
    }
  }

  /**
   * Executa la detecció d'objectes sobre un fotograma de vídeo.
   * 
   * @param videoElement - L'element HTML <video> del qual s'extrauran els fotogrames
   * @param maxDetections - Nombre màxim d'objectes a detectar (per defecte: 20)
   * @param minScore - Puntuació mínima de confiança per acceptar una detecció (per defecte: 0.5)
   * @returns Llista d'objectes detectats amb les seves coordenades i confiança
   * 
   * Notes importants:
   * - Retorna una llista buida si el model no està carregat o el vídeo no està llest
   * - L'element de vídeo ha de tenir readyState >= 2 (HAVE_CURRENT_DATA)
   *   per garantir que hi ha un fotograma disponible per analitzar
   * - Cada crida a detect() és asíncrona i pot trigar 50-150ms en mòbils
   * - No s'hauria de cridar detect() en paral·lel per evitar sobrecàrrega de la GPU
   */
  // Comptador d'errors consecutius per evitar spam a la consola
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  async function detect(
    videoElement: HTMLVideoElement,
    maxDetections: number = 20,
    minScore: number = 0.5
  ): Promise<DetectedObject[]> {
    // Comprovem que el model està carregat i el vídeo té dades disponibles
    if (!model.value || !videoElement.readyState || videoElement.readyState < 2) {
      return [];
    }

    // Si hem tingut massa errors consecutius, aturem les deteccions
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      return [];
    }

    // Verifiquem que el backend de TF.js està actiu abans de fer inferència
    if (!tf.getBackend()) {
      console.error('[ObjectLent] Backend TF.js no disponible. Intentant reinicialitzar...');
      try {
        await tf.ready();
      } catch {
        consecutiveErrors++;
        return [];
      }
    }

    try {
      // Executem la inferència del model sobre el fotograma actual del vídeo
      const predictions = await model.value.detect(
        videoElement,
        maxDetections,
        minScore
      );

      // Reiniciem el comptador d'errors si la detecció ha tingut èxit
      consecutiveErrors = 0;

      return predictions as DetectedObject[];
    } catch (err) {
      consecutiveErrors++;
      if (consecutiveErrors <= 3) {
        console.error(`[ObjectLent] Error detecció (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err);
      } else if (consecutiveErrors === MAX_CONSECUTIVE_ERRORS) {
        console.error(`[ObjectLent] Massa errors consecutius. Detecció aturada. Recarrega la pàgina.`);
        error.value = 'Error persistent en la detecció. Recarrega la pàgina.';
      }
      return [];
    }
  }

  /**
   * Allibera els recursos del model de TensorFlow.js.
   * 
   * Important cridar aquest mètode quan ja no necessitem fer deteccions per:
   * - Alliberar memòria de la GPU (tensors i buffers WebGL)
   * - Evitar fuites de memòria en aplicacions de llarga durada
   * - Permetre que la GPU sigui usada per altres processos
   * 
   * Després de cridar dispose(), cal tornar a cridar loadModel()
   * si es volen reprendre les deteccions.
   */
  function dispose(): void {
    if (model.value) {
      // Alliberem tots els tensors i recursos del model
      model.value.dispose();
      model.value = null;
      isReady.value = false;
    }
  }

  // Retornem l'estat reactiu i les funcions del composable
  return {
    model,            // Referència al model COCO-SSD (ObjectDetection | null)
    isLoading,        // Indica si el model s'està carregant
    isReady,          // Indica si el model està llest per detectar
    error,            // Missatge d'error en català (string | null)
    loadingProgress,  // Text de progrés de càrrega en català
    loadModel,        // Funció per carregar el model
    detect,           // Funció per executar una detecció sobre un fotograma
    dispose,          // Funció per alliberar els recursos del model
  };
}
