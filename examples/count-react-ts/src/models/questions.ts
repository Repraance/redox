import { createModel } from '@shuvi/redox-core'
import type { RootModel } from '.'

type QuestionType = 'boolean' | 'multiple' | 'mixed'
type QuestionsState = {
	questions: number[]
	amount: number
	type: QuestionType
}

const questions = createModel<RootModel>()({
	state: {
		questions: [],
		amount: 2,
		type: 'boolean',
	} as QuestionsState,
	reducers: {
		setQuestions(state, payload: Array<number>) {
			return { ...state, questions: payload }
		},
	},
	effects: (dispatch) => ({
		async loadQuestions({ categoryId }: { categoryId: string }) {
			dispatch.setQuestions([1, 2])
		},
		async otherLoadQuestion() {
			dispatch.loadQuestions({ categoryId: '1' })
		},
	}),
})

export default questions
