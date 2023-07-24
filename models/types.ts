export interface User {
  uid: string
  email?: string | null
}

export interface Profile {
  displayName: string | null
  photoURL: string | null
}
