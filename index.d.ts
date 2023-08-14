import { Auth } from "@firebase/auth";
import {
  Firestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  serverTimestamp,
} from "@firebase/firestore";

declare module '#app' {
  interface NuxtApp {
    $auth: Auth;
    $db: Firestore;
    $ops: {
      doc: typeof doc;
      setDoc: typeof setDoc;
      onSnapshot: typeof onSnapshot;
      collection: typeof collection;
      serverTimestamp: typeof serverTimestamp;
    };
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $auth: Auth;
    $db: Firestore;
    $ops: {
      doc: typeof doc;
      setDoc: typeof setDoc;
      onSnapshot: typeof onSnapshot;
      collection: typeof collection;
      serverTimestamp: typeof serverTimestamp;
    };
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $auth: Auth;
    $db: Firestore;
    $ops: {
      doc: typeof doc;
      setDoc: typeof setDoc;
      onSnapshot: typeof onSnapshot;
      collection: typeof collection;
      serverTimestamp: typeof serverTimestamp;
    };
  }
}

export {}
