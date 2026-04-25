import { useAppStore } from '@/store/useAppStore';
import LandingPage from '@/components/LandingPage';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <ChatInterface />;
}
