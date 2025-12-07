import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/api.log' })
  ]
});

export function logRequest(req: any, additionalData?: any) {
  const logData = {
    method: req.method,
    path: req.path,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: req.user?.id || null,
    sessionId: req.sessionID || null,
    ...additionalData
  };

  logger.info('API Request', logData);
}

export default logger;
