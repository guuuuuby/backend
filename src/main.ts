import './live';
import { app } from './app';

app.listen(8000, (server) => console.log(`API server on ${server.url}`));
