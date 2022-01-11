import { init, Models } from '../src'

describe('immer', () => {
	test('should load the immer plugin with a basic literal', () => {
		const count = {
			state: 0,
			reducers: {
				add(state: number): number {
					state += 1
					return state
				},
			},
		}

		const store = init({
			models: { count },
		})

		store.dispatch({ type: 'count/add' })

		expect(store.getState()).toEqual({
			count: 1,
		})
	})

	test('should load the immer plugin with a nullable basic literal', () => {
		const model = {
			state: null as number | null,
			reducers: {
				set(_state: number, payload: number): number {
					return payload
				},
			},
		}

		const store = init({
			models: { model },
		})

		store.dispatch({ type: 'model/set', payload: 1 })

		expect(store.getState()).toEqual({
			model: 1,
		})
	})

	test('should load the immer plugin with a object condition', () => {
		const todo = {
			state: [
				{
					todo: 'Learn typescript',
					done: true,
				},
				{
					todo: 'Try immer',
					done: false,
				},
			],
			reducers: {
				done(state: any): any {
					state.push({ todo: 'Tweet about it' })
					state[1].done = true
					return state
				},
			},
		}

		interface RootModel extends Models<RootModel> {
			todo: typeof todo
		}

		const store = init<RootModel>({
			models: { todo },
		})
		store.dispatch({ type: 'todo/done' })
		const newState = store.getState().todo

		expect(todo.state.length).toBe(2)
		expect(newState).toHaveLength(3)

		expect(todo.state[1].done).toBe(false)
		expect(newState[1].done).toEqual(true)
	})

})
