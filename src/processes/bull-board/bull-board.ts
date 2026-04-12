import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { BullBoardAppModule } from './bull-board.module';

async function bootstrapBullBoard() {
  const logger = new Logger('BullBoard');

  try {
    const app = await NestFactory.create(BullBoardAppModule);

    const port = process.env.BULL_BOARD_PORT || 3500;
    await app.listen(port, '0.0.0.0');

    logger.log(`Bull Board UI is running on http://0.0.0.0:${port}`);

    const shutdown = async (signal: string) => {
      logger.log(`Received ${signal}, shutting down Bull Board...`);
      await app.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start Bull Board', error as Error);
    process.exit(1);
  }
}

void bootstrapBullBoard();
