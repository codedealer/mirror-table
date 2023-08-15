import { Auth } from "@firebase/auth";
import {
  Firestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
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
      query: typeof query;
      where: typeof where;
      orderBy: typeof orderBy;
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
      query: typeof query;
      where: typeof where;
      orderBy: typeof orderBy;
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
      query: typeof query;
      where: typeof where;
      orderBy: typeof orderBy;
    };
  }
}

export {}
