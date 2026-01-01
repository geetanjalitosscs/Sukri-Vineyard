import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global API prefix
  app.setGlobalPrefix('api');
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 8087;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  
  // Get the actual server address
  const server = app.getHttpServer();
  const address = server.address();
  const serverPort = typeof address === 'object' ? address?.port : port;
  
  // Get network interfaces to show actual IP addresses
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses: string[] = [];
  
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const interfaces = networkInterfaces[interfaceName];
    if (interfaces) {
      interfaces.forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddresses.push(iface.address);
        }
      });
    }
  });
  
  console.log(`🚀 Backend server running on http://${host}:${serverPort}/api`);
  console.log(`   Local: http://localhost:${serverPort}/api`);
  
  if (ipAddresses.length > 0) {
    ipAddresses.forEach((ip) => {
      console.log(`   Network: http://${ip}:${serverPort}/api`);
    });
  } else {
    console.log(`   Network: http://<your-ip>:${serverPort}/api`);
  }
}

bootstrap();

