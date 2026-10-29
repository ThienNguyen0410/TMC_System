import { ProfileCard } from '../../components/profile/ProfileCard'
import { useAuth } from '../../hooks/useAuth'

export default function EmployeeProfilePage() {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return null
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Employee</span>
          <h2>My profile</h2>
          <p>Keep your personal contact information up to date for the attendance system.</p>
        </div>
      </div>
      <ProfileCard user={currentUser} />
    </>
  )
}
