
import each from 'lodash/fp/each'

import { createDeviceApi } from './device'

export const routeApi = ({ server, logger }) => {
	const { createRoutes } = createDeviceApi({ logger })
	each(r => server.route(r))(createRoutes())
	return server
}
