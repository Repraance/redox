import { Middleware } from 'redux'
import {
	Action,
	Config,
	ExposedFunction,
	Models,
	NamedModel,
	ObjectNotAFunction,
	Plugin,
	RematchBag,
	RematchStore,
	ModelDispatcher,
	RematchDispatch,
} from './types'
import createReduxStore, {
	createModelReducer,
	createRootReducer,
} from './reduxStore'
import { createReducerDispatcher, createEffectDispatcher } from './dispatcher'
import { createSubscribes } from './subscribes'
import { createViews } from './views'
import { validateModel } from './validate'
import createRematchBag from './bag'

export default function createRematchStore<
	TModels extends Models<TModels>,
	TExtraModels extends Models<TModels>
>(config: Config<TModels, TExtraModels>): RematchStore<TModels, TExtraModels> {
	let rematchStore: RematchStore<TModels, TExtraModels> = {} as RematchStore<TModels, TExtraModels>
	// setup rematch 'bag' for storing useful values and functions
	const bag = createRematchBag(config)

	// add middleware for handling subscribes
	bag.reduxConfig.middlewares.push(createSubscribesMiddleware(bag))

	// add middleware for handling effects
	bag.reduxConfig.middlewares.push(createEffectsMiddleware(bag, rematchStore))

	// collect middlewares from plugins
	bag.forEachPlugin('createMiddleware', (createMiddleware) => {
		bag.reduxConfig.middlewares.push(createMiddleware(bag))
	})

	const reduxStore = createReduxStore(bag)

	Object.assign(rematchStore, {
		...reduxStore,
		name: config.name,
		addModel(model: NamedModel<TModels>) {
			validateModel(model)
			createModelReducer(bag, model)
			prepareModel(rematchStore, model)
			enhanceModel(rematchStore, bag, model)
			reduxStore.replaceReducer(createRootReducer(bag))
			reduxStore.dispatch({ type: '@@redux/REPLACE' })
		},
		views: {}
	}) as RematchStore<TModels, TExtraModels>

	addExposed(rematchStore, config.plugins)

	/**
	 * generate dispatch[modelName][actionName] for all reducers and effects
	 *
	 * Note: To have circular models accessible in effects method with destructing,
	 *       ensure that model generation and effects generation execute in
	 *       different steps.
	 */
	bag.models.forEach((model) => prepareModel(rematchStore, model))
	bag.models.forEach((model) => enhanceModel(rematchStore, bag, model))

	bag.forEachPlugin('onStoreCreated', (onStoreCreated) => {
		rematchStore = onStoreCreated(rematchStore, bag) || rematchStore
	})

	return rematchStore
}


function createSubscribesMiddleware<
	TModels extends Models<TModels>,
	TExtraModels extends Models<TModels>
	>(bag: RematchBag<TModels, TExtraModels>): Middleware {
	return (_store) =>
		(next) =>
			(action: Action): any => {
				const res = next(action);
				const { type } = action;
				const modelName = type.split('/')[0];
				const subscribe = bag.subscribes[modelName];
				if(typeof subscribe === 'function'){
					subscribe(action)
				}
				return res;
			}
}

function createEffectsMiddleware<
	TModels extends Models<TModels>,
	TExtraModels extends Models<TModels>
>(bag: RematchBag<TModels, TExtraModels>, rematch: RematchStore<TModels, TExtraModels>): Middleware {
	return (store) =>
		(next) =>
		(action: Action): any => {
			if (action.type in bag.effects) {
				// first run reducer action if exists
				next(action)
				const modelName = action.type.split('/')[0]
				// then run the effect and return its result
				return (bag.effects as any)[action.type](
					action.payload,
					store.getState()[modelName], 	// selfState
					rematch,											// rootStore
					action.meta
				)
			}

			return next(action)
		}
}

function prepareModel<
	TModels extends Models<TModels>,
	TExtraModels extends Models<TModels>,
	TModel extends NamedModel<TModels>
>(rematchStore: RematchStore<TModels, TExtraModels>, model: TModel): void {
	const modelDispatcher = {} as ModelDispatcher<TModel, TModels>

	// inject model so effects creator can access it
	rematchStore.dispatch[`${model.name}` as keyof RematchDispatch<TModels>] =
		modelDispatcher

	createReducerDispatcher(rematchStore, model)
}

function enhanceModel<
	TModels extends Models<TModels>,
	TExtraModels extends Models<TModels>,
	TModel extends NamedModel<TModels>
>(
	rematchStore: RematchStore<TModels, TExtraModels>,
	bag: RematchBag<TModels, TExtraModels>,
	model: TModel
): void {
	createSubscribes(rematchStore, bag, model)
	createViews(rematchStore, bag, model)
	createEffectDispatcher(rematchStore, bag, model)

	bag.forEachPlugin('onModel', (onModel) => {
		onModel(model, rematchStore)
	})
}

/**
 * Adds properties exposed by plugins into the Rematch instance. If a exposed
 * property is a function, it passes rematch as the first argument.
 *
 * If you're implementing a plugin in TypeScript, extend Rematch namespace by
 * adding the properties that you exposed from your plugin.
 */
function addExposed<
	TModels extends Models<TModels>,
	TExtraModels extends Models<TModels>
>(
	store: RematchStore<TModels, TExtraModels>,
	plugins: Plugin<TModels, TExtraModels>[]
): void {
	plugins.forEach((plugin) => {
		if (!plugin.exposed) return
		const pluginKeys = Object.keys(plugin.exposed)
		pluginKeys.forEach((key) => {
			if (!plugin.exposed) return
			const exposedItem = plugin.exposed[key] as
				| ExposedFunction<TModels, TExtraModels>
				| ObjectNotAFunction
			const isExposedFunction = typeof exposedItem === 'function'

			store[key] = isExposedFunction
				? (...params: any[]): any =>
						(exposedItem as ExposedFunction<TModels, TExtraModels>)(
							store,
							...params
						)
				: Object.create(plugin.exposed[key])
		})
	})
}
