/**
 * useCamera.ts
 * 
 * Composable de Vue 3 que encapsula l'accés a la càmera del dispositiu.
 * Gestiona l'obtenció del flux de vídeo, la configuració de resolució
 * optimitzada per a TensorFlow.js, i l'alliberament de recursos quan
 * el component es desmunta.
 * 
 * Característiques principals:
 * - Sol·licita la càmera posterior (environment) per defecte
 * - Resolució optimitzada (640x480) per a rendiment amb TF.js
 * - Gestió d'errors amb missatges en català
 * - Neteja automàtica dels recursos en desmuntar el component
 */

import { ref, onUnmounted } from 'vue';

/**
 * Composable useCamera
 * 
 * Proporciona accés reactiu a la càmera del dispositiu.
 * Retorna l'estat del flux, errors, i funcions per iniciar/aturar la càmera.
 */
export function useCamera() {
  // Referència reactiva al flux de vídeo (MediaStream)
  const stream = ref<MediaStream | null>(null);

  // Missatge d'error en cas que la càmera falli (en català)
  const error = ref<string | null>(null);

  // Indica si la càmera està activa i reproduint vídeo
  const isActive = ref(false);

  /**
   * Inicia la càmera i connecta el flux al element de vídeo proporcionat.
   * 
   * @param videoElement - L'element HTML <video> on es mostrarà la càmera.
   * @throws Llança l'error original si la càmera no es pot inicialitzar.
   * 
   * Configuració de la càmera:
   * - facingMode: 'environment' → càmera posterior (ideal per a detecció d'objectes)
   * - Resolució ideal: 640x480 → equilibri entre qualitat i rendiment per a TF.js
   * - audio: false → no necessitem àudio per a detecció d'objectes
   */
  async function startCamera(videoElement: HTMLVideoElement): Promise<void> {
    try {
      // Reiniciem l'error anterior, si n'hi ha
      error.value = null;

      let mediaStream: MediaStream;

      try {
        // Primer intentem la càmera posterior (ideal per a mòbils)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Càmera posterior del dispositiu
            width: { ideal: 640 },     // Amplada ideal per a rendiment amb TF.js
            height: { ideal: 480 },    // Alçada ideal per a rendiment amb TF.js
          },
          audio: false,
        });
      } catch {
        // Si no hi ha càmera posterior (portàtils/escriptori), usem qualsevol càmera disponible
        console.warn('Càmera posterior no disponible, usant càmera frontal.');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      }

      // Guardem la referència al flux per poder aturar-lo més tard
      stream.value = mediaStream;

      // Connectem el flux de vídeo a l'element HTML <video>
      videoElement.srcObject = mediaStream;

      // Iniciem la reproducció del vídeo
      await videoElement.play();

      // Marquem la càmera com a activa
      isActive.value = true;
    } catch (err: any) {
      // Gestió d'errors amb missatges descriptius en català
      if (err.name === 'NotAllowedError') {
        // L'usuari ha denegat el permís de càmera
        error.value = 'Permís de càmera denegat. Si us plau, autoritza l\'accés a la càmera.';
      } else if (err.name === 'NotFoundError') {
        // No s'ha trobat cap dispositiu de càmera
        error.value = 'No s\'ha trobat cap càmera al dispositiu.';
      } else if (err.name === 'NotReadableError') {
        // La càmera està en ús per una altra aplicació
        error.value = 'La càmera està en ús per una altra aplicació.';
      } else if (err.name === 'OverconstrainedError') {
        // Les restriccions de resolució no es poden satisfer
        error.value = 'La càmera no admet la resolució sol·licitada.';
      } else {
        // Error genèric amb el missatge original
        error.value = `Error en inicialitzar la càmera: ${err.message}`;
      }

      // Marquem la càmera com a inactiva
      isActive.value = false;

      // Rellancem l'error perquè el component pare pugui gestionar-lo
      throw err;
    }
  }

  /**
   * Atura la càmera i allibera tots els recursos associats.
   * 
   * Atura totes les pistes (tracks) del flux de vídeo per alliberar
   * la càmera del dispositiu. Això és important per:
   * - Alliberar la càmera perquè altres aplicacions la puguin usar
   * - Apagar l'indicador LED de la càmera
   * - Evitar fuites de memòria
   */
  function stopCamera(): void {
    if (stream.value) {
      // Aturem cada pista del flux (vídeo i/o àudio)
      stream.value.getTracks().forEach(track => track.stop());

      // Eliminem la referència al flux
      stream.value = null;

      // Marquem la càmera com a inactiva
      isActive.value = false;
    }
  }

  /**
   * Neteja automàtica quan el component es desmunta.
   * 
   * Garanteix que la càmera s'aturi i els recursos s'alliberin
   * encara que el component es destrueixi sense cridar stopCamera() explícitament.
   * Això prevé fuites de recursos i la càmera restant activa innecessàriament.
   */
  onUnmounted(() => {
    stopCamera();
  });

  // Retornem l'estat reactiu i les funcions del composable
  return {
    stream,       // Flux de vídeo actiu (MediaStream | null)
    error,        // Missatge d'error en català (string | null)
    isActive,     // Indica si la càmera està activa (boolean)
    startCamera,  // Funció per iniciar la càmera
    stopCamera,   // Funció per aturar la càmera
  };
}
