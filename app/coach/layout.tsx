import type { Metadata } from 'next';
import { CoachProvider } from '@/lib/coach-context';
import CoachShell from '@/components/CoachShell';

export const metadata: Metadata = {
  title: 'HDY Coach',
  description: 'Banque d’exercices, programmation musculation et préparation physique.',
  applicationName: 'HDY Coach',
};

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <CoachProvider>
      <CoachShell>{children}</CoachShell>
    </CoachProvider>
  );
}
