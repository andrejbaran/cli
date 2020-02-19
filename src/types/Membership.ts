//membership objects returned by /teams/*/members API
export interface Membership {
  userId: string
  teamId: string
  username: string
  createdAt: string
  firstName: string
  lastName: string
}
