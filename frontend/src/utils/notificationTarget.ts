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
      // The cluster reads a request either as incoming or as already sent on;
      // the notification type is what distinguishes them.
      const sent = ['allocation', 'distribution', 'sent_to_hospital'].includes(n.type ?? '');
      return `/affiliations?tab=${sent ? 'sent' : 'incoming'}${id ? `&request=${id}` : ''}`;
    }
    // A training event notification only ever reaches someone who is a
    // recipient of it — senders are not notified of their own event — so this
    // always points at the recipient inbox rather than the sender console.
    case 'TrainingEvent':
      return '/my-training-events';
    case 'Incident':
      return `/incidents${id ? `?incident=${id}` : ''}`;
    case 'Rotation':
      return isCluster ? '/cluster-trainees' : '/hospital?tab=trainees';
    case 'GeneratedReport':
      return '/reports';
    case 'ClinicalCaseLog':
    case 'Attendance':
      return '/logbook';
    default:
      return null;
  }
}
