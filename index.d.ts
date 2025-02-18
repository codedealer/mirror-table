import { Auth } from "@firebase/auth";
import {
  Firestore,
} from "@firebase/firestore";
import { Logger } from "~/plugins/logger";

declare module '#app' {
  interface NuxtApp {
    $auth: Auth;
    $db: Firestore;
    $logger: Logger;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $auth: Auth;
    $db: Firestore;
    $logger: Logger;
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $auth: Auth;
    $db: Firestore;
    $logger: Logger;
  }
}

export {}
