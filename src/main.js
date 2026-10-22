import { createLoadingScreen } from './ui/loading.js';

// Startpunt: laadscherm tonen, WebGPU controleren en dan pas het spel (+ three.js) inladen.
const loading = createLoadingScreen();

const hasWebGPU = async () => {
  if (!navigator.gpu) return false;
  try {
    return (await navigator.gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
};

if (!(await hasWebGPU())) {
  loading.fail(
    'Je browser ondersteunt geen WebGPU',
    'Deze game gebruikt WebGPU-shaders. Open hem in een recente versie van Chrome of Edge (113 of nieuwer) op een computer, of in Safari 26 of nieuwer.',
  );
} else {
  try {
    await import('./game.js');
    loading.done();
  } catch (error) {
    console.error(error);
    loading.fail('Er ging iets mis bij het laden', 'Herlaad de pagina. Lukt het nog altijd niet, probeer dan een andere browser.');
  }
}
