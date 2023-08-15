import type { DocumentData, QueryDocumentSnapshot, SnapshotOptions, WithFieldValue } from '@firebase/firestore';

const firestoreDataConverter = <T>() => ({
  toFirestore: (data: WithFieldValue<T>) => data,
  fromFirestore: (
    snap: QueryDocumentSnapshot<DocumentData, DocumentData>,
    options?: SnapshotOptions,
  ) => snap.data(options) as T,
});

export default firestoreDataConverter;
