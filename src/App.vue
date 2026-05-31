<template>
  <!-- Component arrel de l'aplicació -->
  <!-- IonApp proporciona el contenidor principal amb els estils d'Ionic -->
  <!-- IonRouterOutlet renderitza les pàgines segons la ruta activa -->
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
</script>
