import { createModel, Models } from '../../src'

describe('circular references', () => {
	it("shouldn't throw error accessing rootState in effects with a return value", () => {
		type ComplexTypeIds = {
			[key: string]: boolean
		}
		type ComplexType = {
			ids: ComplexTypeIds
		}
		const model = createModel<RootModel>()({
			state: {
				ids: {},
			} as ComplexType,
			effects: () => ({
				async a(
					payload: { name: string },
					rootState
					// the key is defining the Promise<boolean>
				): Promise<boolean> {
					const { myModel } = rootState
					const id = myModel.ids[payload.name]
					return id
				},
			}),
		})
		const otherModel = createModel<RootModel>()({
			state: {
				ids: {},
			} as ComplexType,
			effects: () => ({
				async b(payload: { name: string }, rootState) {
					const { otherModel } = rootState
					const id = otherModel.ids[payload.name]
					return id
				},
			}),
		})

		interface RootModel extends Models<RootModel> {
			myModel: typeof model
			otherModel: typeof otherModel
		}
	})
})
