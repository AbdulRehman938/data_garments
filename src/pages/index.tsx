import { Hero } from '../components';
import { useLenis } from '../hooks/useLenis';

export const HomePage = () => {
  useLenis();

  return (
    <div className="font-sans">
      <Hero />
    </div>
  );
};
