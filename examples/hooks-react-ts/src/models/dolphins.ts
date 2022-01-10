import { createModel } from '@shuvi/redox-core'
import { delay } from './utils'
import type { RootModel } from '.'

export const dolphins = createModel<RootModel>()({
	state: 0,
	reducers: {
		// eslint-disable-next-line @typescript-eslint/no-inferrable-types
		increment: (state, payload: number = 1) => state + payload,
	},
	effects: (_, dispatch) => ({
		async incrementAsync() {
			await delay(500)
			dispatch.dolphins.increment()
		},
	}),
})
