import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API escoltant a http://localhost:${env.PORT}`);
});
