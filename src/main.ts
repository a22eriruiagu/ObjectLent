import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';
import App from './App.vue';
import router from './router';

/* ============================================
 * Estils bàsics d'Ionic
 * Aquests fitxers CSS són necessaris per al
 * funcionament correcte dels components Ionic
 * ============================================ */
import '@ionic/vue/css/core.css';

/* Estils de normalització i estructura */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Utilitats CSS opcionals d'Ionic */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* ============================================
 * Tema personalitzat de l'aplicació
 * Variables CSS i estils globals
 * ============================================ */
import './theme/variables.css';

// Crear i configurar l'aplicació Vue
const app = createApp(App)
  .use(IonicVue, {
    mode: 'md' // Material Design per a Android — estil consistent
  })
  .use(router);

// Muntar l'aplicació quan el router estigui preparat
// Això assegura que la navegació inicial s'hagi completat
router.isReady().then(() => {
  app.mount('#app');
});
