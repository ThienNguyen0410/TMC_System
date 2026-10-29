import { ProfileCard } from '../../components/profile/ProfileCard'
import { useAuth } from '../../hooks/useAuth'

export default function AdminProfilePage() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return null
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h2>My profile</h2>
          <p>Review your administrator account details and update your contact information.</p>
        </div>
      </div>
      <ProfileCard user={currentUser} />
    </>
  )
}
