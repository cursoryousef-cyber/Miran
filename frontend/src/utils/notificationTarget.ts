/**
 * Where a notification points.
 *
 * Notifications already carry `referenceType` / `referenceId` from the backend;
 * nothing here invents a new navigation layer — it maps those onto the routes
 * that already exist. A TrainingRequest means a different screen depending on
 * which side of the workflow the reader sits on: the university tracks its own
 * submissions, the cluster works the distribution tabs, the hospital reviews
 * what reached it.
 */
export function notificationTarget(
  n: { referenceType?: string | null; referenceId?: string | null; type?: string },
  isUniversity: boolean,
  isCluster: boolean,
  isHospital: boolean,
): string | null {
  const id = n.referenceId;
  switch (n.referenceType) {
    case 'TrainingRequest': {
      if (isHospital) return `/hospital?tab=requests${id ? `&request=${id}` : ''}`;
      if (isUniversity) return `/affiliations${id ? `?request=${id}` : ''}`;
      const sent = ['allocation', 'distribution', 'sent_to_hospital'].includes(n.type ?? '');
      return `/affiliations?tab=${sent ? 'sent' : 'incoming'}${id ? `&request=${id}` : ''}`;
    }
    // Recipients (trainer/trainee) get the inbox of events addressed to them;
    // only the management consoles get the sender screen. Routing everyone to
    // /training-events bounced the trainee off it entirely — that route's
    // allowedRoles in App.tsx has no TRAINEE — and showed the trainer the
    // authoring console instead of the event they were told about.
    case 'TrainingEvent':
      return isHospital || isCluster ? '/training-events' : '/my-training-events';
    case 'Incident':
      return `/incidents${id ? `?incident=${id}` : ''}`;
    case 'Rotation':
    case 'TraineeAllocation':
    case 'TrainingRequestTrainee':
      if (isHospital) return '/hospital?tab=acceptance';
      if (isCluster) return '/cluster-trainees';
      return '/';
    case 'GeneratedReport':
      return '/reports';
    case 'ClinicalCaseLog':
    case 'Attendance':
      return '/logbook';
    default:
      return null;
  }
}
