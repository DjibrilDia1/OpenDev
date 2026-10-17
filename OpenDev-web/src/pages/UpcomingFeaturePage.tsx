import { AppLayout } from '../components/layout/AppLayout'
import { EmptyState } from '../components/common/EmptyState'
export function UpcomingFeaturePage({ title }: { title: string }) {
  return (
    <AppLayout>
      <EmptyState
        title={title}
        description="Cette fonctionnalité sera disponible lors d’une prochaine étape de connexion aux données."
        to="/"
        label="Retour au fil"
      />
    </AppLayout>
  )
}
