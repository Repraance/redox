import {
	Models,
	NamedModel,
	RematchBag,
	RematchStore,
} from './types'
import validate from './validate'


export const createSubscribes = <
	TModels extends Models<TModels>,
	TExtraModels extends Models<TModels>,
	TModel extends NamedModel<TModels>
	>(
	_rematch: RematchStore<TModels, TExtraModels>,
	bag: RematchBag<TModels, TExtraModels>,
	model: TModel
): void => {

	if (model.subscribe) {
		validate(() => [
			[
				typeof model.subscribe !== 'function',
				`model.subscribe should be function, now is ${typeof model.subscribe}`
			],
		])
		bag.subscribes[`${model.name}`] = model.subscribe
	}
}
