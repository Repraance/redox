/**
 * @jest-environment jsdom
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { useModel, Provider, defineModel } from '../src';

const stepModel = defineModel({
	name: 'stepModel',
  state: {
    step: 1
  },
	reducers: {
    addStep(state, payload: number) {
      return {
        ...state,
        step: state.step + payload
      };
    },
  },
	effects: {
		addStepByEffect(payload: number) {
			this.addStep(payload)
		}
	}
});

const countModel = defineModel({
	name: 'countModel',
  state: {
    value: 1,
    value1: 1
  },
	reducers: {
    addValue(state) {
      return {
        ...state,
        value: state.value + 1
      };
    },
    addValue1(state) {
      return {
        ...state,
        value1: state.value1 + 1
      };
    },
		addValueByParam(state, payload: number){
			return {
				...state,
				value: state.value + payload
			}
		}
  },
	effects: {
		addValueByEffect() {
			this.addValue()
		},
		addValueByDepends(_payload: void, _state, depends) {
			const { dispatch: { stepModel }, getState } = depends
			stepModel.addStepByEffect(1)
			this.addValueByParam(getState().stepModel.step)
		}
	}
}, { stepModel });

describe('test useModel', () => {
  let node: HTMLDivElement;
  beforeEach(() => {
    node = document.createElement('div');
    document.body.appendChild(node);
  });

  afterEach(() => {
    document.body.removeChild(node);
    (node as unknown as null) = null;
  });

  test('effect should work', () => {
    function App() {
      const [{ value }, { addValueByEffect }] = useModel(countModel);
      return (
        <div>
          <div id="addValue">value:{value}</div>
          <div id="button" onClick={() => addValueByEffect()}>
            addValue
          </div>
        </div>
      );
    }

    act(() => {
      ReactDOM.render(
        <Provider>
          <App />
        </Provider>,
        node
      );
    });
		expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:1');
    act(() => {
      node
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:2');
  });

	test('depends should work in effects', () => {
    function App() {
      const [{ value }, { addValueByDepends }] = useModel(countModel);
      return (
        <div>
          <div id="addValue">value:{value}</div>
          <div id="button" onClick={() => addValueByDepends()}>
            addValue
          </div>
        </div>
      );
    }

    act(() => {
      ReactDOM.render(
        <Provider>
          <App />
        </Provider>,
        node
      );
    });
		expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:1');
    act(() => {
      node
        .querySelector('#button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(node.querySelector('#addValue')?.innerHTML).toEqual('value:3');
  });
});
