import { createSelector } from './createSelector';
import { Models, NamedModel, RematchBag, RematchStore } from '../types'
import validate, { isObject } from '../validate'

const objectToString = Object.prototype.toString;

function isComplexObject(obj: any): boolean {
	return objectToString.call(obj) === '[object Object]' || Array.isArray(obj);
}

interface ICompare {
  tree: Map<
    Record<string, any>,
    {
      children: Record<string, any>;
    }
  >;
}

interface IViewsCompare {
  new: Map<string, any>;
}

let isCollectionKeys = false;

let viewsStatePos: IViewsCompare;
const getProxyHandler = () => {
  const handler = {
    get: function (
      target: Record<string, (...args: any[]) => any>,
      prop: string
    ) {
      let result = target[prop];
      if (typeof result === 'function') {
        result = result();
      }
      if (isCollectionKeys) {
        if (!viewsStatePos.new.has(prop)) {
          viewsStatePos.new.set(prop, result);
        }
      }
      return result;
    }
  };
  return handler;
};
let compareStatePos: ICompare;
const getStateCollection = () => {
  return {
    get(target: any, p: string): any {
      let result = target[p];
      if (isCollectionKeys) {
        const compareTree = compareStatePos.tree;
        if (compareTree.has(target)) {
          const treeNode = compareTree.get(target);
          treeNode && (treeNode!.children[p] = result);
        } else {
          compareTree.set(target, {
            children: {
              [p]: result
            }
          });
        }
      }
      if (isComplexObject(result)) {
        result = createProxyObj(result, getStateCollection);
      }
      return result;
    }
  };
};

let compareRootStatePos: ICompare;
const getRootStateCollection = () => {
  return {
    get(target: any, p: string): any {
      let result = target[p];
      if (isCollectionKeys) {
        const compareTree = compareRootStatePos.tree;
        if (compareTree.has(target)) {
          const treeNode = compareTree.get(target);
          treeNode && (treeNode!.children[p] = result);
        } else {
          compareTree.set(target, {
            children: {
              [p]: result
            }
          });
        }
      }
      if (isComplexObject(result)) {
        result = createProxyObj(result, getRootStateCollection);
      }
      return result;
    }
  };
};

const proxyObjMap = new WeakMap<Record<string, any>, typeof Proxy>();
function createProxyObj(
  target: Record<string, any>,
  collection: typeof getStateCollection
) {
  if (proxyObjMap.has(target)) {
    return proxyObjMap.get(target);
  }
  const proxy = new Proxy(target, collection());
  proxyObjMap.set(target, proxy);
  return proxy;
}

const proxyViewsMap = new Map<
  Record<string, (args: any) => any>,
  typeof Proxy
>();
function createProxyViews(proxyObj: Record<string, (args: any) => any>) {
  if (proxyViewsMap.has(proxyObj)) {
    return proxyViewsMap.get(proxyObj);
  }
  const proxy = new Proxy<any>(proxyObj, getProxyHandler());
  proxyViewsMap.set(proxyObj, proxy);
  return proxy;
}

function compareObject(obj: any, compareObj: any, tree: ICompare['tree']) {
  if (!isComplexObject(obj)) {
    return obj === compareObj;
  } else if (obj === compareObj) {
    // Object address has not changed, children are same
    return true;
  }
  if (!tree.has(obj)) {
    return true;
  }
  const treeNode = tree.get(obj);
  const children = treeNode!.children;
  const keys = Object.keys(children);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const childrenObj = children[key];
    if (!compareObject(childrenObj, compareObj[key], tree)) {
      return false;
    }
  }
  return true;
}

// return false => need recomputed, true => use last cache
function compareArguments(next: any, compare: ICompare) {
  const tree = compare.tree;
  const root = [...tree.keys()][0]; // app get root object first so tree root is the Map first
  if (!root) {
    // use nothings
    return true;
  }
  return compareObject(root, next, tree);
}

function cacheFactory(
  fn: (...args: any[]) => any,
  proxyObj: Record<string, (args: any) => any>
) {
  const stateCompare = {
    tree: new Map()
  };

  const rootStateCompare = {
    tree: new Map()
  };

  const viewsCompare = {
    new: new Map<string, any>(),
    viewsProxy: new Proxy({}, {})
  };

  return createSelector(
    (state, rootState, otherArgs) => {
      // reset compare
      stateCompare.tree.clear();
      rootStateCompare.tree.clear();
      viewsCompare.new.clear();

      compareStatePos = stateCompare;
      const tempState = createProxyObj(state, getStateCollection);

      compareRootStatePos = rootStateCompare;
      const tempRootStateProxy = createProxyObj(
        rootState,
        getRootStateCollection
      );

      let tempOtherArgs = otherArgs;

      viewsStatePos = viewsCompare;
      viewsCompare.viewsProxy = createProxyViews(proxyObj);
      const tempViewsProxy = viewsCompare.viewsProxy;
      isCollectionKeys = true; // just keep collection keys when fn call
      const res = fn.call(
        tempViewsProxy,
        tempState,
        tempRootStateProxy,
        tempViewsProxy,
        tempOtherArgs
      );
      isCollectionKeys = false;
      // console.log(
      //   'modelName=>',
      //   modelName,
      //   stateCompare,
      //   rootStateCompare,
      //   viewsCompare
      // );
      return res;
    },
    {
      equalityCheck: (prev: any, next: any, argsIndex: number) => {
        let res = true;
        if (argsIndex === 0) {
          // stateCompare
          res = compareArguments(next, stateCompare);
        } else if (argsIndex === 1) {
          // rootStateCompare
          res = compareArguments(next, rootStateCompare);
        } else if (argsIndex === 2) {
          // otherArgsCompare
          if (prev !== next) {
            res = false;
          }
          if (res) {
            // viewsCompare
            const proxyKeysMap = viewsCompare.new;
            const viewsProxy = viewsCompare.viewsProxy as Record<string, any>;
            for (const [key, value] of proxyKeysMap.entries()) {
              if (value !== viewsProxy[key]) {
                res = false;
                break;
              }
            }
          }
        }
        return res;
      }
    }
  );
}

export const createViews = <
	TModels extends Models<TModels>,
	TExtraModels extends Models<TModels>,
	TModel extends NamedModel<TModels>
	>(
	rematch: RematchStore<TModels, TExtraModels>,
	_bag: RematchBag<TModels, TExtraModels>,
	model: TModel
): void => {

	const views = model.views;
	if (views) {
		validate(() => [
			[
				!isObject(views),
				`model.views should be object, now is ${typeof views}`
			],
		])
		const name = model.name;
		// @ts-ignore
		const dependenciesModels = model._rootModels || []
		const dependencies = Object.values(dependenciesModels).map(
			m => (m as { name: string }).name
		);
		const proxyObj: Record<string, (args: any) => any> = {};
		Object.keys(views || {}).forEach((selectorName: string) => {
			const cacheFun = cacheFactory(views[selectorName], proxyObj);
			proxyObj[selectorName] = function (args: any) {
				const State = rematch.getState();
				const state = State[name];
				const rootState: Record<string, any> = {};
				// generate rootState by dependencies
				dependencies.forEach(function (dep: string) {
					rootState[dep] = State[dep];
				});
				return cacheFun(state, rootState, args);
			};
		});
		rematch.views[name] = proxyObj
	}
}