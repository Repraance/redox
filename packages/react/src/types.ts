import { init, Action, ExtractRematchDispatcherFromReducer, RematchDispatcher } from '@shuvi/redox';

export type Store = ReturnType<typeof init>;

export type State = any;

export type Effect<
	S extends State,
	_R extends Reducers<S>,
	RM extends ModelCollection,
	Payload = any
	> = (
		payload: Action<Payload>['payload'],
		state: S,
		depends: MiniStoreOfModelCollection<RM>,
		meta: Action<Payload>['meta']
	) => any;

export type Effects<S, R extends Reducers<S>, RM extends ModelCollection> = {
	[x: string]: Effect<S, R, RM>;
};

export type Reducer<S extends State, Payload = any> = (
	state: S,
	payload: Payload
) => S;

export type Reducers<S> = {
	[x: string]: Reducer<S>;
};

export type View<S extends State, RM extends ModelCollection> = (
	state: S,
	rootState: StateOfModelCollection<RM>,
	args: any
) => any;

export type Views<S extends State, RM extends ModelCollection> = {
	[key: string]: View<S, RM>;
};

/**
 * @template S State
 * @template RM RootModel
 */
export type Model<
	S,
	DM extends ModelCollection,
	R extends Reducers<S>,
	E extends Effects<S, R, DM>,
	V extends Views<S, DM>
	> = {
		name: string;
		state: S;
		reducers?: R;
		effects?: E & ThisType<DispatchOfModelByProps<S, R, E>>
		views?: V & ThisType<ViewsKey<V>>;
		subscribe?: (payload: Action) => any
	};

export type InternalModel<
	S,
	DM extends ModelCollection,
	R extends Reducers<S>,
	E extends Effects<S, R, DM>,
	V extends Views<S, DM>
	> = Model<S, DM, R, E, V> & {
		_rootModels: DM;
		_beDepends: Set<string>;
	};

export type ModelCollection = Record<
	string,
	InternalModel<any, any, any, any, any>
>;

export type StateCollection = Record<string, State>;

export type MiniStoreOfModelCollection<MC extends ModelCollection> = {
	getState: () => StateOfModelCollection<MC>
	dispatch: DispatchOfModelCollection<MC>
}

export type StateOfModelCollection<MC extends ModelCollection> = {
	[K in keyof MC]: MC[K]['state'];
}

export type DispatchOfModelCollection<MC extends ModelCollection> = {
	[K in keyof MC]: DispatchOfModel<MC[K]>;
}


/**
 * Get the type of Dispatch
 */
export type DispatchOfModel<M extends InternalModel<any, any, any, any, any>> = M extends InternalModel<infer S, infer _DM, infer R, infer E, infer _V> ?
	DispatchOfModelByProps<S, R, E> : never


export type DispatchOfModelByProps<S, R, E> = DispatcherOfReducers<S, R> & DispatcherOfEffects<E>

type ViewsKey<V> = V extends {[X: string]: (...args: any[])=> any} ? {[K in keyof V]: ReturnType<V[K]>} : {}

/**
* Matches an effect to different forms and based on the form, selects an
* appropriate type for a dispatcher. Mapping goes like this:
* - effect not taking any parameters -> 'empty' dispatcher
* - effect only taking payload -> dispatcher accepting payload as an argument
* - effect taking both payload and root state -> dispatcher accepting payload
*   as an argument
* - effect taking payload, state, miniStoreOfDe and meta -> dispatcher accepting payload
*   and meta as arguments
*/
export type ExtractRematchDispatcherFromEffect<
	TEffect extends Effect<any, any, any>
	> = TEffect extends (...args: infer TRest) => infer TReturn
	? TRest extends []
	? RematchDispatcher<true, never, never, TReturn>
	: TRest[1] extends undefined
	? RematchDispatcher<
		true,
		ExtractParameterFromEffect<TRest, 'payload'>,
		never,
		TReturn
	>
	: TRest[2] extends undefined
	? RematchDispatcher<
		true,
		ExtractParameterFromEffect<TRest, 'payload'>,
		never,
		TReturn
	>
	: RematchDispatcher<
		true,
		ExtractParameterFromEffect<TRest, 'payload'>,
		ExtractParameterFromEffect<TRest, 'meta'>,
		TReturn
	>
	: never


/**
* Utility type used to extract the whole payload/meta parameter type
* from effect parameters
* For example, extract `[meta?: string]`
* from `[payload: number, state: RootState, meta?: string]`
*/
type ExtractParameterFromEffect<
	P extends unknown[],
	V extends 'payload' | 'meta'
	> = P extends []
	? never
	: P extends [p?: infer TPayload, s?: unknown, r?: unknown]
	? V extends 'payload'
	? P extends [infer TPayloadMayUndefined, ...unknown[]]
	? [p: TPayloadMayUndefined]
	: [p?: TPayload]
	: never
	: P extends [
		p?: infer TPayload,
		s?: unknown,
		r?: unknown,
		m?: infer TMeta,
		...args: unknown[]
	]
	? V extends 'payload'
	? P extends [infer TPayloadMayUndefined, ...unknown[]]
	? [p: TPayloadMayUndefined]
	: [p?: TPayload]
	: P extends [unknown, unknown, unknown, infer TMetaMayUndefined, ...unknown[]]
	? [m: TMetaMayUndefined]
	: [m?: TMeta]
	: never


export type DispatcherOfEffects<E> = E extends undefined ? 'undefined' :
	E extends Effects<any, any, any> ? {
		[K in keyof E]: ExtractRematchDispatcherFromEffect<E[K]>
		// [K in keyof E]: 11
	} : {}

export type DispatcherOfReducers<S, R> = R extends undefined ?
	{}
	: (R extends Reducers<S>
	? {
		[K in keyof R]: ExtractRematchDispatcherFromReducer<S, R[K]>;
	}
	: {});


export interface IUseModel {
	<S, RM extends ModelCollection, R extends Reducers<S>, E extends Effects<S, R, RM>, V extends Views<S, RM>>(
		model: InternalModel<S, RM, R, E, V>
	): [S, DispatchOfModelByProps<S, R, E>];

	<S, RM extends ModelCollection, R extends Reducers<S>, E extends Effects<S, R, RM>, V extends Views<S, RM>>(
		model: InternalModel<S, RM, R, E, V>,
		selectors: any
	): [any, DispatchOfModelByProps<S, R, E>];
}
