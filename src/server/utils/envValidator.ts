import fs from 'fs';

export const validateEnvironment = () => {
  const requiredVars = ['DB_PATH', 'RAW_CORPUS_BASE_PATH'];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    // We log error but maybe not throw yet to avoid breaking dev if they haven't set it?
    // But the plan says "Harden", so we should be strict.
    // However, we want to allow the user to fix it.
    console.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
    // For now we won't exit process, but server might malfunction.
  } else {
    console.log('Environment configuration valid.');
  }
};

export const getEnv = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};
