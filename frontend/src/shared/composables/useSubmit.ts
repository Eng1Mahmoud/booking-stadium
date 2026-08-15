import { ref } from 'vue'
import type { ZodType, ZodTypeDef } from 'zod'
import { getErrorMessage } from '@/shared/api/client'

export function useSubmit<Out, In = Out>(schema?: ZodType<Out, ZodTypeDef, In>) {
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)
  /** Per-field messages from the schema, keyed by field name. */
  const fieldErrors = ref<Record<string, string>>({})


  function fail(message: string): false {
    error.value = message
    return false
  }


  async function submit(values: In, action: (input: Out) => Promise<unknown>): Promise<boolean> {
    error.value = null
    fieldErrors.value = {}

    let input = values as unknown as Out

    if (schema) {
      const result = schema.safeParse(values)
      if (!result.success) {
        const flat = result.error.flatten()
        const byField = flat.fieldErrors as Record<string, string[] | undefined>
        fieldErrors.value = Object.fromEntries(
          Object.entries(byField)
            .filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length))
            .map(([field, messages]) => [field, messages[0]!]),
        )
        // Whole-object refinements land in formErrors rather than on a field.
        error.value = flat.formErrors[0] ?? Object.values(fieldErrors.value)[0] ?? null
        return false
      }
      input = result.data
    }

    isSubmitting.value = true
    try {
      await action(input)
      return true
    } catch (err) {
      error.value = getErrorMessage(err)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  function reset(): void {
    error.value = null
    fieldErrors.value = {}
  }

  return { isSubmitting, error, fieldErrors, submit, fail, reset }
}
