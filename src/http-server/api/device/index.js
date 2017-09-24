
import find from 'lodash/fp/find'
import filter from 'lodash/fp/filter'
import has from 'lodash/fp/has'

// the fp versions of these methods do not seem to work, need more research
import _ from 'lodash'
const get = p => o => _.get(o, p)
const set = p => v => o => _.set(o, p, v)
const unset = p => o => _.unset(o, p)

export const createDeviceApi = ({ logger }) => {
	let devices = []

	const findDevice = ({
		model,
		iteration
	}) => Promise.resolve(
		find(d => d.model == model && d.iteration == iteration)(devices)
	)

	const removeDevice = ({
		model,
		iteration
	}) => Promise.resolve(
		devices = filter(d =>
			d.model != model || d.iteration != iteration
		)(devices)
	)

	const getFilter = filterStr => filterStr.replace(/\//g, '.')

	const handleGetDevice = ({
		reply,
		device: { model, iteration },
		filterStr
	}) => findDevice({ model, iteration })
		.then(d => {
			let sc = 404
			let res = void 0
			if (d) {
				if (filterStr) {
					const filter = getFilter(filterStr)
					if (has(filter)(d)) {
						res = get(filter)(d)
						sc = 200
					}
				}
				else {
					res = d
					sc = 200
				}
			}
			reply(res).statusCode = sc
		})

	const handleUpsertDevice = ({
		reply,
		payload,
		device: { model, iteration },
		filterStr
	}) => findDevice({ model, iteration })
		.then(d => {
			let sc = 200
			if (!d) {
				d = { model, iteration }
				sc = 201
			}
			else {
				removeDevice({ model, iteration })
			}
			if (filterStr) {
				set(getFilter(filterStr))(payload)(d)
			}
			else {
				d = Object.assign(payload, d)
			}
			devices.push(d)
			reply().statusCode = sc
		})

	const handleDeleteDevice = ({
		reply,
		device: { model, iteration },
		filterStr
	}) => findDevice({ model, iteration })
		.then(d => {
			let sc = 204
			if (d) {
				if (filterStr) {
					const filter = getFilter(filterStr)
					if (has(filter)(d)) {
						unset(filter)(d)
						sc = 200
					}
				}
				else {
					removeDevice(d)
					sc = 200
				}
			}
			reply().statusCode = sc
		})

	const handle = ({
		method,
		headers,
		reply,
		payload,
		device,
		filterStr
	}) => ({
			get: handleGetDevice,
			put: handleUpsertDevice,
			post: handleUpsertDevice,
			delete: handleDeleteDevice
		})[method]({
			reply,
			payload,
			device,
			filterStr: filterStr && filterStr[filterStr.length - 1] == '/'
				? filterStr.substring(0, filterStr.length - 1)
				: filterStr
		}).catch(err => logger.next([ 'ERROR', err.stack ]))

	return {
		createRoutes: () => [
			({
				method: 'GET',
				path: `/api/device/data`,
				handler: ({ method, headers }, reply) => {
					logger.next(['handing get all devices request', { method, headers }])
					reply(devices)
				}
			}),
			({
				method: [ 'GET', 'DELETE' ],
				path: `/api/device/data/{model}/{iteration}/{filterStr*}`,
				handler: ({
					method,
					headers,
					params: { model, iteration, filterStr },
				}, reply) => {
					const req = { method, device: { model, iteration }, filterStr }
					logger.next(['handing request', Object.assign({ headers }, req)])
					handle(Object.assign({ reply }, req))
				}
			}),
			({
				method: [ 'PUT', 'POST' ],
				path: `/api/data/device/{model}/{iteration}/{filterStr*}`,
				config: { payload: { parse: true, allow: 'application/json' } },
				handler: ({
					method,
					headers,
					params: { model, iteration, filterStr },
					payload
				}, reply) => {
					const req = { method, device: { model, iteration }, filterStr, payload }
					logger.next(['handing request', Object.assign({ headers }, req)])
					handle(Object.assign({ reply }, req))
				}
			})
		]
	}
}
