import React from 'react'
import { init } from '@shuvi/redox'
import Counter from './Counter'

const count = {
	state: 0,
	reducers: {
		increment(state) {
			return state + 1
		},
	},
}

export const store = init({
	name: 'left',
	models: {
		count,
	},
})

export default class Left extends React.Component {
	render() {
		return <Counter store={store} />
	}
}
