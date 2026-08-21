import type { ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import {
  Controller,
  useForm,
  type ControllerFieldState,
  type ControllerRenderProps,
  type DefaultValues,
  type FieldValues,
  type Path,
  type RegisterOptions,
  type UseFormReturn,
} from "react-hook-form";

import { Form } from "@/components/form";

/** Concrete RHF API shape exposed back to tests from the mounted harness. */
type RHFFormApi<TFieldValues extends FieldValues> = UseFormReturn<TFieldValues, any, TFieldValues>;

/** Values passed to the field render callback so tests can inspect both field and form state. */
type RenderControlArgs<TFieldValues extends FieldValues, TName extends Path<TFieldValues>> = {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: ControllerFieldState;
  form: RHFFormApi<TFieldValues>;
};

/** Options for mounting a minimal react-hook-form around a single controlled field. */
type RenderRHFFormOptions<TFieldValues extends FieldValues, TName extends Path<TFieldValues>> = {
  defaultValues: DefaultValues<TFieldValues>;
  name: TName;
  mode?: "onSubmit" | "onBlur" | "onChange" | "onTouched" | "all";
  rules?: RegisterOptions<TFieldValues, TName>;
  onSubmit?: (values: TFieldValues) => void;
  render: (args: RenderControlArgs<TFieldValues, TName>) => ReactNode;
  renderOptions?: Omit<RenderOptions, "wrapper">;
};

/** RTL render result plus access to the live `useForm()` instance created by the test harness. */
type RenderRHFFormResult<TFieldValues extends FieldValues> = RenderResult & {
  form: () => RHFFormApi<TFieldValues>;
};

/**
 * Renders a real `react-hook-form` + `Form` shell around one controlled field.
 *
 * Tests use this to verify the full RHF lifecycle for a component — default values,
 * validation, submit handling, and reset behaviour — without repeating the same
 * setup in every test file.
 */
export function renderRHFForm<TFieldValues extends FieldValues, TName extends Path<TFieldValues>>({
  defaultValues,
  name,
  mode,
  rules,
  onSubmit,
  render: renderControl,
  renderOptions,
}: RenderRHFFormOptions<TFieldValues, TName>): RenderRHFFormResult<TFieldValues> {
  let formApi!: RHFFormApi<TFieldValues>;

  /** Owns `useForm()` and exposes common submit/reset controls for interaction tests. */
  function Harness() {
    const form = useForm<TFieldValues>({ defaultValues, mode });
    formApi = form;

    return (
      <Form onSubmit={form.handleSubmit((values) => onSubmit?.(values))}>
        <Controller
          name={name}
          control={form.control}
          rules={rules}
          render={({ field, fieldState }) => <>{renderControl({ field, fieldState, form })}</>}
        />
        <button type="submit">Submit</button>
        <button type="button" onClick={() => form.reset()}>
          Reset
        </button>
      </Form>
    );
  }

  const result = render(<Harness />, renderOptions);

  return {
    ...result,
    form: () => formApi,
  };
}
