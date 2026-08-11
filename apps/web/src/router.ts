import { LandingPage } from '@workspace/core/pages';
import { createBrowserRouter } from 'react-router';

import { createRoutes } from './routes';

export const router = createBrowserRouter(createRoutes(LandingPage));
