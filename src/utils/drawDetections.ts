/**
 * drawDetections.ts
 * 
 * Utilitats de dibuix sobre canvas per a la visualització de deteccions d'objectes.
 * Dibuixa rectangles delimitadors (bounding boxes) amb accents moderns a les cantonades,
 * etiquetes amb fons semitransparent, i un disseny visual atractiu i professional.
 * 
 * Característiques:
 * - Paleta de colors vibrants per a 20+ classes COCO
 * - Accents decoratius a les cantonades dels rectangles
 * - Etiquetes amb fons arrodonit i semitransparent
 * - Escalat automàtic de coordenades vídeo → canvas
 * - Polyfill per a roundRect en WebViews antics
 */

import type { DetectedObject } from '@/composables/useObjectDetection';

/**
 * Paleta de colors per a les classes d'objectes més comunes del dataset COCO.
 * Colors vibrants i fàcilment distingibles per a una visualització clara.
 * 
 * El dataset COCO conté 80 categories. Aquí definim colors per a les
 * 20+ més comunes i un color per defecte per a la resta.
 */
const CLASS_COLORS: Record<string, string> = {
  // Persones
  person: '#6c5ce7',       // Violeta — persones

  // Vehicles
  car: '#00cec9',          // Turquesa — cotxes
  truck: '#0984e3',        // Blau — camions
  bus: '#e17055',          // Taronja fosc — autobusos
  motorcycle: '#fdcb6e',   // Groc daurat — motocicletes
  bicycle: '#00b894',      // Verd menta — bicicletes
  airplane: '#a29bfe',     // Lavanda — avions
  boat: '#74b9ff',         // Blau clar — vaixells
  train: '#fab1a0',        // Salmó — trens

  // Animals
  dog: '#fd79a8',          // Rosa — gossos
  cat: '#ffeaa7',          // Groc pàl·lid — gats
  horse: '#55efc4',        // Verd clar — cavalls
  bird: '#81ecec',         // Cyan clar — ocells
  cow: '#dfe6e9',          // Gris clar — vaques
  sheep: '#b2bec3',        // Gris — ovelles
  elephant: '#636e72',     // Gris fosc — elefants
  bear: '#d63031',         // Vermell — óssos
  zebra: '#2d3436',        // Quasi negre — zebres
  giraffe: '#f9ca24',      // Groc intens — girafes

  // Objectes quotidians
  chair: '#e056fd',        // Magenta — cadires
  couch: '#7ed6df',        // Turquesa clar — sofàs
  bed: '#f8a5c2',          // Rosa clar — llits
  'dining table': '#778beb', // Blau lila — taules de menjador
  toilet: '#cf6a87',       // Rosa fosc — lavabos
  tv: '#3dc1d3',           // Cyan — televisors
  laptop: '#e77f67',       // Taronja — portàtils
  'cell phone': '#786fa6', // Lila fosc — telèfons mòbils
  book: '#f19066',         // Meló — llibres
  bottle: '#303952',       // Blau fosc — ampolles
  cup: '#e15f41',          // Vermell taronja — tasses
  knife: '#c44569',        // Rosa fosc — ganivets
  fork: '#574b90',         // Violeta fosc — forquilles
  spoon: '#f78fb3',        // Rosa — culleres
  bowl: '#3d3d3d',         // Gris fosc — bols
  banana: '#f6e58d',       // Groc clar — plàtans
  apple: '#ff6b6b',        // Vermell clar — pomes
  sandwich: '#feca57',     // Groc — entrepans
  pizza: '#ff9ff3',        // Rosa clar — pizzes
  backpack: '#48dbfb',     // Blau cel — motxilles
  umbrella: '#1dd1a1',     // Verd — paraigües
  handbag: '#f368e0',      // Fucsia — bosses de mà
  suitcase: '#ff9f43',     // Taronja clar — maletes
  clock: '#54a0ff',        // Blau — rellotges
  vase: '#5f27cd',         // Violeta fosc — gerros

  // Color per defecte per a classes no definides
  default: '#74b9ff',      // Blau clar — qualsevol altra classe
};

/**
 * Obté el color assignat a una classe d'objecte.
 * Si la classe no té un color específic, retorna el color per defecte.
 * 
 * @param className - Nom de la classe de l'objecte (ex: 'person', 'car')
 * @returns Color en format hexadecimal (ex: '#6c5ce7')
 */
function getColorForClass(className: string): string {
  return CLASS_COLORS[className] || CLASS_COLORS.default;
}

/**
 * Polyfill per a CanvasRenderingContext2D.roundRect
 * 
 * La funció roundRect no està disponible en tots els WebViews,
 * especialment en versions antigues d'Android WebView.
 * Aquesta funció dibuixa un rectangle amb cantonades arrodonides
 * utilitzant arcs i línies manualment com a alternativa segura.
 * 
 * @param ctx - Context 2D del canvas
 * @param x - Coordenada X del vèrtex superior esquerre
 * @param y - Coordenada Y del vèrtex superior esquerre
 * @param width - Amplada del rectangle
 * @param height - Alçada del rectangle
 * @param radii - Radis de les cantonades [supEsquerra, supDreta, infDreta, infEsquerra]
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radii: number[]
): void {
  // Normalitzem els radis: si en tenim menys de 4, omplim amb el primer valor
  const [tl = 0, tr = tl, br = tl, bl = tr] = radii;

  ctx.beginPath();
  // Cantonada superior esquerra
  ctx.moveTo(x + tl, y);
  // Línia superior → cantonada superior dreta
  ctx.lineTo(x + width - tr, y);
  ctx.arcTo(x + width, y, x + width, y + tr, tr);
  // Línia dreta → cantonada inferior dreta
  ctx.lineTo(x + width, y + height - br);
  ctx.arcTo(x + width, y + height, x + width - br, y + height, br);
  // Línia inferior → cantonada inferior esquerra
  ctx.lineTo(x + bl, y + height);
  ctx.arcTo(x, y + height, x, y + height - bl, bl);
  // Línia esquerra → cantonada superior esquerra
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

/**
 * Dibuixa totes les deteccions d'objectes sobre el canvas.
 * 
 * Per a cada objecte detectat, dibuixa:
 * 1. Rectangle delimitador (bounding box) amb el color de la classe
 * 2. Accents decoratius a les 4 cantonades (disseny modern)
 * 3. Etiqueta amb el nom de la classe i percentatge de confiança
 * 4. Fons semitransparent darrere l'etiqueta per a llegibilitat
 * 
 * Les coordenades del model (espai del vídeo) s'escalen automàticament
 * a les coordenades del canvas, permetent que el canvas tingui una mida
 * diferent al vídeo original.
 * 
 * @param ctx - Context 2D del canvas on es dibuixaran les deteccions
 * @param predictions - Llista d'objectes detectats pel model
 * @param canvasWidth - Amplada actual del canvas (en píxels CSS)
 * @param canvasHeight - Alçada actual del canvas
 * @param videoWidth - Amplada del vídeo original (resolució de la càmera)
 * @param videoHeight - Alçada del vídeo original
 */
export function drawDetections(
  ctx: CanvasRenderingContext2D,
  predictions: DetectedObject[],
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number
): void {
  // Netejar el canvas completament abans de dibuixar les noves deteccions
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Calcular els factors d'escala per convertir coordenades del vídeo al canvas
  // Això permet que el canvas i el vídeo tinguin mides diferents
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;

  // Iterar sobre cada predicció i dibuixar-la al canvas
  for (const prediction of predictions) {
    // Obtenir les coordenades originals del rectangle delimitador (en espai del vídeo)
    const [x, y, width, height] = prediction.bbox;

    // Escalar les coordenades a l'espai del canvas
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledWidth = width * scaleX;
    const scaledHeight = height * scaleY;

    // Obtenir el color assignat a la classe d'objecte
    const color = getColorForClass(prediction.class);

    // Calcular el percentatge de confiança (0-100%)
    const confidence = Math.round(prediction.score * 100);

    // --- 1. Dibuixar el rectangle delimitador principal ---
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

    // --- 2. Dibuixar accents decoratius a les cantonades (disseny modern) ---
    const cornerLength = 15; // Longitud dels accents de cantonada en píxels
    ctx.lineWidth = 4;

    // Cantonada superior esquerra
    ctx.beginPath();
    ctx.moveTo(scaledX, scaledY + cornerLength);
    ctx.lineTo(scaledX, scaledY);
    ctx.lineTo(scaledX + cornerLength, scaledY);
    ctx.stroke();

    // Cantonada superior dreta
    ctx.beginPath();
    ctx.moveTo(scaledX + scaledWidth - cornerLength, scaledY);
    ctx.lineTo(scaledX + scaledWidth, scaledY);
    ctx.lineTo(scaledX + scaledWidth, scaledY + cornerLength);
    ctx.stroke();

    // Cantonada inferior esquerra
    ctx.beginPath();
    ctx.moveTo(scaledX, scaledY + scaledHeight - cornerLength);
    ctx.lineTo(scaledX, scaledY + scaledHeight);
    ctx.lineTo(scaledX + cornerLength, scaledY + scaledHeight);
    ctx.stroke();

    // Cantonada inferior dreta
    ctx.beginPath();
    ctx.moveTo(scaledX + scaledWidth - cornerLength, scaledY + scaledHeight);
    ctx.lineTo(scaledX + scaledWidth, scaledY + scaledHeight);
    ctx.lineTo(scaledX + scaledWidth, scaledY + scaledHeight - cornerLength);
    ctx.stroke();

    // --- 3. Dibuixar l'etiqueta amb el nom i la confiança ---
    const label = `${prediction.class} ${confidence}%`;
    ctx.font = 'bold 14px Inter, sans-serif';
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = 20;  // Alçada aproximada del text
    const padding = 6;      // Espaiat intern de l'etiqueta

    // Fons semitransparent darrere l'etiqueta per a llegibilitat
    // Afegim 'CC' al color hexadecimal per obtenir ~80% d'opacitat
    ctx.fillStyle = color + 'CC';

    // Utilitzem el polyfill drawRoundRect per compatibilitat amb WebViews antics
    // Les cantonades superiors són arrodonides, les inferiors són rectes
    drawRoundRect(
      ctx,
      scaledX,
      scaledY - textHeight - padding * 2,
      textWidth + padding * 2,
      textHeight + padding,
      [6, 6, 0, 0] // [supEsq, supDreta, infDreta, infEsq]
    );
    ctx.fill();

    // --- 4. Dibuixar el text de l'etiqueta ---
    ctx.fillStyle = '#ffffff'; // Text blanc per contrast
    ctx.fillText(label, scaledX + padding, scaledY - padding - 2);
  }
}

/**
 * Neteja completament el canvas.
 * 
 * Útil per esborrar totes les deteccions quan la càmera s'atura
 * o quan no hi ha objectes detectats.
 * 
 * @param ctx - Context 2D del canvas
 * @param width - Amplada del canvas
 * @param height - Alçada del canvas
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}
