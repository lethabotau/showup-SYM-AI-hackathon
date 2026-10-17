import FlowClient from '@/components/flow/FlowClient';

export const metadata = { title: 'showup. — Plan something' };

export default function Home() {
  return <FlowClient startAt="landing" />;
}
