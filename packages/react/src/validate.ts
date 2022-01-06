/**
 * If the first item is true, it means there is an error described by
 * the second item.
 */
export type Validation = [boolean | undefined, string]

const validate = (runValidations: () => Validation[]): void => {
	if (process.env.NODE_ENV !== 'production') {
		const validations = runValidations()
		const errors: string[] = []

		validations.forEach((validation) => {
			const isInvalid = validation[0]
			const errorMessage = validation[1]
			if (isInvalid) {
				errors.push(errorMessage)
			}
		})

		if (errors.length > 0) {
			throw new Error(errors.join(', '))
		}
	}
}

export default validate
