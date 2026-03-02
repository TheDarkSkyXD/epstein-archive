import 'dotenv/config';
import { App } from './app.js';
import { logger } from './server/services/Logger.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap() {
  try {
    const app = new App();
    await app.init();
    await app.listen(PORT);
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
