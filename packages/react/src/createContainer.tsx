import React, {
  createContext,
  useContext,
  PropsWithChildren,
  useEffect,
  useState,
  useMemo,
  useRef
} from 'react';
import { init, Plugin, NamedModel } from '@shuvi/redox';
import validate from './validate';
import { createBatchManager } from './batchManager';
import { shadowEqual } from './utils';
import { InternalModel, IUseModel, Store, selectorFn, ModelCollection, Reducers, Effects, Views, DispatchOfModelByProps } from './types';

type initConfig = Parameters<typeof init>[0];

type Config = initConfig & {
  plugins?: ((...args: any[]) => Plugin<any, any>) | Plugin<any, any>;
};

function initModel<S, RM extends ModelCollection, R extends Reducers<S>, E extends Effects<S, R, RM>, V extends Views<S, RM>>(
  model: InternalModel<S, RM, R, E, V>,
  store: Store,
  batchManager: ReturnType<typeof createBatchManager>,
) {
  const name = model.name || '';
  if (!batchManager.hasInitModel(name)) {
    const rootModels = model._rootModels;
    if (rootModels) {
      Object.values(rootModels).forEach(model => {
        initModel(model, store, batchManager);
      });
    }
    model.subscribe = function(){
			batchManager.triggerSubsribe(name); // render self;
			const _beDepends = [...(model._beDepends || [])];
			_beDepends.forEach(beDepend => {
				batchManager.triggerSubsribe(beDepend); // render deDepend;
			});
		};
    store.addModel(model as NamedModel<any>);
    batchManager.addSubsribe(name);
  }
}
function getStateOrViews<S, RM extends ModelCollection, R extends Reducers<S>, E extends Effects<S, R, RM>, V extends Views<S, RM>, Selector extends selectorFn<S, RM, V>>(
	model: InternalModel<S, RM, R, E, V>,
	store: Store,
	selector?: Selector
) {
  const name = model.name;
	const modelState = store.getState()[name];
	if (!selector) {
		return modelState as S;
	}
	const ModelViews = store.views[name] || {};
  // @ts-ignore
	return selector(modelState, ModelViews) as unknown as ReturnType<Selector>;
}

function tuplify<T extends any[]>(...elements: T){
  return elements;
}

function getStateDispatch<S, RM extends ModelCollection, R extends Reducers<S>, E extends Effects<S, R, RM>, V extends Views<S, RM>, Selector extends selectorFn<S, RM, V>>(
  model: InternalModel<S, RM, R, E, V>,
  store: Store,
  selector?: Selector
) {
  const dispatch = store.dispatch;
  const name = model.name;
  return tuplify(
    getStateOrViews(model, store, selector),
    dispatch[name] as DispatchOfModelByProps<S, R, E>
  );
}

const createContainer = (config: Config) => {
  let configFromProvider: Config | null = null;

  const Context = createContext<{
    store: Store;
    batchManager: ReturnType<typeof createBatchManager>;
  }>(null as any);

  function getFinalConfig() {
    const finalConfig = { ...(config || {}), ...configFromProvider };
    finalConfig.plugins = [
      ...(finalConfig.plugins || [])
    ].map(plugin => {
      if (typeof plugin === 'function') {
        return (plugin as Function)();
      }
      return plugin;
    });
    return finalConfig;
  }

  const Provider = (
    props: PropsWithChildren<{ store?: Store; config?: Config }>
  ) => {
    const { children, store: storeFromProps, config: _config = {} } = props;
    configFromProvider = _config;

    let store: Store;
    if (storeFromProps) {
      store = storeFromProps;
    } else {
      store = init(getFinalConfig());
    }
    const batchManager = createBatchManager();

    return (
      <Context.Provider value={{ store, batchManager }}>
        {children}
      </Context.Provider>
    );
  };

  const createUseModel =
    (
      store: Store,
      batchManager: ReturnType<typeof createBatchManager>,
    ) =>
    <S, RM extends ModelCollection, R extends Reducers<S>, E extends Effects<S, R, RM>, V extends Views<S, RM>, Selector extends selectorFn<S, RM, V>>(model: InternalModel<S, RM, R, E, V>, selector?: Selector) => {
			validate(() => [
				[
					!Boolean(model.name),
					`createUseModel param model.name is necessary for Model.`
				],
			])
      const name = model.name || '';
      const initialValue = useMemo(() => {
        initModel(model, store, batchManager);
        return getStateDispatch(model, store, selector);
      }, [model, selector]);

      const [modelValue, setModelValue] = useState(initialValue);

      const lastValueRef = useRef<any>(initialValue);

      useEffect(() => {
        const fn = () => {
          const newValue = getStateDispatch(
            model,
            store,
            selector
          );
          if (!shadowEqual(lastValueRef.current[0], newValue[0])) {
            setModelValue(newValue as any);
            lastValueRef.current = newValue;
          }
        };
        const unsubsribe = batchManager.addSubsribe(name, fn);

        return () => {
          unsubsribe();
        };
      }, []);

      return modelValue;
    };

  const useModel: IUseModel = <S, RM extends ModelCollection, R extends Reducers<S>, E extends Effects<S, R, RM>, V extends Views<S, RM>, Selector extends selectorFn<S, RM, V>>(model: InternalModel<S, RM, R, E, V>, selector?: Selector) => {

    const context = useContext(Context);

		validate(() => [
			[
				!Boolean(model), `useModel param model is necessary`
			],
			[
				!Boolean(context),
				`You should wrap your Component in CreateApp().Provider.`
			],
		])

    const { store, batchManager } = context;

    return useMemo(
      () => createUseModel(store, batchManager),
      [store, batchManager]
    )(model, selector);
  };

  const useStaticModel: IUseModel = <S, RM extends ModelCollection, R extends Reducers<S>, E extends Effects<S, R, RM>, V extends Views<S, RM>, Selector extends selectorFn<S, RM, V>>(model: InternalModel<S, RM, R, E, V>, selector?: Selector) => {
    const context = useContext(Context);

		validate(() => [
			[
				!Boolean(context),
				'You should wrap your Component in CreateApp().Provider.'
			],
			[
				!Boolean(model && model.name),
				`useStaticModel param model and model.name is necessary`
			],
		])

    const { store, batchManager } = context;
    const name = model.name || '';
    const initialValue = useMemo(() => {
      initModel(model, store, batchManager);
      return getStateDispatch(model, store, selector);
    }, [model, selector]);

    const value = useRef<[any, any]>([
      // deep clone state in case mutate origin state accidentlly.
      JSON.parse(JSON.stringify(initialValue[0])),
      initialValue[1]
    ]);

    useEffect(() => {
      const fn = () => {
        const newValue = getStateDispatch(model, store, selector);
        if (
          Object.prototype.toString.call(value.current[0]) === '[object Object]'
        ) {
          // merge data to old reference
          Object.assign(value.current[0], newValue[0]);
          Object.assign(value.current[1], newValue[1]);
        }
      };
      const unsubsribe = batchManager.addSubsribe(name, fn);

      return () => {
        unsubsribe();
      };
    }, []);

    return value.current;
  };

  const useLocalModel: IUseModel = <S, RM extends ModelCollection, R extends Reducers<S>, E extends Effects<S, R, RM>, V extends Views<S, RM>, Selector extends selectorFn<S, RM, V>>(model: InternalModel<S, RM, R, E, V>, selector?: Selector) => {
    const [store, batchManager] = useMemo(() => {
      const newStore = init(getFinalConfig());
      return [newStore, createBatchManager()];
    }, []);

    return useMemo(
      () => createUseModel(store, batchManager),
      []
    )(model, selector);
  };

  return {
    Provider,
    useModel,
    useStaticModel,
    useLocalModel
  };
};

export default createContainer;
