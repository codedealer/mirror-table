import type { Auth } from '@firebase/auth';
import type {
  Firestore,
} from '@firebase/firestore';
import type { Logger } from '~/plugins/logger';
import type {
  DriveFileCreatedEvent,
  DriveFileHardMissingEvent,
  DriveFileSavedEvent,
  DriveFileTrashedEvent,
} from '~/stores/drive-file-store';

declare module '#app' {
  interface NuxtApp {
    $auth: Auth;
    $db: Firestore;
    $logger: Logger;
  }

  interface RuntimeNuxtHooks {
    'drive-file:created': (event: DriveFileCreatedEvent) => void | Promise<void>;
    'drive-file:trashed': (event: DriveFileTrashedEvent) => void | Promise<void>;
    'drive-file:saved': (event: DriveFileSavedEvent) => void | Promise<void>;
    'drive-file:hard-missing': (event: DriveFileHardMissingEvent) => void | Promise<void>;
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

export {};
