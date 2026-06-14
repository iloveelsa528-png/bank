import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import TeachersClient from './TeachersClient';

export default async function AdminTeachersPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/');

  return <TeachersClient currentUserId={user.id} />;
}
