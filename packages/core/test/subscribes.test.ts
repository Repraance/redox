import { init, Action } from '../src'

describe('subscribes:', () => {
	test('should work', () => {
		let firstCount = 0;
		let resAction;
		const first = {
			name: 'first',
			state: 0,
			reducers: {
				addOne: (state: number) => state + 1
			},
			subscribe() {
				firstCount++;
			}
		};
		let secondCount = 0;
		const second = {
			name: 'second',
			state: 0,
			reducers: {
				addOne: (state: number) => state + 1
			},
			subscribe(action: Action) {
				secondCount++;
				resAction = action;
			}
		};
		const store = init();
		store.addModel(first);
		store.addModel(second);

		store.dispatch.first.addOne();
		expect(firstCount).toBe(1);
		store.dispatch({ type: 'first/addOne' });
		expect(firstCount).toBe(2);
		expect(store.getState().first).toBe(2);
		expect(store.getState().second).toBe(0);

		const secondAction = { type: 'second/addOne', payload: 1 }
		store.dispatch(secondAction);
		expect(secondCount).toBe(1);
		expect(store.getState().second).toBe(1);
		expect(resAction).toBe(secondAction);
	})
})
