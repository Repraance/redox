import validate from './validate';
import { isObject } from './utils';
import { Effects, InternalModel, Model, ModelCollection, Reducers, Views } from './types'

export const defineModel = <
	S,
	R extends Reducers<S>,
	E extends Effects<S, R, DM>,
	DM extends ModelCollection,
	V extends Views<S, DM>
>(
	modelOptions: Model<S, DM, R, E, V>,
	depends?: DM
) => {
	validate(() => [
		[
			!isObject(modelOptions.state),
			'defineModel param model property state should be object'
		],
	])
	// collection _beDepends, a depends b, when b update, call a need update
	if (depends) {
		let dependModels = [];
		if (Array.isArray(depends)) {
			dependModels = depends;
		} else {
			dependModels = Object.values(depends);
		}
		const modelName = modelOptions.name;
		dependModels.forEach(dependModel => {
			if (!dependModel._beDepends) {
				dependModel._beDepends = new Set([modelName]);
			} else {
				dependModel._beDepends.add(modelName);
			}
		});
	}
	const finalModel = {
		...modelOptions,
		_rootModels: depends
	} as InternalModel<S, DM, R, E, V>;
	if (!finalModel._beDepends) {
		finalModel._beDepends = new Set();
	}
	return finalModel;
};


