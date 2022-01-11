// import { init } from '../src'
import { init } from '@shuvi/redox';
import { defineModel } from '../src'

describe('views:', () => {
	test('computed when depends changed', () => {
		let firstComputeTimes = 0;
		const first = defineModel({
			name: 'first',
			state: {
				first_Object:{
					first_a:{
						arr: [1,2,3]
					},
					first_b:{
						number: 1
					}
				}
			},
			reducers: {
				changedB: (state) => {
					return {
						first_Object:{
							first_a: state.first_Object.first_a,
							first_b:{
								number: 2
							}
						}
					};
				},
			},
			views:{
				first_view(state){
					firstComputeTimes++;
					return state.first_Object.first_a.arr[0];
				}
			}
		});
		let secondComputeTimes = 0;
		const second = defineModel({
			name: 'second',
			state: {
				second_Object:{
					second_a:{
						arr: [1,2,3]
					},
					second_b:{
						number: 1
					}
				}
			},
			reducers: {
				changedB: (state) => {
					return {
						second_Object:{
							second_a:state.second_Object.second_a,
							second_b:{
								number: 2
							}
						}
					}
				},
			},
			views:{
				second_view(state, dependsState){
					secondComputeTimes++;
					return dependsState.first.first_Object.first_a.arr[0] + state.second_Object.second_b.number;
				},
				// other: (state, dependsState)=>{
				// }
			}
		}, { first });
		const store = init();
		//@ts-ignore
		store.addModel(first);
		//@ts-ignore
		store.addModel(second);

		let viewsValue;

		expect(firstComputeTimes).toBe(0);
		expect(secondComputeTimes).toBe(0);

		viewsValue = store.views.second.second_view();
		store.views.first.first_view();
		expect(secondComputeTimes).toBe(1);
		expect(firstComputeTimes).toBe(1);
		expect(viewsValue).toBe(2);

		viewsValue = store.views.second.second_view();
		store.views.first.first_view();
		expect(secondComputeTimes).toBe(1);
		expect(firstComputeTimes).toBe(1);
		expect(viewsValue).toBe(2);

		store.dispatch.first.changedB();

		viewsValue = store.views.second.second_view();
		store.views.first.first_view();
		expect(secondComputeTimes).toBe(1);
		expect(firstComputeTimes).toBe(1);
		expect(viewsValue).toBe(2)

		store.dispatch.second.changedB();

		viewsValue = store.views.second.second_view();

		expect(secondComputeTimes).toBe(2);
		expect(viewsValue).toBe(3)

	})
	test('computed when args changed', () => {
		let firstComputeTimes = 0;
		const first = defineModel({
			name: 'first',
			state: {
				first_Object: {
					a:{
						b:{
							c:'c'
						}
					}
				},
			},
			reducers: {
				changedB: (state) => {
					state.first_Object.a.b = {
						c:'c'
					}
					return state;
				},
				changedC: (state) => {
					state.first_Object.a.b.c = 'd'
					return state;
				}
			},
			views:{
				first_c_view: (state, _dependsState, args)=>{
					firstComputeTimes++;
					return state.first_Object.a.b.c + args
				}
			}
		});
		const store = init();
		let viewsValue;
		//@ts-ignore
		store.addModel(first);

		expect(firstComputeTimes).toBe(0);
		viewsValue = store.views.first.first_c_view('z');
		expect(firstComputeTimes).toBe(1);
		expect(viewsValue).toBe('cz');

		viewsValue = store.views.first.first_c_view('v');
		expect(firstComputeTimes).toBe(2);
		expect(viewsValue).toBe('cv');

		store.dispatch.first.changedC();
		viewsValue = store.views.first.first_c_view('z');
		expect(firstComputeTimes).toBe(3);
		expect(viewsValue).toBe('dz');
	})
	test('works with views self', () => {
		let firstComputeTimes = 0;
		const first = defineModel({
			name: 'first',
			state: {
				first_a:{
					arr: [1,2,3]
				},
				first_b:{
					number: 1
				}
			},
			reducers: {
				changedNumber: (state) => {
					return {
						...state,
						first_b:{
							number: 2
						}
					};
				}
			},
			views:{
				first_a_view (state){
					return state.first_a.arr[0]
				},
				first_b_view (state){
					return state.first_b.number
				},
				first_c_view (){
					return this.first_b_view * 2
				},
				//@ts-ignore
				first_view (){
					firstComputeTimes+=1
					//@ts-ignore
					return this.first_a_view + this.first_c_view
				}
			}
		});

		const store = init();
		let viewsValue;
		//@ts-ignore
		store.addModel(first);

		expect(firstComputeTimes).toBe(0);

		viewsValue = store.views.first.first_view();
		expect(viewsValue).toBe(3);
		expect(firstComputeTimes).toBe(1);

		viewsValue = store.views.first.first_view();
		expect(viewsValue).toBe(3);
		expect(firstComputeTimes).toBe(1);

		store.dispatch.first.changedNumber();

		viewsValue = store.views.first.first_view();
		expect(viewsValue).toBe(5);
		expect(firstComputeTimes).toBe(2);

	})
	test('works with immer', () => {
		let firstComputeTimes = 0;
		const first = defineModel({
			name: 'first',
			state: {
				first_Object: {
					a:{
						b:{
							c:'c'
						}
					}
				},
			},
			reducers: {
				changedB: (state) => {
					state.first_Object.a.b = {
						c:'c'
					}
					return state;
				},
				changedC: (state) => {
					state.first_Object.a.b.c = 'd'
					return state;
				}
			},
			views:{
				first_c_view(state){
					firstComputeTimes++;
					return state.first_Object.a.b.c
				}
			}
		});
		const store = init();
		let viewsValue;
		//@ts-ignore
		store.addModel(first);

		expect(firstComputeTimes).toBe(0);
		viewsValue = store.views.first.first_c_view();
		expect(firstComputeTimes).toBe(1);
		expect(viewsValue).toBe('c');

		store.dispatch.first.changedB();
		viewsValue = store.views.first.first_c_view();
		expect(firstComputeTimes).toBe(1);
		expect(viewsValue).toBe('c');

		store.dispatch.first.changedC();
		viewsValue = store.views.first.first_c_view();
		expect(firstComputeTimes).toBe(2);
		expect(viewsValue).toBe('d');
	})
})
